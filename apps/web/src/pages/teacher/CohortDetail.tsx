import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api.ts";
import { formatDate, formatDateTime } from "../../lib/format.ts";
import {
  PageHeader, Card, CardHeader, Button, Input, Select, Badge, Spinner,
  ErrorBanner, EmptyState, Td, Th, Table,
} from "../../components/ui.tsx";

interface Cohort {
  id: string;
  name: string;
  createdAt: string;
  _count: { teams: number; members: number };
}

interface Team {
  id: string;
  name: string;
  _count: { members: number; businesses: number };
}

interface TeamMember {
  id: string;
  user: { id: string; name: string; username: string; role: string };
  joinedAt: string;
}

interface Invitation {
  id: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  teamId: string | null;
}

type Tab = "teams" | "invitations";

export default function CohortDetail() {
  const { id: cohortId } = useParams<{ id: string }>();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("teams");

  // Team form
  const [newTeamName, setNewTeamName] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");

  // Invitation form
  const [invTeamId, setInvTeamId] = useState("");
  const [invHours, setInvHours] = useState("72");
  const [savingInv, setSavingInv] = useState(false);
  const [invError, setInvError] = useState("");
  const [newToken, setNewToken] = useState("");
  const [copied, setCopied] = useState(false);

  // Members panel
  const [viewingTeamId, setViewingTeamId] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const load = useCallback(() => {
    if (!cohortId) return;
    setLoading(true);
    Promise.all([
      api.get<Cohort>(`/api/cohorts/${cohortId}`),
      api.get<Team[]>(`/api/cohorts/${cohortId}/teams`),
      api.get<Invitation[]>(`/api/cohorts/${cohortId}/invitations`),
    ])
      .then(([c, t, i]) => { setCohort(c); setTeams(t); setInvitations(i); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => { load(); }, [load]);

  const viewMembers = async (teamId: string) => {
    if (viewingTeamId === teamId) { setViewingTeamId(""); return; }
    setViewingTeamId(teamId);
    setMembersLoading(true);
    try {
      const m = await api.get<TeamMember[]>(`/api/teams/${teamId}/members`);
      setMembers(m);
    } catch {}
    finally { setMembersLoading(false); }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !cohortId) return;
    setSavingTeam(true); setTeamError("");
    try {
      await api.post(`/api/cohorts/${cohortId}/teams`, { name: newTeamName.trim() });
      setNewTeamName("");
      load();
    } catch (err) { setTeamError(err instanceof Error ? err.message : "Failed"); }
    finally { setSavingTeam(false); }
  };

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohortId) return;
    setSavingInv(true); setInvError(""); setNewToken("");
    try {
      const res = await api.post<{ invitation: Invitation; token: string }>(
        `/api/cohorts/${cohortId}/invitations`,
        { teamId: invTeamId || undefined, expiresInHours: parseInt(invHours) || 72 },
      );
      setNewToken(res.token);
      load();
    } catch (err) { setInvError(err instanceof Error ? err.message : "Failed"); }
    finally { setSavingInv(false); }
  };

  const copyToken = () => {
    void navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const invStatus = (inv: Invitation) => {
    if (inv.redeemedAt) return <Badge color="slate">Redeemed</Badge>;
    if (new Date(inv.expiresAt) < new Date()) return <Badge color="red">Expired</Badge>;
    return <Badge color="green">Active</Badge>;
  };

  if (loading) return <Spinner className="mt-20" />;
  if (error) return <ErrorBanner message={error} />;
  if (!cohort) return <ErrorBanner message="Cohort not found" />;

  return (
    <div>
      <PageHeader
        title={cohort.name}
        description={`${cohort._count.teams} teams · ${cohort._count.members} members`}
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {(["teams", "invitations"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
              tab === t
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Teams tab */}
      {tab === "teams" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Create Team</h3>
            <form onSubmit={createTeam} className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  label="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Team Alpha"
                  required
                />
                {teamError && <p className="mt-1 text-xs text-red-600">{teamError}</p>}
              </div>
              <Button type="submit" disabled={savingTeam}>
                {savingTeam ? "Creating…" : "Create Team"}
              </Button>
            </form>
          </Card>

          {teams.length === 0 ? (
            <EmptyState title="No teams yet" description="Create a team to get started." />
          ) : (
            teams.map((team) => (
              <Card key={team.id}>
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{team.name}</p>
                    <p className="text-xs text-slate-500">
                      {team._count.members} members · {team._count.businesses} businesses
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void viewMembers(team.id)}
                  >
                    {viewingTeamId === team.id ? "Hide Members" : "View Members"}
                  </Button>
                </div>
                {viewingTeamId === team.id && (
                  <div className="border-t border-slate-100 px-5 py-3">
                    {membersLoading ? (
                      <Spinner className="h-8" />
                    ) : members.length === 0 ? (
                      <p className="text-sm text-slate-500 py-2">No members yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {members.map((m) => (
                          <li key={m.id} className="text-sm flex items-center gap-2">
                            <span className="font-medium text-slate-700">{m.user.name}</span>
                            <span className="text-slate-400">(@{m.user.username})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Invitations tab */}
      {tab === "invitations" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Create Invitation</h3>
            <form onSubmit={createInvitation} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Assign to team (optional)"
                  value={invTeamId}
                  onChange={(e) => setInvTeamId(e.target.value)}
                >
                  <option value="">— No team assignment —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
                <Input
                  label="Expires in (hours)"
                  type="number"
                  min="1"
                  max="720"
                  value={invHours}
                  onChange={(e) => setInvHours(e.target.value)}
                />
              </div>
              {invError && <p className="text-xs text-red-600">{invError}</p>}
              <Button type="submit" disabled={savingInv}>
                {savingInv ? "Creating…" : "Create Invitation"}
              </Button>
            </form>

            {newToken && (
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
                <p className="text-xs font-semibold text-brand-700 mb-2">
                  Invitation token (share with student — shown only once)
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white border border-brand-200 px-3 py-2 text-xs font-mono text-slate-800 break-all">
                    {newToken}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyToken}>
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {invitations.length === 0 ? (
            <EmptyState title="No invitations yet" />
          ) : (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <Th>Created</Th>
                    <Th>Expires</Th>
                    <Th>Team</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <Td>{formatDate(inv.createdAt)}</Td>
                      <Td>{formatDateTime(inv.expiresAt)}</Td>
                      <Td>{teams.find((t) => t.id === inv.teamId)?.name ?? "—"}</Td>
                      <Td>{invStatus(inv)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
