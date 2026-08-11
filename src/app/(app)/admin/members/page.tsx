"use client";

import { useMemo, useState } from "react";

import { TrashIcon } from "@/components/icons";
import { Chips } from "@/components/SessionFilterChips";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SectionTitle,
  Select,
} from "@/components/ui";
import { getTeamById } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "team_lead", label: "Team Lead" },
  { value: "admin", label: "Admin" },
];

export default function AdminMembersPage() {
  const { db, updateUser, deleteUser } = useStore();
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const teams = useMemo(
    () => [...(db?.teams ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [db],
  );

  const people = useMemo(() => {
    if (!db) return [];
    const needle = query.trim().toLowerCase();
    return db.users
      .filter((user) => (teamFilter === "all" ? true : user.team_id === teamFilter))
      .filter(
        (user) =>
          needle === "" ||
          user.name.toLowerCase().includes(needle) ||
          user.email.toLowerCase().includes(needle) ||
          user.phone.includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db, query, teamFilter]);

  if (!db) return null;

  return (
    <div className="space-y-6 pb-4">
      <section>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-muted">
          {db.users.length} people · {db.users.filter((user) => user.active).length} active
        </p>
      </section>

      <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        People add themselves at the sign-up screen. Once they&apos;re in, set their team
        and promote leads from here.
      </p>

      <section>
        <div className="mb-3 space-y-2.5">
          <Input
            value={query}
            placeholder="Search by name, email or phone…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Chips
            options={[
              { value: "all", label: "All teams" },
              ...teams.map((team) => ({ value: team.id, label: team.name })),
            ]}
            value={teamFilter}
            onChange={setTeamFilter}
          />
        </div>

        <SectionTitle title="People" subtitle={`${people.length} shown`} />

        {people.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No members found"
            description="Try another search or clear the team filter."
          />
        ) : (
          <div className="space-y-2">
            {people.map((user) => {
              const team = getTeamById(db, user.team_id);
              const expanded = expandedId === user.id;

              return (
                <Card key={user.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() => setExpandedId(expanded ? null : user.id)}
                  >
                    <Avatar name={user.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">
                        {user.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {user.email || user.phone || "No contact"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={user.role === "member" ? "muted" : "magenta"}>
                        {ROLE_OPTIONS.find((option) => option.value === user.role)?.label}
                      </Badge>
                      <span className="text-[11px] text-faint">
                        {team?.name ?? "No team"}
                      </span>
                    </span>
                  </button>

                  {expanded ? (
                    <div className="mt-4 space-y-3 border-t border-line pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Service team">
                          <Select
                            value={user.team_id ?? ""}
                            onChange={(event) =>
                              void updateUser(user.id, {
                                team_id: event.target.value || null,
                              })
                            }
                          >
                            <option value="">No team</option>
                            {teams.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Role">
                          <Select
                            value={user.role}
                            onChange={(event) =>
                              void updateUser(user.id, {
                                role: event.target.value as Role,
                              })
                            }
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2.5 text-sm font-semibold">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-gold"
                            checked={user.active}
                            onChange={(event) =>
                              void updateUser(user.id, { active: event.target.checked })
                            }
                          />
                          Active
                        </label>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${user.name}? Their check-in history is deleted, and they could sign up again. To stop someone signing in, switch them to inactive instead.`,
                              )
                            ) {
                              void deleteUser(user.id);
                            }
                          }}
                        >
                          <TrashIcon width={15} height={15} />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
