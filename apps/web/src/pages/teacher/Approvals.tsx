import { useState, useEffect } from "react";
import { api } from "../../lib/api.ts";
import { formatDate } from "../../lib/format.ts";
import {
  PageHeader, Card, Button, Textarea, Spinner, ErrorBanner, EmptyState, Badge,
} from "../../components/ui.tsx";

interface Member {
  user: { id: string; name: string; username: string };
}

interface Business {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  team: {
    name: string;
    cohort: { name: string };
    members: Member[];
  };
}

interface ActionState {
  id: string;
  kind: "approve" | "reject";
  note: string;
  saving: boolean;
  error: string;
}

export default function Approvals() {
  const [pending, setPending] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<ActionState | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Business[]>("/api/teacher/businesses/pending")
      .then(setPending)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!action) return;
    setAction({ ...action, saving: true, error: "" });
    try {
      const path = `/api/businesses/${action.id}/${action.kind}`;
      await api.post(path, { note: action.note || undefined });
      setAction(null);
      load();
    } catch (err) {
      setAction((prev) =>
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : "Failed" } : null,
      );
    }
  };

  if (loading) return <Spinner className="mt-20" />;

  return (
    <div>
      <PageHeader
        title="Business Approvals"
        description="Review and approve or reject student business registrations"
      />

      {error && <ErrorBanner message={error} />}

      {pending.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="All submitted businesses have been reviewed."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((b) => (
            <Card key={b.id}>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800">{b.name}</h3>
                      <Badge color="yellow">PENDING</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-1">
                      {b.team.name} · {b.team.cohort.name} · Submitted {formatDate(b.createdAt)}
                    </p>
                    {b.description && (
                      <p className="text-sm text-slate-700 mt-2">{b.description}</p>
                    )}
                    {b.team.members.length > 0 && (
                      <p className="text-xs text-slate-400 mt-2">
                        Members: {b.team.members.map((m) => m.user.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        setAction({ id: b.id, kind: "approve", note: "", saving: false, error: "" })
                      }
                      disabled={action?.id === b.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setAction({ id: b.id, kind: "reject", note: "", saving: false, error: "" })
                      }
                      disabled={action?.id === b.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                {action?.id === b.id && (
                  <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                    <Textarea
                      label={`Note for ${action.kind === "approve" ? "approval" : "rejection"} (optional)`}
                      value={action.note}
                      onChange={(e) => setAction({ ...action, note: e.target.value })}
                      rows={2}
                      placeholder="Optional feedback..."
                    />
                    {action.error && <p className="text-xs text-red-600">{action.error}</p>}
                    <div className="flex gap-2">
                      <Button
                        variant={action.kind === "approve" ? "primary" : "danger"}
                        disabled={action.saving}
                        onClick={() => void submit()}
                      >
                        {action.saving
                          ? "Saving…"
                          : action.kind === "approve"
                            ? "Confirm Approve"
                            : "Confirm Reject"}
                      </Button>
                      <Button variant="secondary" onClick={() => setAction(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
