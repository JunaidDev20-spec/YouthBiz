import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.ts";
import { formatDate } from "../../lib/format.ts";
import {
  PageHeader, StatCard, Card, CardHeader, Badge, Spinner, ErrorBanner, EmptyState, Button,
} from "../../components/ui.tsx";

interface Business {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  team: { name: string; cohort: { name: string } };
}

interface Cohort {
  id: string;
  name: string;
  _count: { teams: number; members: number };
}

function statusColor(s: string): "yellow" | "green" | "red" | "slate" {
  if (s === "PENDING") return "yellow";
  if (s === "APPROVED") return "green";
  if (s === "REJECTED" || s === "SUSPENDED") return "red";
  return "slate";
}

export default function TeacherDashboard() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [pending, setPending] = useState<Business[]>([]);
  const [all, setAll] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Cohort[]>("/api/cohorts"),
      api.get<Business[]>("/api/teacher/businesses/pending"),
      api.get<Business[]>("/api/businesses"),
    ])
      .then(([c, p, a]) => {
        setCohorts(c);
        setPending(p);
        setAll(a);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner className="mt-20" />;
  if (error) return <ErrorBanner message={error} />;

  const totalTeams = cohorts.reduce((s, c) => s + c._count.teams, 0);
  const approved = all.filter((b) => b.status === "APPROVED").length;

  return (
    <div>
      <PageHeader title="Teacher Dashboard" description={`Welcome back`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Cohorts" value={cohorts.length} />
        <StatCard label="Teams" value={totalTeams} />
        <StatCard label="Pending Approvals" value={pending.length} color="text-amber-600" />
        <StatCard label="Approved Businesses" value={approved} color="text-brand-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Pending Approvals"
            action={
              pending.length > 0 ? (
                <Link to="/teacher/approvals">
                  <Button size="sm" variant="outline">View all</Button>
                </Link>
              ) : undefined
            }
          />
          {pending.length === 0 ? (
            <EmptyState title="No pending approvals" description="All businesses have been reviewed." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.name}</p>
                    <p className="text-xs text-slate-500">
                      {b.team.name} · {b.team.cohort.name} · {formatDate(b.createdAt)}
                    </p>
                  </div>
                  <Link to="/teacher/approvals">
                    <Badge color="yellow">Review</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent Businesses" />
          {all.length === 0 ? (
            <EmptyState title="No businesses yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {all.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.name}</p>
                    <p className="text-xs text-slate-500">{b.team.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={statusColor(b.status)}>{b.status}</Badge>
                    <Link to={`/teacher/businesses/${b.id}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
