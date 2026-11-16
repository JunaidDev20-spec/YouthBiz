import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api.ts";
import { formatPaise, rupeesToPaise, formatDateTime } from "../../lib/format.ts";
import {
  PageHeader, Card, CardHeader, Button, Input, Badge, Spinner,
  ErrorBanner, EmptyState, Td, Th, Table, Textarea,
} from "../../components/ui.tsx";

interface Business { id: string; name: string; status: string }
interface Balance { quantityOnHand: number; inventoryValuePaise: number; averageUnitCostPaise: number }
interface Product {
  id: string; name: string; description: string | null; sku: string | null; unit: string; isActive: boolean;
  inventoryBalance: { quantityOnHand: number; averageUnitCostPaise: number } | null;
}
interface Movement { id: string; type: string; quantity: number; unitCostPaise: number; note: string | null; createdAt: string }

export default function Products() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add product form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newUnit, setNewUnit] = useState("piece");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Stock-in form
  const [stockProductId, setStockProductId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockPrice, setStockPrice] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [stockError, setStockError] = useState("");
  const [stockSaving, setStockSaving] = useState(false);

  // Movements panel
  const [movProductId, setMovProductId] = useState("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movLoading, setMovLoading] = useState(false);

  const loadProducts = useCallback((bizId: string) => {
    api.get<Product[]>(`/api/businesses/${bizId}/products`)
      .then(setProducts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get<Business[]>("/api/businesses")])
      .then(([b]) => {
        const biz = b[0] ?? null;
        setBusiness(biz);
        if (biz) loadProducts(biz.id);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [loadProducts]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setAddSaving(true); setAddError("");
    try {
      await api.post(`/api/businesses/${business.id}/products`, {
        name: newName.trim(),
        sku: newSku.trim() || undefined,
        unit: newUnit.trim() || "piece",
      });
      setNewName(""); setNewSku(""); setNewUnit("piece");
      setShowAddForm(false);
      loadProducts(business.id);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed");
    } finally { setAddSaving(false); }
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockSaving(true); setStockError("");
    try {
      await api.post(`/api/products/${stockProductId}/stock-in`, {
        quantity: parseInt(stockQty),
        unitCostPaise: rupeesToPaise(stockPrice),
        note: stockNote.trim() || undefined,
      });
      setStockQty(""); setStockPrice(""); setStockNote("");
      setStockProductId("");
      if (business) loadProducts(business.id);
    } catch (err) {
      setStockError(err instanceof Error ? err.message : "Failed");
    } finally { setStockSaving(false); }
  };

  const viewMovements = async (productId: string) => {
    if (movProductId === productId) { setMovProductId(""); return; }
    setMovProductId(productId);
    setMovLoading(true);
    try {
      const m = await api.get<Movement[]>(`/api/products/${productId}/inventory/movements`);
      setMovements(m);
    } catch {}
    finally { setMovLoading(false); }
  };

  const toggleActive = async (product: Product) => {
    try {
      await api.patch(`/api/products/${product.id}`, { isActive: !product.isActive });
      if (business) loadProducts(business.id);
    } catch {}
  };

  if (loading) return <Spinner className="mt-20" />;
  if (error) return <ErrorBanner message={error} />;

  if (!business) {
    return <div><PageHeader title="Products & Inventory" /><EmptyState title="No business found" description="Register a business first." /></div>;
  }

  if (business.status !== "APPROVED") {
    return (
      <div>
        <PageHeader title="Products & Inventory" />
        <Card className="p-6 bg-amber-50 border-amber-200">
          <p className="text-amber-700 font-medium">Your business needs to be approved before managing products.</p>
          <p className="text-sm text-amber-600 mt-1">Status: {business.status}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Products & Inventory"
        description={business.name}
        action={<Button onClick={() => setShowAddForm(!showAddForm)}>{showAddForm ? "Cancel" : "+ Add Product"}</Button>}
      />

      {showAddForm && (
        <Card className="mb-5 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">New Product</h3>
          <form onSubmit={handleAddProduct} className="grid grid-cols-3 gap-3 items-end">
            <div className="col-span-1">
              <Input label="Name *" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <Input label="SKU (optional)" value={newSku} onChange={(e) => setNewSku(e.target.value)} />
            <Input label="Unit" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
            {addError && <p className="col-span-3 text-xs text-red-600">{addError}</p>}
            <div className="col-span-3">
              <Button type="submit" disabled={addSaving}>{addSaving ? "Adding…" : "Add Product"}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Stock-in form */}
      {stockProductId && (
        <Card className="mb-5 p-5 border-brand-200 bg-brand-50">
          <h3 className="text-sm font-semibold text-brand-700 mb-3">
            Stock In: {products.find((p) => p.id === stockProductId)?.name}
          </h3>
          <form onSubmit={handleStockIn} className="grid grid-cols-3 gap-3 items-end">
            <Input label="Quantity *" type="number" min="1" value={stockQty} onChange={(e) => setStockQty(e.target.value)} required />
            <Input label="Unit cost (₹) *" type="number" min="0.01" step="0.01" value={stockPrice} onChange={(e) => setStockPrice(e.target.value)} required placeholder="e.g. 10.00" />
            <Input label="Note" value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
            {stockError && <p className="col-span-3 text-xs text-red-600">{stockError}</p>}
            <div className="col-span-3 flex gap-2">
              <Button type="submit" disabled={stockSaving}>{stockSaving ? "Recording…" : "Record Stock-In"}</Button>
              <Button type="button" variant="secondary" onClick={() => setStockProductId("")}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {products.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product to start tracking inventory." />
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{p.name}</span>
                    {p.sku && <span className="text-xs text-slate-400">SKU: {p.sku}</span>}
                    <Badge color={p.isActive ? "green" : "slate"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Unit: {p.unit} ·{" "}
                    Qty: <strong>{p.inventoryBalance?.quantityOnHand ?? 0}</strong> ·{" "}
                    Avg cost: {p.inventoryBalance ? formatPaise(p.inventoryBalance.averageUnitCostPaise) : "—"}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="primary"
                    onClick={() => setStockProductId(stockProductId === p.id ? "" : p.id)}>
                    {stockProductId === p.id ? "Cancel" : "Stock In"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void viewMovements(p.id)}>
                    {movProductId === p.id ? "Hide" : "History"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void toggleActive(p)}>
                    {p.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>

              {movProductId === p.id && (
                <div className="border-t border-slate-100 px-5 py-3">
                  {movLoading ? <Spinner className="h-8" /> : movements.length === 0 ? (
                    <p className="text-sm text-slate-500">No movements yet.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr><Th>Date</Th><Th>Type</Th><Th>Qty</Th><Th>Unit Cost</Th><Th>Note</Th></tr>
                      </thead>
                      <tbody>
                        {movements.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <Td>{formatDateTime(m.createdAt)}</Td>
                            <Td><Badge color={m.type === "STOCK_IN" ? "green" : m.type.includes("REVERSAL") ? "yellow" : "blue"}>{m.type.replace("_", " ")}</Badge></Td>
                            <Td>{m.quantity}</Td>
                            <Td>{formatPaise(m.unitCostPaise)}</Td>
                            <Td>{m.note ?? "—"}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
