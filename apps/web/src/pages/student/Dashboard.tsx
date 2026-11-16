import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.ts";
import { formatPaise } from "../../lib/format.ts";
import {
  PageHeader, Card, CardHeader, StatCard, Badge, Button, Spinner, ErrorBanner, EmptyState,
} from "../../components/ui.tsx";

interface Team {
  teamId: string;
  cohortId: string;
  team: { name: string; cohort: { name: string } };
}
interface Business {
  id: string; name: string; status: string;
  team: { name: string; cohort: { name: string } };
}
interface Summary {
  revenue: number; cogs: number; grossProfit: number; operatingExpenses: number;
  netProfit: number; inventoryQuantity: number; inventoryValue: number;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING") return <Badge color="yellow">Pending Approval</Badge>;
  if (status === "APPROVED") return <Badge color="green">Approved</Badge>;
  if (status === "REJECTED") return <Badge color="red">Rejected</Badge>;
  return <Badge>{status}</Badge>;
}

export default function StudentDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Team[]>("/api/students/me/team"),
      api.get<Business[]>("/api/businesses"),
    ])
      .then(async ([t, b]) => {
        setTeams(t);
        setBusinesses(b);
        const approved = b.find((biz) => biz.status === "APPROVED");
        if (approved) {
          try {
            const s = await api.get<Summary>(`/api/businesses/${approved.id}/summary`);
            setSummary(s);
          } catch {}
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner className="mt-20" />;
  if (error) return <ErrorBanner message={error} />;

  const myTeam = teams[0];
  const myBusiness = businesses[0];

  if (!myTeam) {
    return (
      <div>
        <PageHeader title="Student Dashboard" />
        <EmptyState
          title="No team assigned"
          description="Your teacher will assign you to a team. Once assigned, you can register your business."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Business" description={`${myTeam.team.name} · ${myTeam.team.cohort.name}`} />

      {!myBusiness ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600 mb-4">Your team hasn't registered a business yet.</p>
          <Link to="/student/register-business">
            <Button>Register Your Business</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{myBusiness.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{myBusiness.team.name}</p>
              </div>
              <StatusBadge status={myBusiness.status} />
            </div>
          </Card>

          {myBusiness.status === "PENDING" && (
            <Card className="p-5 bg-amber-50 border-amber-200">
              <p className="text-sm text-amber-700 font-medium">⏳ Waiting for teacher approval</p>
              <p className="text-xs text-amber-600 mt-1">Your teacher needs to approve your business before you can record sales or add products.</p>
            </Card>
          )}

          {myBusiness.status === "REJECTED" && (
            <Card className="p-5 bg-red-50 border-red-200">
              <p className="text-sm text-red-700 font-medium">❌ Business registration was rejected</p>
              <p className="text-xs text-red-600 mt-1">Contact your teacher for feedback.</p>
            </Card>
          )}

          {myBusiness.status === "APPROVED" && summary && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Revenue" value={formatPaise(summary.revenue)} color="text-brand-600" />
                <StatCard label="COGS" value={formatPaise(summary.cogs)} />
                <StatCard label="Net Profit" value={formatPaise(summary.netProfit)} color={summary.netProfit >= 0 ? "text-brand-600" : "text-red-600"} />
                <StatCard label="Inventory Value" value={formatPaise(summary.inventoryValue)} color="text-brand-600" />
              </div>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Link to="/student/sale"><Button variant="primary">Record a Sale</Button></Link>
                  <Link to="/student/expense"><Button variant="secondary">Record an Expense</Button></Link>
                  <Link to="/student/products"><Button variant="outline">Products & Inventory</Button></Link>
                  <Link to="/student/financials"><Button variant="outline">Financial Summary</Button></Link>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
