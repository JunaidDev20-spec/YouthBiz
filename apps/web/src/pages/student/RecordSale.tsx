import { useState, useEffect } from "react";
import { api } from "../../lib/api.ts";
import { formatPaise, rupeesToPaise } from "../../lib/format.ts";
import {
  PageHeader, Card, Button, Input, Select, Spinner, ErrorBanner, EmptyState, Textarea,
} from "../../components/ui.tsx";

interface Business { id: string; name: string; status: string }
interface Product {
  id: string; name: string; unit: string; isActive: boolean;
  inventoryBalance: { quantityOnHand: number; averageUnitCostPaise: number } | null;
}
interface LineItem { productId: string; quantity: string; sellingPriceRupees: string }

const EMPTY_LINE: LineItem = { productId: "", quantity: "1", sellingPriceRupees: "" };

export default function RecordSale() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get<Business[]>("/api/businesses")
      .then(async (b) => {
        const biz = b[0] ?? null;
        setBusiness(biz);
        if (biz?.status === "APPROVED") {
          const p = await api.get<Product[]>(`/api/businesses/${biz.id}/products`);
          setProducts(p.filter((x) => x.isActive));
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const setLine = (idx: number, patch: Partial<LineItem>) => {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((ls) => [...ls, { ...EMPTY_LINE }]);
  const removeLine = (idx: number) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const lineTotal = (line: LineItem) => {
    const qty = parseInt(line.quantity) || 0;
    const price = rupeesToPaise(parseFloat(line.sellingPriceRupees) || 0);
    return qty * price;
  };

  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setError(""); setSuccess("");
    const items = lines
      .filter((l) => l.productId && parseInt(l.quantity) > 0 && parseFloat(l.sellingPriceRupees) > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: parseInt(l.quantity),
        unitSellingPricePaise: rupeesToPaise(parseFloat(l.sellingPriceRupees)),
      }));
    if (items.length === 0) { setError("Add at least one valid sale item."); return; }
    setSaving(true);
    try {
      const sale = await api.post<{ totalPaise: number }>(`/api/businesses/${business.id}/sales`, {
        items,
        note: note.trim() || undefined,
      });
      setSuccess(`Sale recorded! Total: ${formatPaise(sale.totalPaise)}`);
      setLines([{ ...EMPTY_LINE }]);
      setNote("");
      // Refresh products for updated stock
      const p = await api.get<Product[]>(`/api/businesses/${business.id}/products`);
      setProducts(p.filter((x) => x.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner className="mt-20" />;

  if (!business) return <div><PageHeader title="Record a Sale" /><EmptyState title="No business found" description="Register a business first." /></div>;

  if (business.status !== "APPROVED") {
    return (
      <div>
        <PageHeader title="Record a Sale" />
        <Card className="p-6 bg-amber-50 border-amber-200">
          <p className="text-amber-700 font-medium">Your business needs to be approved before recording sales.</p>
        </Card>
      </div>
    );
  }

  const availableProducts = products.filter((p) => (p.inventoryBalance?.quantityOnHand ?? 0) > 0);

  if (availableProducts.length === 0) {
    return (
      <div>
        <PageHeader title="Record a Sale" />
        <EmptyState title="No stock available" description="Stock in some products before recording a sale." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Record a Sale" description={business.name} />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
          ✓ {success}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            {lines.map((line, idx) => {
              const prod = availableProducts.find((p) => p.id === line.productId);
              const maxQty = prod?.inventoryBalance?.quantityOnHand ?? 0;
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Select
                      label={idx === 0 ? "Product" : undefined}
                      value={line.productId}
                      onChange={(e) => setLine(idx, { productId: e.target.value })}
                      required
                    >
                      <option value="">Select product</option>
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (stock: {p.inventoryBalance?.quantityOnHand ?? 0})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      label={idx === 0 ? "Qty" : undefined}
                      type="number"
                      min="1"
                      max={maxQty || undefined}
                      value={line.quantity}
                      onChange={(e) => setLine(idx, { quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label={idx === 0 ? "Selling price (₹)" : undefined}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 20.00"
                      value={line.sellingPriceRupees}
                      onChange={(e) => setLine(idx, { sellingPriceRupees: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <p className={`text-xs font-medium mt-1 ${idx === 0 ? "mt-6" : ""} text-slate-600`}>
                      {formatPaise(lineTotal(line))}
                    </p>
                  </div>
                  <div className="col-span-1">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className={`text-red-400 hover:text-red-600 text-lg ${idx === 0 ? "mt-6" : ""} block`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addLine}>+ Add Product</Button>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="text-sm font-semibold text-slate-700">
              Total: <span className="text-brand-600 text-base">{formatPaise(grandTotal)}</span>
            </div>
          </div>

          <Textarea
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Any note about this sale..."
          />

          <Button type="submit" disabled={saving || grandTotal === 0}>
            {saving ? "Recording…" : "Record Sale"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
