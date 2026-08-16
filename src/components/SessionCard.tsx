"use client";

import Link from "next/link";

import { CheckIcon, ChevronRightIcon, ClockIcon, ShareIcon, ThumbIcon } from "./icons";
import { Badge, LiveDot } from "./ui";
import { SESSION_STATUS_LABEL, shortTimeLabel } from "@/lib/program";
import type { CheckIn, Session, SessionStatus } from "@/lib/types";

const ITEMS = [
  { key: "checked_in", label: "Checked in", Icon: CheckIcon },
  { key: "shared_link", label: "Shared", Icon: ShareIcon },
  { key: "liked_youtube", label: "Liked", Icon: ThumbIcon },
] as const;

export function SessionCard({
  session,
  status,
  checkIn,
  teamSummary,
}: {
  session: Session;
  status: SessionStatus;
  checkIn?: CheckIn;
  /** Optional roll-up shown to leads/admins, e.g. "18/24 checked in". */
  teamSummary?: string;
}) {
  const isLive = status === "live";
  const done = Boolean(checkIn?.checked_in);
  /** Before a session starts we show the time rather than three empty ticks. */
  const waiting = status === "upcoming" && !checkIn;

  return (
    <Link
      href={`/session/${session.id}`}
      className={`group relative block overflow-hidden rounded-[1.25rem] border p-4 transition-all duration-200 active:scale-[0.99] sm:p-5 ${
        isLive
          ? "border-gold/45 bg-surface glow-gold"
          : "border-line bg-surface hover:border-line/80 hover:bg-surface-2"
      }`}
    >
      {isLive ? (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gold-gradient" />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {isLive ? (
              <Badge tone="gold">
                <LiveDot />
                Live now
              </Badge>
            ) : status === "completed" ? (
              <Badge tone={done ? "mint" : "muted"}>
                {done ? <CheckIcon width={12} height={12} /> : null}
                {done ? "Checked in" : SESSION_STATUS_LABEL[status]}
              </Badge>
            ) : (
              <Badge tone="magenta">
                <ClockIcon width={12} height={12} />
                Upcoming
              </Badge>
            )}
            <span className="text-xs font-semibold text-faint">
              {shortTimeLabel(session.time)}
            </span>
          </div>

          <h3 className="text-[17px] font-bold leading-snug tracking-tight sm:text-lg">
            {session.name}
          </h3>

          {teamSummary ? (
            <p className="mt-1 text-xs text-muted">{teamSummary}</p>
          ) : null}
        </div>

        <span
          className={`mt-1 shrink-0 rounded-full p-1.5 transition-colors ${
            isLive ? "bg-gold/15 text-gold-soft" : "text-faint group-hover:text-muted"
          }`}
        >
          <ChevronRightIcon width={18} height={18} />
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {waiting ? (
          <span className="text-xs text-muted">
            Starts at {shortTimeLabel(session.time)}. We&apos;ll be ready.
          </span>
        ) : (
          ITEMS.map(({ key, label, Icon }) => {
            const active = Boolean(checkIn?.[key]);
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  active
                    ? "border-mint/30 bg-mint/10 text-mint"
                    : "border-line bg-surface-2 text-faint"
                }`}
              >
                <Icon width={12} height={12} />
                {active ? label : `Not ${label.toLowerCase()}`}
              </span>
            );
          })
        )}
      </div>

      {!waiting && !done ? (
        <p className="mt-3 text-sm font-semibold text-gold-soft">
          {isLive ? "Check in now →" : "Check in when you're ready →"}
        </p>
      ) : null}
    </Link>
  );
}
