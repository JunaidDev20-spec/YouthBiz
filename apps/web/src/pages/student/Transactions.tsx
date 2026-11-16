import { useState, useEffect } from "react";
import { api } from "../../lib/api.ts";
import { formatPaise, formatDate } from "../../lib/format.ts";
import {
  PageHeader, Card, Badge, Button, Spinner, ErrorBanner, EmptyState,
  Td, Th, Table,
} from "../../components/ui.tsx";

interface Business { id: string; name: string }
interface TxnItem {
  id: string; type: string; amount: number; date: string;
  description: string; actor: string; status: string;
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }

function txnColor(type: string): "green" | "red" | "blue" | "yellow" {
  if (type === "SALE") return "green";
  if (type === "EXPENSE") return "blue";
  if (type.includes("REVERSAL")) return "yellow";
  return "green";
}

function statusColor(s: string): "green" | "red" | "slate" {
  if (s === "COMPLETED" || s === "ACTIVE") return "green";
  if (s === "REVERSED") return "red";
  return "slate";
}

export default function Transactions() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [items, setItems] = useState<TxnItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Business[]>("/api/businesses")
      .then((b) => setBusiness(b[0] ?? null))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!business) return;
    setLoading(true);
    api.get<{ items: TxnItem[]; pagination: Pagination }>(
      `/api/businesses/${business.id}/transactions?page=${page}&limit=20`,
    )
      .then(({ items: txns, pagination: pg }) => {
        setItems(txns);
        setPagination(pg);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [business, page]);

  if (!business && !error) return <Spinner className="mt-20" />;
  if (error) return <ErrorBanner message={error} />;
  if (!business) return <div><PageHeader title="Transaction History" /><EmptyState title="No business found" /></div>;

  return (
    <div>
      <PageHeader title="Transaction History" description={business.name} />

      {loading ? <Spinner className="mt-10" /> : items.length === 0 ? (
        <EmptyState title="No transactions yet" description="Sales and expenses will appear here." />
      ) : (
        <div className="space-y-4">
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Description</Th>
                  <Th>Amount</Th>
                  <Th>By</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <Td>{formatDate(t.date)}</Td>
                    <Td>
                      <Badge color={txnColor(t.type)}>
                        {t.type.replace("_", " ")}
                      </Badge>
                    </Td>
                    <Td>{t.description}</Td>
                    <Td className="font-medium tabular-nums">{formatPaise(t.amount)}</Td>
                    <Td>{t.actor}</Td>
                    <Td>
                      <Badge color={statusColor(t.status)}>{t.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
