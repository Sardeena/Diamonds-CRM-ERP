/**
 * Tenant Isolation and Workspace Boundary Enforcement.
 * Ensures every record read or mutation is strictly verified against the active workspace ID.
 */

export interface TenantScoped {
  workspaceId: string;
}

export function filterByWorkspace<T extends TenantScoped>(items: T[], activeWorkspaceId: string): T[] {
  if (!activeWorkspaceId) return [];
  return items.filter((item) => item.workspaceId === activeWorkspaceId);
}

export function assertWorkspaceAccess<T extends TenantScoped>(
  record: T,
  activeWorkspaceId: string
): { authorized: boolean; reason?: string } {
  if (!activeWorkspaceId) {
    return { authorized: false, reason: 'No active workspace selected in session.' };
  }
  if (record.workspaceId !== activeWorkspaceId) {
    return {
      authorized: false,
      reason: `Tenant isolation violation: Record belongs to workspace "${record.workspaceId}" but active workspace is "${activeWorkspaceId}".`,
    };
  }
  return { authorized: true };
}

export function createTenantRecord<T extends object>(data: T, activeWorkspaceId: string): T & TenantScoped {
  if (!activeWorkspaceId) {
    throw new Error('Cannot create record without an active workspace context.');
  }
  return {
    ...data,
    workspaceId: activeWorkspaceId,
  };
}

/**
 * Validates that an associated foreign record (e.g., Customer on a Lead, or Order on an Invoice)
 * belongs to the same active workspace, preventing cross-tenant injection.
 */
export function validateEntityRelationship<T extends TenantScoped>(
  relatedEntity: T | null | undefined,
  activeWorkspaceId: string,
  entityTypeName: string
): { valid: boolean; reason?: string } {
  if (!relatedEntity) {
    return { valid: false, reason: `Referenced ${entityTypeName} not found.` };
  }
  if (relatedEntity.workspaceId !== activeWorkspaceId) {
    return {
      valid: false,
      reason: `Security Violation: Referenced ${entityTypeName} belongs to workspace "${relatedEntity.workspaceId}" but current active workspace is "${activeWorkspaceId}".`,
    };
  }
  return { valid: true };
}

