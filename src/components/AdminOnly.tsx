"use client";

import type { ReactNode } from "react";

import { RoleGuard } from "./RoleGuard";

/** Full admin screens — not for the reports-only role. */
export function AdminOnly({ children }: { children: ReactNode }) {
  return <RoleGuard allow={["admin"]}>{children}</RoleGuard>;
}
