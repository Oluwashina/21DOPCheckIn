"use client";

import { useMemo, useState } from "react";

import { PlusIcon, TrashIcon } from "@/components/icons";
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
  const { db, createUser, updateUser, deleteUser } = useStore();
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", team_id: "", role: "member" as Role });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.contact.trim()) {
      setError("Name and a contact detail are required.");
      return;
    }
    await createUser({
      name: form.name,
      email: form.contact.includes("@") ? form.contact : "",
      phone: form.contact.includes("@") ? "" : form.contact,
      team_id: form.team_id || null,
      role: form.role,
    });
    setForm({ name: "", contact: "", team_id: "", role: "member" });
    setAdding(false);
  }

  return (
    <div className="space-y-6 pb-4">
      <section>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-muted">
          {db.users.length} people · {db.users.filter((user) => user.active).length} active
        </p>
      </section>

      {adding ? (
        <Card>
          <form className="space-y-3" onSubmit={handleAdd}>
            <Field label="Full name">
              <Input
                autoFocus
                value={form.name}
                placeholder="Jane Doe"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Email or phone number">
              <Input
                value={form.contact}
                placeholder="jane@thenewchurch.org"
                onChange={(event) => setForm({ ...form, contact: event.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Service team">
                <Select
                  value={form.team_id}
                  onChange={(event) => setForm({ ...form, team_id: event.target.value })}
                >
                  <option value="">No team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Role">
                <Select
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value as Role })
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
            {error ? <p className="text-sm text-rose">{error}</p> : null}
            <div className="flex gap-2.5">
              <Button type="submit" fullWidth>
                Add member
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button fullWidth size="lg" onClick={() => setAdding(true)}>
          <PlusIcon width={18} height={18} />
          Add member
        </Button>
      )}

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
                            className="h-5 w-5 accent-[color:var(--color-gold)]"
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
                                `Remove ${user.name}? Their check-in history will be deleted.`,
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
