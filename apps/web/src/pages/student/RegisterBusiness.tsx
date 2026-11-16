import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api.ts";
import {
  PageHeader, Card, Button, Input, Textarea, Badge, Spinner, ErrorBanner, EmptyState,
} from "../../components/ui.tsx";

interface Team { teamId: string; team: { name: string; cohort: { name: string } } }
interface Business { id: string; name: string; status: string }

export default function RegisterBusiness() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [existing, setExisting] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Team[]>("/api/students/me/team"),
      api.get<Business[]>("/api/businesses"),
    ])
      .then(([t, b]) => {
        setTeams(t);
        setExisting(b[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const team = teams[0];
    if (!team) return;
    setSaving(true); setFormError("");
    try {
      await api.post("/api/businesses", {
        teamId: team.teamId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      navigate("/student");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to register business");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner className="mt-20" />;

  const team = teams[0];

  if (!team) {
    return (
      <div>
        <PageHeader title="Register Business" />
        <EmptyState title="No team assigned" description="You need to be assigned to a team before registering a business." />
      </div>
    );
  }

  if (existing) {
    const color = existing.status === "APPROVED" ? "green" : existing.status === "PENDING" ? "yellow" : "red";
    return (
      <div>
        <PageHeader title="Register Business" />
        <Card className="p-6">
          <p className="text-sm text-slate-600 mb-3">Your team already has a business:</p>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">{existing.name}</span>
            <Badge color={color as "green" | "yellow" | "red"}>{existing.status}</Badge>
          </div>
          <div className="mt-4">
            <Link to="/student"><Button variant="secondary">Back to Dashboard</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Register Your Business"
        description={`Registering for ${team.team.name} · ${team.team.cohort.name}`}
      />
      <Card className="max-w-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Business name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Green Bakes"
            required
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What does your business do?"
          />
          {formError && <ErrorBanner message={formError} />}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Submitting…" : "Submit for Approval"}
            </Button>
            <Link to="/student"><Button type="button" variant="secondary">Cancel</Button></Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
