import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api.ts";
import { formatPaise, formatDate, formatDateTime } from "../../lib/format.ts";
import {
  PageHeader, Card, CardHeader, Badge, StatCard, Spinner, ErrorBanner,
  EmptyState, Td, Th, Table, Button,
} from "../../components/ui.tsx";

type Tab = "products" | "sales" | "expenses" | "summary" | "transactions";

interface Business {
  id: string; name: string; description: string | null; status: string;
  team: { name: string; cohort: { name: string } };
}
interface Product {
  id: string; name: string; sku: string | null; unit: string; isActive: boolean;
  inventoryBalance: { quantityOnHand: number; averageUnitCostPaise: number } | null;
}
interface SaleItem { quantity: number; revenuePaise: number; cogsPaise: number; product: { name: string } }
interface Sale { id: string; totalPaise: number; status: string; soldAt: string; soldBy: { name: string }; items: SaleItem[] }
interface Expense { id: string; title: string; category: string; amountPaise: number; status: string; incurredAt: string; createdBy: { name: string } }
interface Summary { revenue: number; cogs: number; grossProfit: number; operatingExpenses: number; netProfit: number; inventoryQuantity: number; inventoryValue: number; salesCount: number; expensesCount: number }
interface TxnItem { id: string; type: string; amount: number; date: string; description: string; actor: string; status: string }
interface Transactions { items: TxnItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }

function statusColor(s: string): "yellow" | "green" | "red" | "slate" {
  if (s === "PENDING") return "yellow";
  if (s === "APPROVED" || s === "COMPLETED" || s === "ACTIVE") return "green";
  if (s === "REJECTED" || s === "REVERSED" || s === "SUSPENDED") return "red";
  return "slate";
}

