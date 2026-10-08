import { Home, Map, Activity, History, Users, ShieldCheck, Info, LayoutDashboard, type LucideIcon } from 'lucide-react';
export interface NavItem { to: string; label: string; icon: LucideIcon; mobile?: boolean; adminOnly?: boolean }
export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: Home, mobile: true },
  { to: '/map', label: 'Map', icon: Map, mobile: true },
  { to: '/monitor', label: 'Monitor', icon: Activity, mobile: true },
  { to: '/history', label: 'History', icon: History, mobile: true },
  { to: '/contacts', label: 'Contacts', icon: Users, mobile: true },
  { to: '/privacy', label: 'Privacy', icon: ShieldCheck },
  { to: '/about', label: 'About', icon: Info },
  { to: '/admin', label: 'Admin console', icon: LayoutDashboard, mobile: true, adminOnly: true },
];
