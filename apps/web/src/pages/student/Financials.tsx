import { useState, useEffect } from "react";
import { api } from "../../lib/api.ts";
import { formatPaise } from "../../lib/format.ts";
import {
  PageHeader, StatCard, Card, Spinner, ErrorBanner, EmptyState,
} from "../../components/ui.tsx";

interface Business { id: string; name: string; status: string }
interface Summary {
  revenue: number; cogs: number; grossProfit: number; operatingExpenses: number;
  netProfit: number; inventoryQuantity: number; inventoryValue: number;
  salesCount: number; expensesCount: number;
}

export default function Financials() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get<Business[]>("/api/businesses")
      .then(async (b) => {
        const biz = b[0] ?? null;
        setBusiness(biz);
        if (biz) {
          const s = await api.get<Summary>(`/api/businesses/${biz.id}/summary`);
          setSummary(s);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner className="mt-20" />;
  if (error) return <ErrorBanner message={error} />;
  if (!business) return <div><PageHeader title="Financial Summary" /><EmptyState title="No business found" /></div>;

  return (
    <div>
      <PageHeader title="Financial Summary" description={`${business.name} · All time`} />

      {!summary ? (
        <EmptyState title="No financial data yet" />
      ) : (
        <div className="space-y-6">
          {/* Income statement */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Income Statement</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Revenue" value={formatPaise(summary.revenue)} color="text-brand-600" />
              <StatCard label="Cost of Goods Sold" value={formatPaise(summary.cogs)} color="text-slate-700" />
              <StatCard
                label="Gross Profit"
                value={formatPaise(summary.grossProfit)}
                color={summary.grossProfit >= 0 ? "text-brand-600" : "text-red-600"}
              />
              <StatCard label="Operating Expenses" value={formatPaise(summary.operatingExpenses)} color="text-red-600" />
              <StatCard
                label="Net Profit"
                value={formatPaise(summary.netProfit)}
                color={summary.netProfit >= 0 ? "text-brand-600" : "text-red-600"}
              />
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Inventory</h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Units on Hand" value={summary.inventoryQuantity} />
              <StatCard label="Inventory Value" value={formatPaise(summary.inventoryValue)} color="text-brand-600" />
            </div>
          </div>

          {/* Activity */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Activity</h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Completed Sales" value={summary.salesCount} />
              <StatCard label="Active Expenses" value={summary.expensesCount} />
            </div>
          </div>

          <Card className="p-4 bg-slate-50 border-slate-200">
            <p className="text-xs text-slate-500">
              Reversed sales and reversed expenses are excluded from all totals.
              Financial values are calculated by the server and not modifiable by users.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
