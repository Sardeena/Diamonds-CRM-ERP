'use client';

import React, { useState } from 'react';
import { useSuite } from '../../lib/suite-context';
import { Order, OrderStatus } from '../../types/diamond';
import { formatCurrency } from '../../lib/money';
import { Modal } from '../ui/Modal';
import {
  Package,
  Plus,
  Receipt,
  Building,
  Calendar,
  User,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export function OrderManager() {
  const {
    orders,
    customers,
    workspaceMembers,
    activeWorkspace,
    createOrder,
    updateOrderStatus,
    setActiveView,
    can,
  } = useSuite();

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState(() => ({
    customerId: '',
    title: '',
    description: '',
    amount: 15000,
    startDate: new Date().toISOString().split('T')[0],
    completionDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    assignedToUserId: '',
  }));

  const filteredOrders = orders.filter((o) => {
    return statusFilter === 'all' ? true : o.status === statusFilter;
  });

  const handleOpenCreate = () => {
    setFormData({
      customerId: customers[0]?.id || '',
      title: '',
      description: '',
      amount: 15000,
      startDate: new Date().toISOString().split('T')[0],
      completionDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      assignedToUserId: workspaceMembers[0]?.userId || '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    createOrder({
      customerId: formData.customerId,
      title: formData.title.trim(),
      description: formData.description.trim(),
      amount: Number(formData.amount) || 0,
      startDate: formData.startDate,
      completionDate: formData.completionDate,
      assignedToUserId: formData.assignedToUserId,
    });
    setIsCreateModalOpen(false);
  };

  const getStatusBadge = (s: OrderStatus) => {
    switch (s) {
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Service Orders & Retainers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirmed client contracts, deliverables, and service engagements
          </p>
        </div>

        {can('create_order') && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>New Service Order</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {(['all', 'confirmed', 'in_progress', 'delivered', 'cancelled'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
              statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="md:col-span-2 text-center py-12 bg-white rounded-xl border border-slate-200">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No service orders</h3>
            <p className="text-xs text-slate-500 mt-1">Create an order to track project commitments and billing.</p>
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-semibold text-slate-500">
                      {ord.orderNumber}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{ord.title}</h3>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-sm capitalize font-medium border ${getStatusBadge(
                      ord.status
                    )}`}
                  >
                    {ord.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{ord.customerName}</span>
                </div>

                {ord.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{ord.description}</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Value:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(ord.amount, ord.currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Due {ord.completionDate}</span>
                  <span>Lead: {ord.assignedToName}</span>
                </div>

                {/* Status Transitions & Invoice Shortcut */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {ord.status === 'confirmed' && can('edit_order') && (
                      <button
                        onClick={() => updateOrderStatus(ord.id, 'in_progress')}
                        className="px-2 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-sm border border-amber-200"
                      >
                        Start Work
                      </button>
                    )}
                    {ord.status === 'in_progress' && can('edit_order') && (
                      <button
                        onClick={() => updateOrderStatus(ord.id, 'delivered')}
                        className="px-2 py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-sm border border-emerald-200"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveView('invoices')}
                    className="text-xs font-medium text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
                  >
                    <span>View Invoices</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Service Order"
        description="Establish an operational agreement or service contract"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Contract / Order Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Brand Identity Strategy & Visual System"
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Contract Amount ({activeWorkspace.currency})</label>
              <input
                type="number"
                required
                min={0}
                step="100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Completion Date</label>
              <input
                type="date"
                required
                value={formData.completionDate}
                onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Project Lead</label>
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

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Contract Scope & Deliverables</label>
            <textarea
              rows={3}
              placeholder="Detailed description of milestones and billable hours..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              Confirm Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
