'use client';

import React, { useState, useMemo } from 'react';
import { useSuite } from '../../lib/suite-context';
import { Lead, LeadStage } from '../../types/diamond';
import { formatCurrency, sumAmounts } from '../../lib/money';
import { Modal } from '../ui/Modal';
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Calendar,
  User,
  Building,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Trash2,
  Edit,
} from 'lucide-react';

export function SalesPipeline() {
  const {
    leads,
    customers,
    activeWorkspace,
    workspaceMembers,
    createLead,
    updateLead,
    moveLeadStage,
    deleteLead,
    can,
  } = useSuite();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Form State
  const [formData, setFormData] = useState(() => ({
    customerId: '',
    title: '',
    source: 'Referral',
    stage: 'lead' as LeadStage,
    estimatedValue: 15000,
    expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    assignedToUserId: '',
    notes: '',
  }));

  const stages: Array<{ id: LeadStage; title: string; color: string }> = [
    { id: 'lead', title: 'New Leads', color: 'border-slate-300' },
    { id: 'contacted', title: 'Contacted', color: 'border-blue-400' },
    { id: 'proposal', title: 'Proposal Sent', color: 'border-purple-400' },
    { id: 'negotiation', title: 'Negotiation', color: 'border-amber-400' },
    { id: 'won', title: 'Won Deals', color: 'border-emerald-500' },
    { id: 'lost', title: 'Lost', color: 'border-slate-200' },
  ];

  const handleOpenCreate = () => {
    setFormData({
      customerId: customers[0]?.id || '',
      title: '',
      source: 'Inbound Inquiry',
      stage: 'lead',
      estimatedValue: 10000,
      expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      assignedToUserId: workspaceMembers[0]?.userId || '',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    createLead({
      customerId: formData.customerId,
      title: formData.title.trim(),
      source: formData.source,
      stage: formData.stage,
      estimatedValue: Number(formData.estimatedValue) || 0,
      expectedCloseDate: formData.expectedCloseDate,
      assignedToUserId: formData.assignedToUserId,
      notes: formData.notes.trim(),
    });
    setIsCreateModalOpen(false);
  };

  const stageOrder: LeadStage[] = ['lead', 'contacted', 'proposal', 'negotiation', 'won'];

  const getNextStage = (current: LeadStage): LeadStage | null => {
    const idx = stageOrder.indexOf(current);
    if (idx >= 0 && idx < stageOrder.length - 1) {
      return stageOrder[idx + 1];
    }
    return null;
  };

  const getPrevStage = (current: LeadStage): LeadStage | null => {
    const idx = stageOrder.indexOf(current);
    if (idx > 0) {
      return stageOrder[idx - 1];
    }
    return null;
  };

  const totalPipelineValue = sumAmounts(
    leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost').map((l) => l.estimatedValue)
  );
  const totalWonValue = sumAmounts(leads.filter((l) => l.stage === 'won').map((l) => l.estimatedValue));

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Sales Pipeline</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>
              Active Pipeline:{' '}
              <strong className="text-slate-900 font-mono">
                {formatCurrency(totalPipelineValue, activeWorkspace.currency)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Won Revenue:{' '}
              <strong className="text-emerald-700 font-mono">
                {formatCurrency(totalWonValue, activeWorkspace.currency)}
              </strong>
            </span>
          </div>
        </div>

        {can('create_lead') && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Opportunity</span>
          </button>
        )}
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.id);
          const stageTotal = sumAmounts(stageLeads.map((l) => l.estimatedValue));

          return (
            <div
              key={stage.id}
              className="w-72 shrink-0 bg-slate-100/70 rounded-xl p-3 border border-slate-200/80 flex flex-col max-h-[80vh]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-slate-900">{stage.title}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white text-slate-600 rounded-sm border border-slate-200">
                    {stageLeads.length}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium text-slate-700">
                  {formatCurrency(stageTotal, activeWorkspace.currency)}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {stageLeads.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    No deals in this stage
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const next = getNextStage(lead.stage);
                    const prev = getPrevStage(lead.stage);

                    return (
                      <div
                        key={lead.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                            {lead.title}
                          </h4>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.customerName}</span>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(lead.estimatedValue, lead.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {lead.expectedCloseDate}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                          <span className="truncate">Rep: {lead.assignedToName}</span>

                          {/* Quick Stage Transitions */}
                          <div className="flex items-center gap-1">
                            {prev && can('edit_lead') && (
                              <button
                                onClick={() => moveLeadStage(lead.id, prev)}
                                title={`Move back to ${prev}`}
                                className="p-1 rounded-sm hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {next && can('edit_lead') && (
                              <button
                                onClick={() => moveLeadStage(lead.id, next)}
                                title={`Advance to ${next}`}
                                className="p-1 rounded-sm hover:bg-slate-100 text-cyan-600 hover:text-cyan-700 font-medium"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {lead.stage !== 'lost' && lead.stage !== 'won' && can('edit_lead') && (
                              <button
                                onClick={() => moveLeadStage(lead.id, 'lost')}
                                title="Mark as Lost"
                                className="p-1 rounded-sm hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            )}
                            {can('delete_lead') && (
                              <button
                                onClick={() => deleteLead(lead.id)}
                                title="Delete deal"
                                className="p-1 rounded-sm hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Opportunity Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Sales Opportunity"
        description="Register a new deal in the active workspace sales pipeline"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Deal Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Website Redesign & Component Kit"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Client Account <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Deal Source</label>
              <input
                type="text"
                placeholder="Referral, Web, Outbound"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Estimated Value ({activeWorkspace.currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                step="100"
                value={formData.estimatedValue}
                onChange={(e) => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Expected Close Date</label>
              <input
                type="date"
                required
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as LeadStage })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                <option value="lead">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="proposal">Proposal Sent</option>
                <option value="negotiation">Negotiation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Account Rep</label>
              <select
                value={formData.assignedToUserId}
                onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                {workspaceMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.fullName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Deal Scope & Discovery Notes</label>
            <textarea
              rows={3}
              placeholder="Customer objectives, technical requirements, or budget constraints..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Add to Pipeline
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
