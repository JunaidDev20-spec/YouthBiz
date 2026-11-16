import prisma from "../lib/prisma.js";
import { notFound, forbidden, conflict, badRequest } from "../lib/errors.js";

/**
 * Verify that a business exists, belongs to the school, and is approved.
 * For students, verify team membership.  Returns the business.
 */
async function verifyBusinessAccess(
  schoolId: string,
  businessId: string,
  role: string,
  userId: string,
  requireApproved: boolean,
) {
  const business = await prisma.business.findUnique({
    where: { id_schoolId: { id: businessId, schoolId } },
    include: {
      team: { include: { members: { where: { userId } } } },
    },
  });
  if (!business) throw notFound("Business not found");

  if (requireApproved && business.status !== "APPROVED") {
    throw forbidden("Business must be approved before performing this action");
  }

  // Students must be team members
  if (role === "STUDENT") {
    if (business.team.members.length === 0) {
      throw forbidden("You are not a member of this business's team");
    }
  }

  return business;
}

/**
 * Create a product for an approved business.
 * Only team members can create products.
 */
export async function createProduct(
  schoolId: string,
  businessId: string,
  studentId: string,
  data: { name: string; description?: string; sku?: string; unit?: string },
) {
  await verifyBusinessAccess(schoolId, businessId, "STUDENT", studentId, true);

  try {
    return await prisma.product.create({
      data: {
        schoolId,
        businessId,
        name: data.name,
        description: data.description,
        sku: data.sku || null,
        unit: data.unit ?? "piece",
      },
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") {
      throw conflict("A product with this name or SKU already exists in this business");
    }
    throw e;
  }
}

/**
 * List products for a business.  Teachers can view any business in
 * their school; students can view products for their own teams' businesses.
 */
export async function getProducts(
  schoolId: string,
  businessId: string,
  role: string,
  userId: string,
) {
  await verifyBusinessAccess(schoolId, businessId, role, userId, false);
  return prisma.product.findMany({
    where: { schoolId, businessId },
    include: { inventoryBalance: { select: { quantityOnHand: true, averageUnitCostPaise: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single product.  Verifies school and team membership (for students).
 */
export async function getProduct(schoolId: string, productId: string, role: string, userId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, schoolId },
    include: {
      business: {
        include: { team: { include: { members: { where: { userId } } } } },
      },
      inventoryBalance: true,
    },
  });
  if (!product) throw notFound("Product not found");

  if (role === "STUDENT") {
    if (product.business.team.members.length === 0) {
      throw forbidden("You do not have access to this product");
    }
  }

  return product;
}

/**
 * Update a product.  Only team members can update.
 */
export async function updateProduct(
  schoolId: string,
  productId: string,
  studentId: string,
  data: { name?: string; description?: string; sku?: string; unit?: string; isActive?: boolean },
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, schoolId },
    include: {
      business: {
        include: { team: { include: { members: { where: { userId: studentId } } } } },
      },
    },
  });
  if (!product) throw notFound("Product not found");

  if (product.business.team.members.length === 0) {
    throw forbidden("You are not a member of this business's team");
  }

  try {
    return await prisma.product.update({
      where: { id: productId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sku !== undefined && { sku: data.sku || null }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") {
      throw conflict("A product with this name or SKU already exists in this business");
    }
    throw e;
  }
}
