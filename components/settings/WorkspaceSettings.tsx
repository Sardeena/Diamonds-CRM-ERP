'use client';

import React, { useState } from 'react';
import { useSuite } from '../../lib/suite-context';
import { Role } from '../../types/diamond';
import { getRoleBadgeClass, getRoleDescription } from '../../lib/permissions';
import { assertWorkspaceAccess } from '../../lib/tenant';
import { Modal } from '../ui/Modal';
import {
  Settings,
  Users,
  ShieldCheck,
  Building,
  Plus,
  Lock,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export function WorkspaceSettings() {
  const {
    activeWorkspace,
    workspaces,
    workspaceMembers,
    currentRole,
    currentUser,
    updateWorkspaceSettings,
    inviteTeamMember,
    updateMemberRole,
    createWorkspace,
    auditLogs,
    can,
    customers,
  } = useSuite();

  // Settings Form State
  const [name, setName] = useState(activeWorkspace.name);
  const [industry, setIndustry] = useState(activeWorkspace.industry);
  const [currency, setCurrency] = useState(activeWorkspace.currency);
  const [timezone, setTimezone] = useState(activeWorkspace.timezone);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('employee');
  const [inviteTitle, setInviteTitle] = useState('');

  // Create Workspace Modal State
  const [isNewWsModalOpen, setIsNewWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsIndustry, setNewWsIndustry] = useState('Professional Services');
  const [newWsCurrency, setNewWsCurrency] = useState('USD');

  // Tenant Isolation Security Test State
  const [isolationTestResult, setIsolationTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    targetTenant: string;
  } | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('manage_workspace_settings')) return;
    updateWorkspaceSettings({
      name,
      industry,
      currency,
      timezone,
    });
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;
    inviteTeamMember(inviteEmail, inviteName, inviteRole, inviteTitle);
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteName('');
    setInviteTitle('');
  };

  const handleCreateWsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createWorkspace(newWsName.trim(), newWsIndustry, newWsCurrency);
    setIsNewWsModalOpen(false);
    setNewWsName('');
  };

  // Run interactive isolation verification test
  const runIsolationTest = () => {
    const foreignWs = workspaces.find((w) => w.id !== activeWorkspace.id);
    if (!foreignWs) {
      setIsolationTestResult({
        tested: true,
        success: false,
        message: 'No secondary tenant workspace found to test isolation against.',
        targetTenant: 'N/A',
      });
      return;
    }

    // Simulate cross-tenant record tampering attempt
    const foreignRecord = {
      id: 'cust-foreign-test',
      workspaceId: foreignWs.id,
      name: 'Tampered Customer Payload',
    };

    const check = assertWorkspaceAccess(foreignRecord, activeWorkspace.id);

    if (!check.authorized) {
      setIsolationTestResult({
        tested: true,
        success: true,
        message: `PASSED: Enforced. Cross-tenant mutation was successfully rejected by security policy. (${check.reason})`,
        targetTenant: foreignWs.name,
      });
    } else {
      setIsolationTestResult({
        tested: true,
        success: false,
        message: 'FAILED: Cross-tenant isolation violation occurred.',
        targetTenant: foreignWs.name,
      });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Workspace Settings & Security</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure business profile, staff roles, and inspect tenant security policies
        </p>
      </div>

      {/* Business Profile Settings */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Company Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">Basic identity and operational localization</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">ID: {activeWorkspace.id}</span>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company / Workspace Name</label>
              <input
                type="text"
                disabled={!can('manage_workspace_settings')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Industry Sector</label>
              <input
                type="text"
                disabled={!can('manage_workspace_settings')}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Base Currency</label>
              <select
                disabled={!can('manage_workspace_settings')}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50"
              >
                <option value="USD">US Dollar (USD, $)</option>
                <option value="EUR">Euro (EUR, €)</option>
                <option value="GBP">British Pound (GBP, £)</option>
                <option value="EGP">Egyptian Pound (EGP, E£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Timezone</label>
              <input
                type="text"
                disabled={!can('manage_workspace_settings')}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          {can('manage_workspace_settings') ? (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Save Profile Changes
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Note: Only the workspace Owner has permission to edit company profile settings.
            </p>
          )}
        </form>
      </div>

      {/* Team Roster & Role-Based Access Control */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Staff & Access Permissions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforce role-based access control (Owner, Manager, Employee, Viewer)
            </p>
          </div>
          {can('manage_team_members') && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Invite Staff</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {workspaceMembers.map((member) => (
            <div key={member.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-semibold text-xs border border-slate-200">
                  {member.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{member.user.fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{member.user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 hidden sm:inline">{member.user.title}</span>
                {can('manage_team_members') ? (
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id, e.target.value as Role)}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white capitalize font-medium text-slate-800 focus:outline-hidden"
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-sm capitalize font-medium border ${getRoleBadgeClass(
                      member.role
                    )}`}
                  >
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Isolation Security Inspection */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-700" />
              <h2 className="text-sm font-semibold text-slate-900">Tenant Isolation Verification</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verify that cross-company data access and mutation attempts are strictly denied.
            </p>
          </div>
          <button
            onClick={runIsolationTest}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300/70"
          >
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Run Security Test</span>
          </button>
        </div>

        {isolationTestResult && (
          <div
            className={`p-3 rounded-lg border text-xs mt-3 flex items-start gap-2.5 ${
              isolationTestResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {isolationTestResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">Target: {isolationTestResult.targetTenant}</div>
              <div className="mt-0.5 leading-relaxed">{isolationTestResult.message}</div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Trail */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Audit Log History</h2>
        <p className="text-xs text-slate-500 mb-4">
          Immutable audit record of operational, financial, and user actions in {activeWorkspace.name}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {auditLogs.slice(0, 8).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                    {log.userName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-sm">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Staff Member"
        description={`Grant access to ${activeWorkspace.name}`}
      >
        <form onSubmit={handleInviteSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alexander Hamilton"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="alex@acme.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role Permission</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
                <option value="viewer">Viewer (Read-Only)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                placeholder="Senior Designer"
                value={inviteTitle}
                onChange={(e) => setInviteTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-1">{getRoleDescription(inviteRole)}</p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
