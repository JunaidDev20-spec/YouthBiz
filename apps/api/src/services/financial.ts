import prisma from "../lib/prisma.js";
import { notFound, forbidden } from "../lib/errors.js";

/**
 * Verify access to a business for financial views.
 * Teachers can view any business in their school.
 * Students can only view their own team's business.
 */
async function verifyBusinessAccess(schoolId: string, businessId: string, role: string, userId: string) {
  const business = await prisma.business.findUnique({
    where: { id_schoolId: { id: businessId, schoolId } },
    include: { team: { include: { members: { where: { userId } } } } },
  });
  if (!business) throw notFound("Business not found");
  if (role === "STUDENT" && business.team.members.length === 0) {
    throw forbidden("You do not have access to this business");
  }
  return business;
}

/**
 * Get the financial summary for a business.
 *
 * Revenue = sum of completed SaleItem revenue.
 * COGS = sum of completed SaleItem COGS.
 * Gross profit = revenue - COGS.
 * Operating expenses = sum of ACTIVE Expense amounts.
 * Net profit = gross profit - operating expenses.
 * Inventory value = sum of InventoryBalance.inventoryValuePaise.
 *
 * Optional date filters apply to sales (soldAt) and expenses (incurredAt).
 * Reversed sales and expenses are excluded.
 */
export async function getSummary(
  schoolId: string,
  businessId: string,
  role: string,
  userId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  await verifyBusinessAccess(schoolId, businessId, role, userId);

  const dateFilter: Record<string, Date> = {};
  if (dateFrom) dateFilter["gte"] = new Date(dateFrom);
  if (dateTo) dateFilter["lte"] = new Date(dateTo);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // Completed sale items
  const saleItems = await prisma.saleItem.findMany({
    where: {
      schoolId,
      businessId,
      sale: {
        status: "COMPLETED",
        ...(hasDateFilter ? { soldAt: dateFilter } : {}),
      },
    },
    select: { revenuePaise: true, cogsPaise: true },
  });

  const revenue = saleItems.reduce((sum, si) => sum + si.revenuePaise, 0);
  const cogs = saleItems.reduce((sum, si) => sum + si.cogsPaise, 0);

  // Active expenses (not reversed)
  const expenses = await prisma.expense.findMany({
    where: {
      schoolId,
      businessId,
      status: "ACTIVE",
      reversalOfId: null,
      ...(hasDateFilter ? { incurredAt: dateFilter } : {}),
    },
    select: { amountPaise: true },
  });

  const operatingExpenses = expenses.reduce((sum, e) => sum + e.amountPaise, 0);

  // Inventory
  const balances = await prisma.inventoryBalance.findMany({
    where: { schoolId, businessId },
    select: { quantityOnHand: true, inventoryValuePaise: true },
  });

  const inventoryQuantity = balances.reduce((sum, b) => sum + b.quantityOnHand, 0);
  const inventoryValue = balances.reduce((sum, b) => sum + b.inventoryValuePaise, 0);

  // Counts
  const salesCount = await prisma.sale.count({
    where: {
      schoolId,
      businessId,
      status: "COMPLETED",
      ...(hasDateFilter ? { soldAt: dateFilter } : {}),
    },
  });

  const expensesCount = await prisma.expense.count({
    where: {
      schoolId,
      businessId,
      status: "ACTIVE",
      reversalOfId: null,
      ...(hasDateFilter ? { incurredAt: dateFilter } : {}),
    },
  });

  return {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    operatingExpenses,
    netProfit: revenue - cogs - operatingExpenses,
    inventoryQuantity,
    inventoryValue,
    salesCount,
    expensesCount,
  };
}

/**
 * Get a paginated, chronological transaction history combining
 * sales, expenses, and reversals.
 */
export async function getTransactions(
  schoolId: string,
  businessId: string,
  role: string,
  userId: string,
  page: number,
  limit: number,
  dateFrom?: string,
  dateTo?: string,
) {
  await verifyBusinessAccess(schoolId, businessId, role, userId);

  const dateFilter: Record<string, Date> = {};
  if (dateFrom) dateFilter["gte"] = new Date(dateFrom);
  if (dateTo) dateFilter["lte"] = new Date(dateTo);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // Fetch sales
  const sales = await prisma.sale.findMany({
    where: {
      schoolId,
      businessId,
      ...(hasDateFilter ? { soldAt: dateFilter } : {}),
    },
    include: {
      items: { select: { revenuePaise: true, cogsPaise: true } },
      soldBy: { select: { name: true } },
    },
    orderBy: { soldAt: "desc" },
  });

  const saleTxns = sales.map((s) => ({
    id: s.id,
    type: s.status === "COMPLETED" ? "SALE" : "SALE_REVERSAL",
    amount: s.totalPaise,
    date: s.soldAt.toISOString(),
    description: s.note ?? `Sale of ${s.items.length} item(s)`,
    actor: s.soldBy?.name ?? "Unknown",
    status: s.status,
  }));

  // Fetch expenses (originals only, with reversal info)
  const expenseRecords = await prisma.expense.findMany({
    where: {
      schoolId,
      businessId,
      reversalOfId: null,
      ...(hasDateFilter ? { incurredAt: dateFilter } : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      reversedBy: { select: { id: true, createdAt: true, createdById: true } },
    },
    orderBy: { incurredAt: "desc" },
  });

  const expenseTxns = expenseRecords.map((e) => ({
    id: e.id,
    type: e.status === "ACTIVE" ? "EXPENSE" : "EXPENSE_REVERSAL",
    amount: e.amountPaise,
    date: e.incurredAt.toISOString(),
    description: e.title,
    actor: e.createdBy?.name ?? "Unknown",
    status: e.status,
  }));

  // Combine and sort by date descending
  const all = [...saleTxns, ...expenseTxns].sort((a, b) => b.date.localeCompare(a.date));

  // Paginate
  const total = all.length;
  const startIdx = (page - 1) * limit;
  const pageItems = all.slice(startIdx, startIdx + limit);

  return {
    items: pageItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
