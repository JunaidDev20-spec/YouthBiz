import prisma from "../lib/prisma.js";
import { notFound, forbidden } from "../lib/errors.js";

/**
 * Verify product access: product must exist in the school, and if the
 * caller is a student, they must be a team member.  If requireApproved
 * is true, the business must be APPROVED.
 */
async function verifyProductAccess(
  schoolId: string,
  productId: string,
  role: string,
  userId: string,
  requireApproved: boolean,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, schoolId },
    include: {
      business: {
        include: { team: { include: { members: { where: { userId } } } } },
      },
    },
  });
  if (!product) throw notFound("Product not found");

  if (requireApproved && product.business.status !== "APPROVED") {
    throw forbidden("Business must be approved before stock-in");
  }

  if (role === "STUDENT") {
    if (product.business.team.members.length === 0) {
      throw forbidden("You are not a member of this business's team");
    }
  }

  return product;
}

/**
 * Record a stock-in movement and update the inventory balance using
 * the moving weighted-average cost method.
 *
 * The operation is atomic: the balance row is locked with FOR UPDATE
 * to prevent concurrent stock-ins from corrupting the balance.
 *
 * Weighted-average formula (integer paise):
 *   newQty = oldQty + stockInQty
 *   newVal = oldVal + stockInQty * unitCost
 *   newAvg = newQty > 0 ? floor(newVal / newQty) : 0
 *
 * The rounding residual (newVal - newAvg * newQty) is preserved in
 * inventoryValuePaise.  When stock is fully exhausted, the sale
 * service recognizes the entire remaining value as COGS.
 */
export async function stockIn(
  schoolId: string,
  productId: string,
  studentId: string,
  data: { quantity: number; unitCostPaise: number; note?: string },
) {
  const product = await verifyProductAccess(schoolId, productId, "STUDENT", studentId, true);
  const businessId = product.businessId;

  return prisma.$transaction(async (tx) => {
    // Lock the balance row for update (prevents concurrent corruption)
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        quantityOnHand: number;
        inventoryValuePaise: number;
        averageUnitCostPaise: number;
      }>
    >`
      SELECT "id", "quantityOnHand", "inventoryValuePaise", "averageUnitCostPaise"
      FROM "InventoryBalance"
      WHERE "productId" = ${productId}::uuid
        AND "businessId" = ${businessId}::uuid
        AND "schoolId" = ${schoolId}::uuid
      FOR UPDATE
    `;

    let currentQty: number;
    let currentVal: number;
    let balanceId: string;

    if (rows.length > 0) {
      const row = rows[0]!;
      currentQty = row.quantityOnHand;
      currentVal = row.inventoryValuePaise;
      balanceId = row.id;
    } else {
      // No balance yet — try to create one.
      // May conflict with a concurrent create; unique constraint
      // @@unique([productId, businessId, schoolId]) prevents duplicates.
      currentQty = 0;
      currentVal = 0;
      try {
        const created = await tx.inventoryBalance.create({
          data: {
            schoolId,
            businessId,
            productId,
            quantityOnHand: 0,
            inventoryValuePaise: 0,
            averageUnitCostPaise: 0,
          },
        });
        balanceId = created.id;
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "P2002") {
          // Another transaction created it — lock and read
          const retryRows = await tx.$queryRaw<
            Array<{
              id: string;
              quantityOnHand: number;
              inventoryValuePaise: number;
              averageUnitCostPaise: number;
            }>
          >`
            SELECT "id", "quantityOnHand", "inventoryValuePaise", "averageUnitCostPaise"
            FROM "InventoryBalance"
            WHERE "productId" = ${productId}
              AND "businessId" = ${businessId}
              AND "schoolId" = ${schoolId}
            FOR UPDATE
          `;
          const row = retryRows[0]!;
          currentQty = row.quantityOnHand;
          currentVal = row.inventoryValuePaise;
          balanceId = row.id;
        } else {
          throw e;
        }
      }
    }

    // Moving weighted-average cost calculation (integer arithmetic)
    const newQty = currentQty + data.quantity;
    const newVal = currentVal + data.quantity * data.unitCostPaise;
    const newAvgCost = newQty > 0 ? Math.floor(newVal / newQty) : 0;

    // Update the balance
    await tx.inventoryBalance.update({
      where: { id: balanceId },
      data: {
        quantityOnHand: newQty,
        inventoryValuePaise: newVal,
        averageUnitCostPaise: newAvgCost,
      },
    });

    // Record the permanent ledger entry
    await tx.inventoryMovement.create({
      data: {
        schoolId,
        businessId,
        productId,
        type: "STOCK_IN",
        quantity: data.quantity,
        unitCostPaise: data.unitCostPaise,
        note: data.note,
        createdById: studentId,
      },
    });

    // Return the updated balance
    return tx.inventoryBalance.findUniqueOrThrow({
      where: {
        productId_businessId_schoolId: { productId, businessId, schoolId },
      },
    });
  });
}

/**
 * Get the current inventory balance for a product.
 */
export async function getInventoryBalance(schoolId: string, productId: string, role: string, userId: string) {
  const product = await verifyProductAccess(schoolId, productId, role, userId, false);
  return prisma.inventoryBalance.findUnique({
    where: {
      productId_businessId_schoolId: { productId, businessId: product.businessId, schoolId },
    },
  });
}

/**
 * Get the inventory movement history for a product.
 */
export async function getInventoryMovements(schoolId: string, productId: string, role: string, userId: string) {
  await verifyProductAccess(schoolId, productId, role, userId, false);
  return prisma.inventoryMovement.findMany({
    where: { schoolId, productId },
    orderBy: { createdAt: "desc" },
  });
}
