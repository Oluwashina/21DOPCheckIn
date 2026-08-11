"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { homeForRole } from "./nav";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

/** Keeps members out of team/admin screens without flashing protected content. */
export function RoleGuard({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const { currentUser, loading } = useStore();
  const router = useRouter();
  const permitted = Boolean(currentUser && allow.includes(currentUser.role));

  useEffect(() => {
    if (loading || !currentUser) return;
    if (!permitted) router.replace(homeForRole(currentUser.role));
  }, [loading, currentUser, permitted, router]);

  if (!permitted) return null;
  return <>{children}</>;
}
