import type { AppRole } from '@/hooks/useUserRole';

/**
 * Role -> role_template collapse, per the taxonomy audit:
 * super_admin+admin -> owner_admin, manager -> back_office_manager,
 * technician/lead_tech/installer/helper -> tech.
 */
export type RoleTemplate = 'owner_admin' | 'back_office_manager' | 'tech';

export function toRoleTemplate(role: AppRole | null): RoleTemplate | null {
  if (!role) return null;
  if (role === 'super_admin' || role === 'admin') return 'owner_admin';
  if (role === 'manager') return 'back_office_manager';
  return 'tech'; // technician | lead_tech | installer | helper
}

export const ROLE_LABEL: Record<RoleTemplate, string> = {
  owner_admin: 'Owner / Admin',
  back_office_manager: 'Back-Office Manager',
  tech: 'Tech',
};

export type BlockId =
  | 'workedge_board'
  | 'crm_pipeline'
  | 'ar_collections'
  | 'analytics'
  | 'messages'
  | 'approvals'
  | 'social_posting'
  | 'job_documentation'
  | 'material_requests';

/**
 * Client-side placeholder for what will become a real query against
 * permission_grants / get_effective_dashboard_layout() once the
 * permission-taxonomy and dashboard_layouts migrations land. Mirrors the
 * seed in supabase/migrations/_draft_dashboard_layouts_schema.sql exactly —
 * update both together until that migration replaces this constant.
 *
 * Confirmed with client 2026-08-27: Back-Office Manager gets Social Posting
 * by default; Approvals stays owner_admin-only.
 */
export const ROLE_BLOCKS: Record<RoleTemplate, BlockId[]> = {
  owner_admin: ['workedge_board', 'crm_pipeline', 'ar_collections', 'analytics', 'messages', 'approvals', 'social_posting', 'job_documentation', 'material_requests'],
  back_office_manager: ['workedge_board', 'crm_pipeline', 'ar_collections', 'messages', 'analytics', 'social_posting', 'job_documentation', 'material_requests'],
  tech: ['workedge_board', 'messages', 'job_documentation', 'material_requests'],
};

export function canSeeBlock(roleTemplate: RoleTemplate | null, block: BlockId | null): boolean {
  if (!block) return true; // always-visible items (Dashboard, Settings)
  if (!roleTemplate) return false;
  return ROLE_BLOCKS[roleTemplate].includes(block);
}

export interface TradeOSNavItem {
  id: string;
  label: string;
  path: string; // relative to /admin/trade-os
  block: BlockId | null;
  group: 'Command' | 'Modules' | 'System';
}

export const TRADE_OS_NAV: TradeOSNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '', block: null, group: 'Command' },
  { id: 'foreman', label: 'Foreman AI', path: 'foreman', block: null, group: 'Command' },
  { id: 'crm', label: 'Core CRM', path: 'crm', block: 'crm_pipeline', group: 'Modules' },
  { id: 'workedge', label: 'WorkEdge', path: 'workedge', block: 'workedge_board', group: 'Modules' },
  { id: 'ottopay', label: 'OttoPay', path: 'ottopay', block: 'ar_collections', group: 'Modules' },
  { id: 'social', label: 'Social Posting', path: 'social', block: 'social_posting', group: 'Modules' },
  { id: 'reporting', label: 'Reporting', path: 'reporting', block: 'job_documentation', group: 'Modules' },
  { id: 'messages', label: 'Messages', path: 'messages', block: 'messages', group: 'Modules' },
  { id: 'analytics', label: 'Analytics', path: 'analytics', block: 'analytics', group: 'System' },
  { id: 'settings', label: 'Settings', path: 'settings', block: null, group: 'System' },
];
