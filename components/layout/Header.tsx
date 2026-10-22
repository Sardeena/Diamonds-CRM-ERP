'use client';

import React from 'react';
import { useSuite } from '../../lib/suite-context';
import { Plus, Shield, Search, Lock } from 'lucide-react';

interface HeaderProps {
  onQuickAction?: () => void;
  quickActionLabel?: string;
}

export function Header({ onQuickAction, quickActionLabel }: HeaderProps) {
  const {
    activeView,
    activeWorkspace,
    currentRole,
    currentUser,
    isLiveBackend,
    setAuthModalOpen,
    signOut,
  } = useSuite();

  const viewTitles: Record<string, string> = {
    dashboard: 'Executive Dashboard',
    customers: 'Customer CRM & Directory',
    leads: 'Sales Pipeline & Opportunities',
    tasks: 'Work & Task Management',
    orders: 'Service Orders & Retainers',
    invoices: 'Invoices & Payment Records',
    settings: 'Workspace Settings & Access Control',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-4 lg:gap-8 px-6 shrink-0 z-10">
      {/* Zone 1: Contextual Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-slate-500 truncate max-w-48">
          {activeWorkspace.name}
        </span>
        <span className="text-slate-300" aria-hidden="true">
          /
        </span>
        <h2 className="text-sm font-semibold text-slate-900 truncate">
          {viewTitles[activeView] || 'Overview'}
        </h2>
      </div>

      {/* Zone 2: Backend & Tenant Scoping Indicator */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-md">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveBackend ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="font-medium text-[11px] text-slate-700">
            {isLiveBackend ? 'PostgreSQL RLS Active' : 'Sandbox Mode'}
          </span>
        </div>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-cyan-700" />
          <span className="font-mono text-[11px] text-slate-700">{activeWorkspace.slug}</span>
        </div>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <span className="capitalize font-medium text-slate-700">{currentRole}</span>
      </div>

      {/* Zone 3: Primary Action & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {onQuickAction && quickActionLabel && (
          <button
            onClick={onQuickAction}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>{quickActionLabel}</span>
          </button>
        )}

        {!isLiveBackend ? (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Sign In / Connect</span>
          </button>
        ) : (
          <button
            onClick={() => signOut()}
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            Sign Out
          </button>
        )}

        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#1E3E62] text-white flex items-center justify-center text-xs font-semibold">
            {currentUser.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-medium text-slate-900 leading-tight">{currentUser.fullName}</div>
            <div className="text-[10px] text-slate-500 capitalize">{currentRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
