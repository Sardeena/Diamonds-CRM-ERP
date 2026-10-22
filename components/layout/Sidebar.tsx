'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ChevronDown,
  Building2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useSuite, ActiveView } from '../../lib/suite-context';
import { Role } from '../../types/diamond';
import { getRoleBadgeClass, getRoleDescription } from '../../lib/permissions';

export function Sidebar() {
  const {
    activeView,
    setActiveView,
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    currentRole,
    setCurrentRole,
    customers,
    leads,
    tasks,
    invoices,
    resetToDemoData,
    isLiveBackend,
  } = useSuite();

  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const openLeadsCount = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost').length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status !== 'paid' && i.status !== 'void').length;

  const navItems: Array<{ id: ActiveView; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customer CRM', icon: Users, badge: customers.length },
    { id: 'leads', label: 'Sales Pipeline', icon: Kanban, badge: openLeadsCount },
    { id: 'tasks', label: 'Work & Tasks', icon: CheckSquare, badge: pendingTasksCount },
    { id: 'orders', label: 'Orders & Retainers', icon: Package },
    { id: 'invoices', label: 'Invoices & Payments', icon: Receipt, badge: unpaidInvoicesCount },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  const roles: Role[] = ['owner', 'manager', 'employee', 'viewer'];

  return (
    <aside className="w-64 bg-[#0B192C] text-slate-200 flex flex-col shrink-0 h-screen border-r border-[#1E3E62] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#1E3E62]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-xs">
            <span className="font-bold text-sm tracking-tight">D</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white">Diamond Suite</h1>
            <p className="text-[11px] text-slate-400">Multi-Company OS</p>
          </div>
        </div>
      </div>

      {/* Workspace Selector Dropdown */}
      <div className="p-3 border-b border-[#1E3E62]/80">
        <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 mb-1.5">
          Active Workspace
        </label>
        <div className="relative">
          <button
            onClick={() => {
              setWorkspaceDropdownOpen(!workspaceDropdownOpen);
              setRoleDropdownOpen(false);
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#1E3E62]/60 hover:bg-[#1E3E62] border border-[#1E3E62] text-left transition-colors text-white"
            aria-expanded={workspaceDropdownOpen}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-medium truncate">{activeWorkspace.name}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {workspaceDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0F2238] border border-[#274E7B] rounded-lg shadow-xl overflow-hidden py-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Switch Company
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    setWorkspaceDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#1E3E62] transition-colors ${
                    ws.id === activeWorkspaceId ? 'text-cyan-400 font-semibold bg-[#1E3E62]/50' : 'text-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <div>{ws.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{ws.industry}</div>
                  </div>
                  {ws.id === activeWorkspaceId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Active
                    </span>
                  )}
                </button>
              ))}
              <div className="border-t border-[#1E3E62] my-1 pt-1">
                <button
                  onClick={() => {
                    setActiveView('settings');
                    setWorkspaceDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#1E3E62]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Configure Workspaces</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 mb-2">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-[#1E3E62]/40 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[#1E3E62] text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Security & Access Boundary Section */}
      <div className="p-3 border-t border-[#1E3E62] bg-[#081220]">
        {isLiveBackend ? (
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Live Session
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">PostgreSQL</span>
            </div>
            <div className="p-2.5 rounded-md bg-[#1E3E62]/40 border border-emerald-500/30 text-xs">
              <div className="text-white font-medium capitalize flex items-center justify-between">
                <span>Role: {currentRole}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Authoritative
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Derived from backend workspace membership and enforced by PostgreSQL RLS.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Sandbox RBAC
              </span>
              <span className="text-[10px] text-amber-400 font-mono">Offline</span>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setRoleDropdownOpen(!roleDropdownOpen);
                  setWorkspaceDropdownOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#1E3E62]/50 hover:bg-[#1E3E62] border border-[#1E3E62] text-xs text-white transition-colors"
              >
                <span className="capitalize font-medium">{currentRole} (Simulation)</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {roleDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 z-30 bg-[#0F2238] border border-[#274E7B] rounded-lg shadow-xl overflow-hidden py-1">
                  <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Simulate Role (Sandbox Only)
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setCurrentRole(r);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs capitalize hover:bg-[#1E3E62] transition-colors flex items-center justify-between ${
                        currentRole === r ? 'text-cyan-400 font-semibold bg-[#1E3E62]/50' : 'text-slate-300'
                      }`}
                    >
                      <span>{r}</span>
                      {currentRole === r && <span className="text-[10px] font-mono text-cyan-400">Current</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 px-1">
              {getRoleDescription(currentRole)}
            </p>

            {/* Demo reset button */}
            <button
              onClick={resetToDemoData}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Demo Sandbox</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
