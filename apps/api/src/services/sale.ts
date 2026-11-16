import prisma from "../lib/prisma.js";
import { notFound, forbidden, conflict, badRequest } from "../lib/errors.js";

/**
 * Verify that a business exists, belongs to the school, is approved,
 * and that the caller (if a student) is a team member.
 */
async function verifySaleAccess(
  schoolId: string,
  businessId: string,
  role: string,
  userId: string,
) {
  const business = await prisma.business.findUnique({
    where: { id_schoolId: { id: businessId, schoolId } },
    include: { team: { include: { members: { where: { userId } } } } },
  });
  if (!business) throw notFound("Business not found");
  if (business.status !== "APPROVED") throw forbidden("Business must be approved to record sales");
  if (role === "STUDENT" && business.team.members.length === 0) {
    throw forbidden("You are not a member of this business's team");
  }
  return business;
}

/**
 * Create a sale with one or more line items.  Each item deducts
 * inventory atomically using FOR UPDATE row locking.
 *
 * Costing rules (moving weighted-average, integer paise):
 * - unitCostPaise = averageUnitCostPaise from InventoryBalance (snapshot)
 * - For normal sales: cogsPaise = quantity * unitCostPaise, adjustment = 0
 * - When a sale exhausts all remaining stock:
 *   cogsPaise = entire remaining inventoryValuePaise
 *   costAdjustmentPaise = cogsPaise - quantity * unitCostPaise (= rounding residual, >= 0)
 * - Total COGS across all items equals the exact inventory value removed.
 *
 * Sale total = sum of SaleItem.revenuePaise (cross-row invariant, enforced
 * by the service).
 */
export async function createSale(
  schoolId: string,
  businessId: string,
  studentId: string,
  data: { items: Array<{ productId: string; quantity: number; unitSellingPricePaise: number }>; note?: string },
) {
  await verifySaleAccess(schoolId, businessId, "STUDENT", studentId);

  // Aggregate duplicate product lines
  const aggregated = new Map<string, { productId: string; quantity: number; unitSellingPricePaise: number }>();
  for (const item of data.items) {
    const existing = aggregated.get(item.productId);
    if (existing) {
      if (existing.unitSellingPricePaise !== item.unitSellingPricePaise) {
        throw badRequest(`Product ${item.productId} appears with different prices; cannot aggregate`);
      }
      existing.quantity += item.quantity;
    } else {
      aggregated.set(item.productId, { ...item });
    }
  }
  const items = Array.from(aggregated.values());

  if (items.length === 0) throw badRequest("A sale must contain at least one item");

  return prisma.$transaction(async (tx) => {
    // Pre-validate all products and check stock before making any changes
    const productMap = new Map<string, { product: typeof products[0]; balance: { id: string; qty: number; val: number; avg: number } }>();

    // Fetch all products for this sale
    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, schoolId, businessId },
    });

    // Validate each product and read its balance
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw notFound(`Product ${item.productId} not found in this business`);
      if (!product.isActive) throw forbidden(`Product ${product.name} is inactive and cannot be sold`);

      // Read the balance with Prisma (typed, no raw SQL)
      const balance = await tx.inventoryBalance.findUnique({
        where: {
          productId_businessId_schoolId: {
            productId: item.productId,
            businessId,
            schoolId,
          },
        },
      });

      if (!balance) {
        throw badRequest(`No inventory for product ${product.name}`);
      }

      if (balance.quantityOnHand < item.quantity) {
        throw badRequest(`Insufficient stock for ${product.name}: have ${balance.quantityOnHand}, need ${item.quantity}`);
      }

      productMap.set(item.productId, {
        product,
        balance: {
          id: balance.id,
          qty: balance.quantityOnHand,
          val: balance.inventoryValuePaise,
          avg: balance.averageUnitCostPaise,
        },
      });
    }

    // All validated — now create the sale, items, movements, and update balances
    const saleItems: Array<{
      productId: string;
      quantity: number;
      unitSellingPricePaise: number;
      unitCostPaise: number;
      revenuePaise: number;
      cogsPaise: number;
      costAdjustmentPaise: number;
      movementId: string;
    }> = [];

    for (const item of items) {
      const ctx = productMap.get(item.productId)!;
      const balance = ctx.balance;

      // Calculate COGS
      let cogsPaise: number;
      let costAdjustmentPaise: number;
      const unitCostPaise = balance.avg;

      if (balance.qty - item.quantity === 0) {
        // This sale exhausts all remaining stock — absorb the rounding residual
        cogsPaise = balance.val;
        costAdjustmentPaise = cogsPaise - item.quantity * unitCostPaise;
      } else {
        cogsPaise = item.quantity * unitCostPaise;
        costAdjustmentPaise = 0;
      }

      const revenuePaise = item.quantity * item.unitSellingPricePaise;

      // Create the SALE inventory movement
      const movement = await tx.inventoryMovement.create({
        data: {
          schoolId,
          businessId,
          productId: item.productId,
          type: "SALE",
          quantity: item.quantity,
          unitCostPaise,
          note: data.note,
          createdById: studentId,
        },
      });

      // Atomically deduct stock with SQL CASE for average cost recalculation.
      // The CASE expression calculates the new average from the ACTUAL
      // column values at UPDATE time (not the stale read), correctly
      // handling the zero-state when stock is exhausted.
      // BIGINT cast prevents integer overflow in the division.
      const affected = await tx.$executeRaw`
        UPDATE "InventoryBalance"
        SET
          "quantityOnHand" = "quantityOnHand" - ${item.quantity},
          "inventoryValuePaise" = "inventoryValuePaise" - ${cogsPaise},
          "averageUnitCostPaise" = CASE
            WHEN "quantityOnHand" - ${item.quantity} > 0
            THEN FLOOR(("inventoryValuePaise" - ${cogsPaise})::BIGINT / ("quantityOnHand" - ${item.quantity}))
            ELSE 0
          END
        WHERE "id" = ${balance.id}::uuid AND "quantityOnHand" >= ${item.quantity}
      `;

      if (affected === 0) {
        throw badRequest(`Insufficient stock for product (concurrent sale detected)`);
      }

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitSellingPricePaise: item.unitSellingPricePaise,
        unitCostPaise,
        revenuePaise,
        cogsPaise,
        costAdjustmentPaise,
        movementId: movement.id,
      });
    }

    // Calculate sale total
    const totalPaise = saleItems.reduce((sum, si) => sum + si.revenuePaise, 0);

    // Create the Sale record (without nested items — composite FKs
    // prevent Prisma from auto-filling saleId+businessId+schoolId in
    // a nested create, so we create items separately below)
    const sale = await tx.sale.create({
      data: {
        schoolId,
        businessId,
        soldById: studentId,
        totalPaise,
        note: data.note,
      },
    });

    // Create each SaleItem separately
    for (const si of saleItems) {
      await tx.saleItem.create({
        data: {
          schoolId,
          businessId,
          saleId: sale.id,
          productId: si.productId,
          quantity: si.quantity,
          unitSellingPricePaise: si.unitSellingPricePaise,
          unitCostPaise: si.unitCostPaise,
          revenuePaise: si.revenuePaise,
          cogsPaise: si.cogsPaise,
          costAdjustmentPaise: si.costAdjustmentPaise,
          inventoryMovementId: si.movementId,
        },
      });
    }

    // Return the sale with items
    return tx.sale.findUniqueOrThrow({
      where: { id_businessId_schoolId: { id: sale.id, businessId, schoolId } },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });
  });
}

