import { Role } from '../types/diamond';

export type ActionKey =
  | 'manage_workspace_settings'
  | 'manage_team_members'
  | 'delete_customer'
  | 'archive_customer'
  | 'create_customer'
  | 'edit_customer'
  | 'export_customers'
  | 'create_lead'
  | 'edit_lead'
  | 'delete_lead'
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'create_order'
  | 'edit_order'
  | 'delete_order'
  | 'create_invoice'
  | 'edit_invoice'
  | 'record_payment'
  | 'delete_invoice'
  | 'view_financial_reports'
  | 'view_audit_logs';

const ROLE_PERMISSIONS: Record<Role, Set<ActionKey>> = {
  owner: new Set<ActionKey>([
    'manage_workspace_settings',
    'manage_team_members',
    'delete_customer',
    'archive_customer',
    'create_customer',
    'edit_customer',
    'export_customers',
    'create_lead',
    'edit_lead',
    'delete_lead',
    'create_task',
    'edit_task',
    'delete_task',
    'create_order',
    'edit_order',
    'delete_order',
    'create_invoice',
    'edit_invoice',
    'record_payment',
    'delete_invoice',
    'view_financial_reports',
    'view_audit_logs',
  ]),
  manager: new Set<ActionKey>([
    'manage_team_members',
    'archive_customer',
    'create_customer',
    'edit_customer',
    'export_customers',
    'create_lead',
    'edit_lead',
    'delete_lead',
    'create_task',
    'edit_task',
    'delete_task',
    'create_order',
    'edit_order',
    'create_invoice',
    'edit_invoice',
    'record_payment',
    'view_financial_reports',
    'view_audit_logs',
  ]),
  employee: new Set<ActionKey>([
    'create_customer',
    'edit_customer',
    'export_customers',
    'create_lead',
    'edit_lead',
    'create_task',
    'edit_task',
    'create_order',
    'edit_order',
    'view_financial_reports',
  ]),
  viewer: new Set<ActionKey>([
    // Viewers have read-only access to records, no mutations allowed
  ]),
};

export function hasPermission(role: Role, action: ActionKey): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.has(action) : false;
}

export function getRoleDescription(role: Role): string {
  switch (role) {
    case 'owner':
      return 'Full administrative authority: can configure business profile, manage billing, delete records, and invite staff.';
    case 'manager':
      return 'Operational supervisor: can manage staff, oversee leads, approve orders, and issue invoices.';
    case 'employee':
      return 'Staff member: can create and update assigned leads, tasks, customers, and orders.';
    case 'viewer':
      return 'Auditor / Observer: can browse records and view summaries without write or deletion access.';
  }
}

export function getRoleBadgeClass(role: Role): string {
  switch (role) {
    case 'owner':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'manager':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'employee':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'viewer':
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