export default function TeacherBusinessDetail() {
  const { id: businessId } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txns, setTxns] = useState<Transactions | null>(null);
  const [txnPage, setTxnPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return;
    api.get<Business>(`/api/businesses/${businessId}`)
      .then(setBusiness)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [businessId]);

  const loadTab = useCallback(async (t: Tab) => {
    if (!businessId) return;
    setTabLoading(true);
    try {
      if (t === "products") setProducts(await api.get<Product[]>(`/api/businesses/${businessId}/products`));
      else if (t === "sales") setSales(await api.get<Sale[]>(`/api/businesses/${businessId}/sales`));
      else if (t === "expenses") setExpenses(await api.get<Expense[]>(`/api/businesses/${businessId}/expenses`));
      else if (t === "summary") setSummary(await api.get<Summary>(`/api/businesses/${businessId}/summary`));
      else if (t === "transactions") setTxns(await api.get<Transactions>(`/api/businesses/${businessId}/transactions?page=${txnPage}&limit=20`));
    } catch {}
    finally { setTabLoading(false); }
  }, [businessId, txnPage]);

  useEffect(() => { void loadTab(tab); }, [tab, loadTab]);

  if (loading) return <Spinner className="mt-20" />;
  if (error) return <ErrorBanner message={error} />;
  if (!business) return <ErrorBanner message="Business not found" />;

  const tabs: Tab[] = ["summary", "products", "sales", "expenses", "transactions"];

  return (
    <div>
      <PageHeader
        title={business.name}
        description={`${business.team.name} · ${business.team.cohort.name}`}
        action={<Badge color={statusColor(business.status)}>{business.status}</Badge>}
      />
      {business.description && <p className="text-sm text-slate-600 mb-4">{business.description}</p>}

      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize whitespace-nowrap transition-colors border-b-2 ${tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tabLoading ? <Spinner className="mt-10" /> : (
        <>
          {/* Summary */}
          {tab === "summary" && summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Revenue" value={formatPaise(summary.revenue)} color="text-brand-600" />
              <StatCard label="COGS" value={formatPaise(summary.cogs)} color="text-slate-700" />
              <StatCard label="Gross Profit" value={formatPaise(summary.grossProfit)} color={summary.grossProfit >= 0 ? "text-brand-600" : "text-red-600"} />
              <StatCard label="Operating Expenses" value={formatPaise(summary.operatingExpenses)} color="text-red-600" />
              <StatCard label="Net Profit" value={formatPaise(summary.netProfit)} color={summary.netProfit >= 0 ? "text-brand-600" : "text-red-600"} />
              <StatCard label="Inventory Qty" value={summary.inventoryQuantity} />
              <StatCard label="Inventory Value" value={formatPaise(summary.inventoryValue)} color="text-brand-600" />
              <StatCard label="Sales / Expenses" value={`${summary.salesCount} / ${summary.expensesCount}`} />
            </div>
          )}

          {/* Products */}
          {tab === "products" && (
            products.length === 0 ? <EmptyState title="No products" /> :
            <Card><Table>
              <thead><tr><Th>Name</Th><Th>SKU</Th><Th>Unit</Th><Th>Status</Th><Th>Qty</Th><Th>Avg Cost</Th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td><span className="font-medium">{p.name}</span></Td>
                    <Td>{p.sku ?? "—"}</Td>
                    <Td>{p.unit}</Td>
                    <Td><Badge color={p.isActive ? "green" : "slate"}>{p.isActive ? "Active" : "Inactive"}</Badge></Td>
                    <Td>{p.inventoryBalance?.quantityOnHand ?? 0}</Td>
                    <Td>{p.inventoryBalance ? formatPaise(p.inventoryBalance.averageUnitCostPaise) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table></Card>
          )}

          {/* Sales */}
          {tab === "sales" && (
            sales.length === 0 ? <EmptyState title="No sales recorded" /> :
            <Card><Table>
              <thead><tr><Th>Date</Th><Th>Items</Th><Th>Total</Th><Th>By</Th><Th>Status</Th></tr></thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <Td>{formatDateTime(s.soldAt)}</Td>
                    <Td className="text-xs">{s.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}</Td>
                    <Td className="font-medium">{formatPaise(s.totalPaise)}</Td>
                    <Td>{s.soldBy?.name ?? "—"}</Td>
                    <Td><Badge color={statusColor(s.status)}>{s.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table></Card>
          )}

          {/* Expenses */}
          {tab === "expenses" && (
            expenses.length === 0 ? <EmptyState title="No expenses recorded" /> :
            <Card><Table>
              <thead><tr><Th>Date</Th><Th>Title</Th><Th>Category</Th><Th>Amount</Th><Th>By</Th><Th>Status</Th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td>{formatDate(e.incurredAt)}</Td>
                    <Td><span className="font-medium">{e.title}</span></Td>
                    <Td>{e.category}</Td>
                    <Td>{formatPaise(e.amountPaise)}</Td>
                    <Td>{e.createdBy?.name ?? "—"}</Td>
                    <Td><Badge color={statusColor(e.status)}>{e.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table></Card>
          )}

          {/* Transactions */}
          {tab === "transactions" && (
            !txns || txns.items.length === 0 ? <EmptyState title="No transactions" /> :
            <div className="space-y-3">
              <Card><Table>
                <thead><tr><Th>Date</Th><Th>Type</Th><Th>Description</Th><Th>Amount</Th><Th>By</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {txns.items.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <Td>{formatDate(t.date)}</Td>
                      <Td><Badge color={t.type.includes("REVERSAL") ? "red" : t.type === "SALE" ? "green" : "blue"}>{t.type.replace("_", " ")}</Badge></Td>
                      <Td>{t.description}</Td>
                      <Td className="font-medium">{formatPaise(t.amount)}</Td>
                      <Td>{t.actor}</Td>
                      <Td><Badge color={statusColor(t.status)}>{t.status}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </Table></Card>
              {txns.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm text-slate-500">Page {txns.pagination.page} of {txns.pagination.totalPages}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={txnPage === 1} onClick={() => setTxnPage((p) => p - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={txnPage >= txns.pagination.totalPages} onClick={() => setTxnPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
