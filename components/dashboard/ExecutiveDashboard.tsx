'use client';

import React from 'react';
import { useSuite } from '../../lib/suite-context';
import { formatCurrency, sumAmounts } from '../../lib/money';
import {
  DollarSign,
  TrendingUp,
  Users,
  CheckSquare,
  ArrowUpRight,
  Clock,
  Receipt,
  Kanban,
  FileText,
  AlertCircle,
} from 'lucide-react';

export function ExecutiveDashboard() {
  const {
    activeWorkspace,
    customers,
    leads,
    tasks,
    invoices,
    auditLogs,
    setActiveView,
    currentRole,
  } = useSuite();

  // Real calculated metrics from backend data
  const totalBilled = sumAmounts(invoices.map((i) => i.total));
  const totalPaid = sumAmounts(invoices.map((i) => i.paidAmount));
  const outstandingReceivables = sumAmounts(invoices.map((i) => i.balance));

  const openDeals = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
  const pipelineValue = sumAmounts(openDeals.map((l) => l.estimatedValue));

  const wonDeals = leads.filter((l) => l.stage === 'won');
  const wonValue = sumAmounts(wonDeals.map((l) => l.estimatedValue));

  const activeCustomers = customers.filter((c) => c.status === 'active');
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const urgentTasks = pendingTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {activeWorkspace.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
            <span>{activeWorkspace.industry}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Currency: <strong className="font-mono text-slate-700 font-semibold">{activeWorkspace.currency}</strong></span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Timezone: {activeWorkspace.timezone}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('invoices')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={() => setActiveView('leads')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Strip - Tabular Numerals, Clean Structure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Total Invoiced</span>
            <span className="p-1 rounded-md bg-slate-50 text-slate-600">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(totalBilled, activeWorkspace.currency)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
            <span className="text-emerald-700 font-mono font-medium">
              {formatCurrency(totalPaid, activeWorkspace.currency)}
            </span>
            <span>collected to date</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Outstanding Balance</span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
            {formatCurrency(outstandingReceivables, activeWorkspace.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Across {invoices.filter((i) => i.balance > 0).length} pending invoices
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Active Pipeline</span>
            <span className="p-1 rounded-md bg-cyan-50 text-cyan-700">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(pipelineValue, activeWorkspace.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {openDeals.length} active opportunities in progress
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Active Clients</span>
            <span className="p-1 rounded-md bg-slate-50 text-slate-600">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {activeCustomers.length}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {pendingTasks.length} operational tasks currently pending
          </div>
        </div>
      </div>

      {/* 2-Column Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pipeline Breakdown & Recent Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline Snapshot */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Pipeline Deal Distribution</h3>
                <p className="text-xs text-slate-500 mt-0.5">Live opportunities tracked by stage</p>
              </div>
              <button
                onClick={() => setActiveView('leads')}
                className="text-xs font-medium text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
              >
                <span>Kanban Board</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {(['lead', 'contacted', 'proposal', 'negotiation', 'won'] as const).map((stage) => {
                const stageDeals = leads.filter((l) => l.stage === stage);
                const stageVal = sumAmounts(stageDeals.map((l) => l.estimatedValue));
                const percent = pipelineValue > 0 ? Math.round((stageVal / (pipelineValue + wonValue || 1)) * 100) : 0;
                return (
                  <div key={stage} className="flex items-center justify-between text-xs">
                    <div className="w-28 capitalize font-medium text-slate-700">{stage}</div>
                    <div className="flex-1 mx-4 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-slate-800 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                      />
                    </div>
                    <div className="text-right w-24">
                      <span className="font-mono tabular-nums text-slate-900 font-medium">
                        {formatCurrency(stageVal, activeWorkspace.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({stageDeals.length})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recent Invoices</h3>
                <p className="text-xs text-slate-500 mt-0.5">Authoritative invoice ledger records</p>
              </div>
              <button
                onClick={() => setActiveView('invoices')}
                className="text-xs font-medium text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
              >
                <span>All Invoices</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2 px-3">Invoice</th>
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoices.slice(0, 4).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{inv.customerName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{inv.dueDate}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatCurrency(inv.balance, inv.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-sm capitalize font-medium ${
                            inv.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'partial'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : inv.status === 'overdue'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Urgent Tasks & Audit Stream */}
        <div className="space-y-6">
          {/* Urgent & High Priority Tasks */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Urgent Tasks</h3>
                <p className="text-xs text-slate-500 mt-0.5">{urgentTasks.length} require prompt attention</p>
              </div>
              <button
                onClick={() => setActiveView('tasks')}
                className="text-xs font-medium text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
              >
                <span>Task Board</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {urgentTasks.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                All high-priority milestones are completed.
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-900 leading-snug">
                        {t.title}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs font-semibold shrink-0 ${
                          t.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
                      <span>Due {t.dueDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>Assigned to {t.assignedToName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity & Audit Trail Stream */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Workspace Activity</h3>
              <button
                onClick={() => setActiveView('settings')}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Audit Log
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="py-2.5 text-xs">
                  <div className="text-slate-800 font-medium">{log.details}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                    <span>{log.userName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
