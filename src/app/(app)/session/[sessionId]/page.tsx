"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Celebration } from "@/components/Celebration";
import {
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  ShareIcon,
  ThumbIcon,
} from "@/components/icons";
import { Badge, Button, Card, LiveDot } from "@/components/ui";
import {
  formatLongDate,
  getSessionStatus,
  PROGRAM_LENGTH,
  shortTimeLabel,
  todayISO,
} from "@/lib/program";
import { findCheckIn, getDayById, getSessionById } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { AccountabilityKey, CheckInInput } from "@/lib/types";

const ITEMS: {
  key: AccountabilityKey;
  label: string;
  hint: string;
  Icon: typeof CheckIcon;
}[] = [
  {
    key: "checked_in",
    label: "I'm checked in",
    hint: "I attended or watched this session",
    Icon: CheckIcon,
  },
  {
    key: "shared_link",
    label: "I've shared the session/link",
    hint: "Sent it to someone or posted it",
    Icon: ShareIcon,
  },
  {
    key: "liked_youtube",
    label: "I've liked the YouTube page",
    hint: "Liked the video or the channel",
    Icon: ThumbIcon,
  },
];

export default function SessionCheckInPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { db, currentUser, now, saveCheckIn } = useStore();

  const context = useMemo(() => {
    if (!db || !currentUser) return null;
    const session = getSessionById(db, params.sessionId);
    if (!session) return null;
    const day = getDayById(db, session.day_id);
    if (!day) return null;

    return {
      session,
      day,
      status: getSessionStatus(day, session, now),
      existing: findCheckIn(db, currentUser.id, session.id),
    };
  }, [db, currentUser, params.sessionId, now]);

  const [draft, setDraft] = useState<CheckInInput | null>(null);
  const [saved, setSaved] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!db || !currentUser) return null;

  if (!context) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <p className="text-lg font-bold">Session not found</p>
        <p className="mt-1 text-sm text-muted">
          It may have been removed from the programme.
        </p>
        <Button className="mt-5" onClick={() => router.push("/")}>
          Back to today
        </Button>
      </div>
    );
  }

  const { session, day, status, existing } = context;
  const values: CheckInInput = draft ?? {
    checked_in: Boolean(existing?.checked_in),
    shared_link: Boolean(existing?.shared_link),
    liked_youtube: Boolean(existing?.liked_youtube),
  };

  const isFutureDay = day.date > todayISO();
  const alreadySubmitted = Boolean(existing);
  const nothingTicked = !values.checked_in && !values.shared_link && !values.liked_youtube;
  const showSuccess = Boolean(
    values.checked_in && (saved || (alreadySubmitted && !draft)),
  );

  function toggle(key: AccountabilityKey) {
    setSaved(false);
    setDraft({ ...values, [key]: !values[key] });
  }

  async function submit() {
    setSaving(true);
    await saveCheckIn(session.id, values);
    setSaving(false);
    setDraft(null);
    setSaved(true);
    if (values.checked_in) {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1200);
    }
  }

  const completedCount = Object.values(values).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-lg pb-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-text"
      >
        <ChevronLeftIcon width={16} height={16} />
        Today
      </Link>

      <div className="mb-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <Badge tone="muted">
            Day {day.day_number} of {PROGRAM_LENGTH}
          </Badge>
          {status === "live" ? (
            <Badge tone="gold">
              <LiveDot />
              Live now
            </Badge>
          ) : status === "upcoming" ? (
            <Badge tone="magenta">
              <ClockIcon width={12} height={12} />
              Starts {shortTimeLabel(session.time)}
            </Badge>
          ) : (
            <Badge tone="muted">
              <ClockIcon width={12} height={12} />
              {shortTimeLabel(session.time)}
            </Badge>
          )}
        </div>
        <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-tight">
          Check in for
          <br />
          <span className="text-gradient-gold">{session.name}</span>
        </h1>
        <p className="mt-2 text-sm text-muted">{formatLongDate(day.date)}</p>
      </div>

      {isFutureDay ? (
        <Card className="text-center">
          <p className="text-[15px] font-semibold">This session hasn&apos;t opened yet</p>
          <p className="mt-1 text-sm text-muted">
            Check-in unlocks on day {day.day_number}. Come back then. We&apos;ll be
            waiting. 🔥
          </p>
        </Card>
      ) : (
        <>
          <div className="relative">
            {celebrate ? <Celebration /> : null}

            {showSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="card mb-4 overflow-hidden p-5 text-center"
              >
                <motion.div
                  initial={{ scale: 0.4, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 16 }}
                  className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient glow-gold"
                >
                  <CheckIcon width={30} height={30} strokeWidth={2.6} className="text-ink" />
                </motion.div>
                <p className="text-xl font-extrabold tracking-tight">
                  You&apos;re checked in! 🔥
                </p>
                <p className="mt-1 text-sm text-muted">
                  {completedCount === 3
                    ? "All three done. You're building serious momentum."
                    : "Nice one. You can tick the rest whenever you're ready."}
                </p>
              </motion.div>
            ) : null}

            <div className="space-y-2.5">
              {ITEMS.map(({ key, label, hint, Icon }) => {
                const active = values[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3.5 rounded-[1.25rem] border p-4 text-left transition-all duration-200 active:scale-[0.99] ${
                      active
                        ? "border-gold/45 bg-gold/10"
                        : "border-line bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                        active
                          ? "bg-gold-gradient text-ink"
                          : "bg-surface-3 text-faint"
                      }`}
                    >
                      <Icon width={20} height={20} strokeWidth={active ? 2.4 : 1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-tight">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        active
                          ? "border-gold bg-gold text-ink"
                          : "border-line bg-transparent"
                      }`}
                    >
                      {active ? (
                        <CheckIcon width={14} height={14} strokeWidth={3} />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-faint">
            You can check in without sharing or liking. Tick those whenever you get to
            them.
          </p>

          <div className="mt-5 space-y-2.5">
            <Button
              size="lg"
              fullWidth
              onClick={submit}
              disabled={
                saving || (!draft && alreadySubmitted) || (!alreadySubmitted && nothingTicked)
              }
            >
              {saving
                ? "Saving…"
                : alreadySubmitted
                  ? draft
                    ? "Update check-in"
                    : "Saved"
                  : "Submit check-in"}
            </Button>
            {showSuccess ? (
              <Button variant="secondary" size="lg" fullWidth onClick={() => router.push("/")}>
                Back to today
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