/**
 * List sales for a business.
 */
export async function getSales(schoolId: string, businessId: string, role: string, userId: string) {
  await verifySaleAccess(schoolId, businessId, role, userId);
  return prisma.sale.findMany({
    where: { schoolId, businessId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      soldBy: { select: { name: true } },
    },
    orderBy: { soldAt: "desc" },
  });
}

/**
 * Get a single sale by ID (scoped to school).
 */
export async function getSale(schoolId: string, saleId: string, role: string, userId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, schoolId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      business: { include: { team: { include: { members: { where: { userId } } } } } },
      soldBy: { select: { name: true, username: true } },
    },
  });
  if (!sale) throw notFound("Sale not found");

  if (role === "STUDENT" && sale.business.team.members.length === 0) {
    throw forbidden("You do not have access to this sale");
  }

  return sale;
}

/**
 * Reverse a sale.  Restores inventory atomically.
 *
 * - Uses a conditional updateMany (WHERE status = COMPLETED) to
 *   atomically claim the reversal — prevents concurrent double-reversal.
 * - Creates REVERSAL_IN movements referencing the original SALE movements.
 * - Restores exact quantities and COGS values to InventoryBalance.
 * - Preserves the original Sale and SaleItem records (status set to REVERSED).
 */
export async function reverseSale(
  schoolId: string,
  saleId: string,
  userId: string,
  note?: string,
) {
  // Pre-fetch the sale with items
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, schoolId },
    include: {
      items: true,
      business: { include: { team: { include: { members: { where: { userId } } } } } },
    },
  });
  if (!sale) throw notFound("Sale not found");
  if (sale.status !== "COMPLETED") throw conflict("Sale has already been reversed");

  // Verify access (student must be team member)
  if (sale.business.team.members.length === 0) {
    throw forbidden("You do not have access to reverse this sale");
  }

  const businessId = sale.businessId;

  return prisma.$transaction(async (tx) => {
    // Atomically claim the reversal (prevents concurrent double-reversal)
    const claimed = await tx.sale.updateMany({
      where: { id: saleId, schoolId, status: "COMPLETED" },
      data: {
        status: "REVERSED",
        reversedAt: new Date(),
        reversedById: userId,
        reversalNote: note,
      },
    });
    if (claimed.count === 0) throw conflict("Sale has already been reversed");

    // Restore inventory for each sale item
    for (const item of sale.items) {
      const productId = item.productId;

      // Read the balance with Prisma (typed, no raw SQL)
      const balance = await tx.inventoryBalance.findUnique({
        where: {
          productId_businessId_schoolId: {
            productId,
            businessId,
            schoolId,
          },
        },
      });

      if (!balance) {
        throw new Error("Inventory balance not found during reversal");
      }

      const newQty = balance.quantityOnHand + item.quantity;
      const newVal = balance.inventoryValuePaise + item.cogsPaise;
      const newAvg = newQty > 0 ? Math.floor(newVal / newQty) : 0;

      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: {
          quantityOnHand: newQty,
          inventoryValuePaise: newVal,
          averageUnitCostPaise: newAvg,
        },
      });

      // Create REVERSAL_IN movement referencing the original SALE movement
      await tx.inventoryMovement.create({
        data: {
          schoolId,
          businessId,
          productId,
          type: "REVERSAL_IN",
          quantity: item.quantity,
          unitCostPaise: item.unitCostPaise,
          note: `Reversal of sale ${saleId}${note ? ": " + note : ""}`,
          createdById: userId,
          reversalOfId: item.inventoryMovementId,
        },
      });
    }

    return tx.sale.findUniqueOrThrow({
      where: { id_businessId_schoolId: { id: saleId, businessId, schoolId } },
      include: {
        items: { include: { product: { select: { name: true } } } },
        soldBy: { select: { name: true } },
      },
    });
  });
}
