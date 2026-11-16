import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.ts";
import { formatDate } from "../../lib/format.ts";
import {
  PageHeader, Card, Button, Input, Spinner, ErrorBanner, EmptyState, Td, Th, Table,
} from "../../components/ui.tsx";

interface Cohort {
  id: string;
  name: string;
  createdAt: string;
  _count: { teams: number; members: number };
}

export default function Cohorts() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = () => {
    setLoading(true);
    api.get<Cohort[]>("/api/cohorts")
      .then(setCohorts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setFormError("");
    try {
      await api.post("/api/cohorts", { name: name.trim() });
      setName("");
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create cohort");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner className="mt-20" />;

  return (
    <div>
      <PageHeader
        title="Cohorts"
        description="Manage school cohorts and teams"
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Cohort"}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Cohort name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2026 Cohort"
                required
              />
              {formError && <p className="mt-1 text-xs text-red-600">{formError}</p>}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </form>
        </Card>
      )}

      {cohorts.length === 0 ? (
        <EmptyState
          title="No cohorts yet"
          description="Create your first cohort to get started."
          action={<Button onClick={() => setShowForm(true)}>Create Cohort</Button>}
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Teams</Th>
                <Th>Members</Th>
                <Th>Created</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td><span className="font-medium text-slate-800">{c.name}</span></Td>
                  <Td>{c._count.teams}</Td>
                  <Td>{c._count.members}</Td>
                  <Td>{formatDate(c.createdAt)}</Td>
                  <Td>
                    <Link to={`/teacher/cohorts/${c.id}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
