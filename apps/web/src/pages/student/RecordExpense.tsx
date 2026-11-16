import { useState, useEffect } from "react";
import { api } from "../../lib/api.ts";
import { rupeesToPaise } from "../../lib/format.ts";
import {
  PageHeader, Card, Button, Input, Select, Textarea, Spinner, ErrorBanner, EmptyState,
} from "../../components/ui.tsx";

interface Business { id: string; name: string; status: string }

const CATEGORIES = ["SUPPLIES", "TRANSPORT", "MARKETING", "UTILITIES", "PACKAGING", "OTHER"];

export default function RecordExpense() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [amountRupees, setAmountRupees] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get<Business[]>("/api/businesses")
      .then((b) => setBusiness(b[0] ?? null))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setError(""); setSuccess("");
    setSaving(true);
    try {
      await api.post(`/api/businesses/${business.id}/expenses`, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        amountPaise: rupeesToPaise(parseFloat(amountRupees)),
      });
      setSuccess(`Expense "${title}" recorded successfully.`);
      setTitle(""); setDescription(""); setCategory("OTHER"); setAmountRupees("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner className="mt-20" />;

  if (!business) return <div><PageHeader title="Record an Expense" /><EmptyState title="No business found" /></div>;

  if (business.status !== "APPROVED") {
    return (
      <div>
        <PageHeader title="Record an Expense" />
        <Card className="p-6 bg-amber-50 border-amber-200">
          <p className="text-amber-700 font-medium">Your business needs to be approved before recording expenses.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Record an Expense" description={business.name} />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
          ✓ {success}
        </div>
      )}

      <Card className="max-w-lg p-6">
        <p className="text-xs text-slate-500 mb-4">
          Operating expenses are costs for running your business (transport, supplies, etc.)
          and are separate from inventory purchases.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Transport to market"
            required
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Additional details..."
          />
          <Select
            label="Category *"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </Select>
          <Input
            label="Amount (₹) *"
            type="number"
            min="0.01"
            step="0.01"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            placeholder="e.g. 50.00"
            required
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Recording…" : "Record Expense"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
