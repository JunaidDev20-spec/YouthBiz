import prisma from "../lib/prisma.js";
import { notFound, forbidden, conflict } from "../lib/errors.js";

/**
 * Verify business access for expense operations.
 */
async function verifyExpenseAccess(
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
  if (business.status !== "APPROVED") throw forbidden("Business must be approved to record expenses");
  if (role === "STUDENT" && business.team.members.length === 0) {
    throw forbidden("You are not a member of this business's team");
  }
  return business;
}

/**
 * Create an operating expense.  Does not affect inventory.
 */
export async function createExpense(
  schoolId: string,
  businessId: string,
  studentId: string,
  data: {
    title: string;
    description?: string;
    category?: string;
    amountPaise: number;
    incurredAt?: string;
  },
) {
  await verifyExpenseAccess(schoolId, businessId, "STUDENT", studentId);

  return prisma.expense.create({
    data: {
      schoolId,
      businessId,
      createdById: studentId,
      title: data.title,
      description: data.description,
      category: (data.category ?? "OTHER") as never,
      amountPaise: data.amountPaise,
      status: "ACTIVE",
      incurredAt: data.incurredAt ? new Date(data.incurredAt) : new Date(),
    },
  });
}

/**
 * List expenses for a business.
 */
export async function getExpenses(schoolId: string, businessId: string, role: string, userId: string) {
  await verifyExpenseAccess(schoolId, businessId, role, userId);
  return prisma.expense.findMany({
    where: {
      schoolId,
      businessId,
      // Exclude reversal records (they have reversalOfId set)
      reversalOfId: null,
    },
    include: {
      createdBy: { select: { name: true, username: true } },
      reversedBy: { select: { id: true, createdAt: true, createdById: true } },
    },
    orderBy: { incurredAt: "desc" },
  });
}

/**
 * Get a single expense by ID (scoped to school).
 */
export async function getExpense(schoolId: string, expenseId: string, role: string, userId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, schoolId },
    include: {
      business: { include: { team: { include: { members: { where: { userId } } } } } },
      createdBy: { select: { name: true, username: true } },
    },
  });
  if (!expense) throw notFound("Expense not found");

  if (role === "STUDENT" && expense.business.team.members.length === 0) {
    throw forbidden("You do not have access to this expense");
  }

  return expense;
}

/**
 * Reverse an expense.  Creates a separate reversal record and marks
 * the original as REVERSED.  At most one reversal per original (enforced
 * by @@unique([reversalOfId, businessId, schoolId])).
 */
export async function reverseExpense(
  schoolId: string,
  expenseId: string,
  userId: string,
  note?: string,
) {
  const original = await prisma.expense.findFirst({
    where: { id: expenseId, schoolId, reversalOfId: null },
    include: {
      business: { include: { team: { include: { members: { where: { userId } } } } } },
    },
  });
  if (!original) throw notFound("Expense not found or already reversed");

  // Verify access
  if (original.business.team.members.length === 0) {
    throw forbidden("You do not have access to reverse this expense");
  }

  const businessId = original.businessId;

  return prisma.$transaction(async (tx) => {
    // Atomically mark the original as REVERSED (prevents concurrent reversal)
    const claimed = await tx.expense.updateMany({
      where: { id: expenseId, schoolId, status: "ACTIVE", reversalOfId: null },
      data: { status: "REVERSED" },
    });
    if (claimed.count === 0) throw conflict("Expense has already been reversed");

    // Create the reversal record (status REVERSED so it's excluded from totals)
    const reversal = await tx.expense.create({
      data: {
        schoolId,
        businessId,
        createdById: userId,
        title: `REVERSAL: ${original.title}`,
        description: note ?? `Reversal of expense ${original.id}`,
        category: original.category,
        amountPaise: original.amountPaise,
        status: "REVERSED",
        incurredAt: new Date(),
        reversalOfId: original.id,
      },
    });

    return { original: { ...original, status: "REVERSED" as const }, reversal };
  });
}
