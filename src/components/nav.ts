import {
  ChartIcon,
  FlameIcon,
  GridIcon,
  HomeIcon,
  UserIcon,
  UsersIcon,
} from "./icons";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  /** Match nested routes (e.g. /admin/teams keeps "Teams" active). */
  exact?: boolean;
}

const MEMBER_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon, exact: true },
  { href: "/progress", label: "Progress", icon: FlameIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const TEAM_LEAD_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon, exact: true },
  { href: "/team", label: "Dashboard", icon: GridIcon, exact: true },
  { href: "/team/members", label: "My Team", icon: UsersIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

// The admin takes part in the programme too, so Home (their own check-in)
// leads. Sessions moves to a link on the dashboard to keep this to five tabs.
const ADMIN_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon, exact: true },
  { href: "/admin", label: "Dashboard", icon: GridIcon, exact: true },
  { href: "/admin/teams", label: "Teams", icon: UsersIcon },
  { href: "/admin/members", label: "Members", icon: UserIcon },
  { href: "/admin/reports", label: "Reports", icon: ChartIcon },
];

export function navForRole(role: Role): NavItem[] {
  if (role === "admin") return ADMIN_NAV;
  if (role === "team_lead") return TEAM_LEAD_NAV;
  return MEMBER_NAV;
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Everyone lands on their own check-in screen — including the admin. */
export function homeForRole(_role: Role): string {
  return "/";
}
