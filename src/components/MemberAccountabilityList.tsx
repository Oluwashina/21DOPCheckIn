"use client";

import { CheckIcon, ShareIcon, ThumbIcon } from "./icons";
import { Avatar, EmptyState } from "./ui";
import { formatCheckInTime } from "@/lib/csv";
import type { MemberRow } from "@/lib/stats";

const COLUMNS = [
  { key: "checked_in", label: "Check-in", Icon: CheckIcon },
  { key: "shared_link", label: "Share", Icon: ShareIcon },
  { key: "liked_youtube", label: "Like", Icon: ThumbIcon },
] as const;

function Indicator({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
        active ? "bg-mint/15 text-mint" : "bg-surface-3 text-faint"
      }`}
      aria-label={active ? "Done" : "Not done"}
    >
      {active ? <CheckIcon width={14} height={14} strokeWidth={2.6} /> : "–"}
    </span>
  );
}

export function MemberAccountabilityList({
  rows,
  leadId,
  emptyTitle = "No members yet",
  emptyDescription,
  showCheckInTime = false,
}: {
  rows: MemberRow[];
  leadId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  showCheckInTime?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState icon="🙂" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      {/* Mobile: one card per member */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.user.id} className="card flex items-center gap-3 p-3.5">
            <Avatar name={row.user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight">
                {row.user.name}
                {row.user.id === leadId ? (
                  <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-magenta">
                    Lead
                  </span>
                ) : null}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] font-semibold">
                {COLUMNS.map((column) => (
                  <span
                    key={column.key}
                    className={row[column.key] ? "text-mint" : "text-faint"}
                  >
                    {row[column.key] ? "✓" : "○"} {column.label}
                  </span>
                ))}
              </p>
              {showCheckInTime && row.checked_in && row.checked_in_at ? (
                <p className="mt-1 text-[11px] text-muted">
                  Checked in at {formatCheckInTime(row.checked_in_at)}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Tablet and up: compact table */}
      <div className="card hidden overflow-hidden sm:block" >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-faint">
              <th className="px-4 py-3 text-left font-semibold">Member</th>
              {COLUMNS.map((column) => (
                <th key={column.key} className="px-3 py-3 text-center font-semibold">
                  {column.label}
                </th>
              ))}
              {showCheckInTime ? (
                <th className="px-4 py-3 text-right font-semibold">Checked in at</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.user.id}
                className="border-b border-line/60 last:border-0 hover:bg-surface-2/60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.user.name} size="sm" />
                    <span className="font-semibold">{row.user.name}</span>
                    {row.user.id === leadId ? (
                      <span className="rounded-full border border-magenta/30 bg-magenta/10 px-2 py-0.5 text-[10px] font-bold text-magenta">
                        Lead
                      </span>
                    ) : null}
                  </div>
                </td>
                {COLUMNS.map((column) => (
                  <td key={column.key} className="px-3 py-3 text-center">
                    <Indicator active={row[column.key]} />
                  </td>
                ))}
                {showCheckInTime ? (
                  <td className="px-4 py-3 text-right text-xs text-muted">
                    {row.checked_in && row.checked_in_at
                      ? formatCheckInTime(row.checked_in_at)
                      : "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
