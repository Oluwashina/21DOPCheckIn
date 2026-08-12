"use client";

import { useMemo, useState } from "react";

import { AdminOnly } from "@/components/AdminOnly";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  ProgressBar,
  SectionTitle,
  Select,
} from "@/components/ui";
import { getTeamAttendanceRate, getTeamMembers } from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function AdminTeamsPage() {
  const { db, now, createTeam, updateTeam, deleteTeam } = useStore();
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftLead, setDraftLead] = useState("");

  const teams = useMemo(() => {
    if (!db) return [];
    return db.teams
      .map((team) => ({
        team,
        members: getTeamMembers(db, team.id),
        rate: getTeamAttendanceRate(db, team.id, now),
      }))
      .sort((a, b) => a.team.name.localeCompare(b.team.name));
  }, [db, now]);

  if (!db) return null;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!newTeamName.trim()) return;
    await createTeam(newTeamName);
    setNewTeamName("");
    setCreating(false);
  }

  return (
    <AdminOnly>
    <div className="space-y-6 pb-4">
      <section>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-muted">
          {teams.length} service teams · {db.users.length} people
        </p>
      </section>

      {creating ? (
        <Card>
          <form className="space-y-3" onSubmit={handleCreate}>
            <Field label="Team name">
              <Input
                autoFocus
                value={newTeamName}
                placeholder="e.g. Ushering"
                onChange={(event) => setNewTeamName(event.target.value)}
              />
            </Field>
            <div className="flex gap-2.5">
              <Button type="submit" fullWidth>
                Create team
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button fullWidth size="lg" onClick={() => setCreating(true)}>
          <PlusIcon width={18} height={18} />
          New team
        </Button>
      )}

      <section>
        <SectionTitle title="All teams" />
        {teams.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No teams yet"
            description="Create your first service team to start tracking accountability."
          />
        ) : (
          <div className="space-y-2.5">
            {teams.map(({ team, members, rate }) => {
              const lead = members.find((user) => user.id === team.team_lead_id);
              const isEditing = editingId === team.id;

              return (
                <Card key={team.id}>
                  {isEditing ? (
                    <form
                      className="space-y-3"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await updateTeam(team.id, {
                          name: draftName.trim() || team.name,
                          team_lead_id: draftLead || null,
                        });
                        setEditingId(null);
                      }}
                    >
                      <Field label="Team name">
                        <Input
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                        />
                      </Field>
                      <Field label="Team lead">
                        <Select
                          value={draftLead}
                          onChange={(event) => setDraftLead(event.target.value)}
                        >
                          <option value="">No lead assigned</option>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <div className="flex gap-2.5">
                        <Button type="submit" fullWidth>
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          fullWidth
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[17px] font-bold">{team.name}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge tone="muted">{members.length} members</Badge>
                            {lead ? (
                              <Badge tone="magenta">Lead · {lead.name}</Badge>
                            ) : (
                              <Badge tone="rose">No lead</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            aria-label={`Edit ${team.name}`}
                            className="rounded-xl border border-line bg-surface-2 p-2 text-muted transition-colors hover:text-text"
                            onClick={() => {
                              setEditingId(team.id);
                              setDraftName(team.name);
                              setDraftLead(team.team_lead_id ?? "");
                            }}
                          >
                            <EditIcon width={16} height={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${team.name}`}
                            className="rounded-xl border border-rose/30 bg-rose/10 p-2 text-rose transition-colors hover:bg-rose/20"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete ${team.name}? Members will be unassigned but keep their history.`,
                                )
                              ) {
                                void deleteTeam(team.id);
                              }
                            }}
                          >
                            <TrashIcon width={16} height={16} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <ProgressBar value={rate} label="Attendance" />
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
    </AdminOnly>
  );
}
