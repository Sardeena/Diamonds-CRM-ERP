'use client';

import React, { useState } from 'react';
import { useSuite } from '../../lib/suite-context';
import { Invoice, InvoiceStatus, PaymentMethod } from '../../types/diamond';
import { formatCurrency, calculateInvoiceTotals, calculateLineTotal } from '../../lib/money';
import { Modal } from '../ui/Modal';
import {
  Receipt,
  Plus,
  DollarSign,
  Printer,
  Trash2,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';

export function InvoiceManager() {
  const {
    invoices,
    customers,
    orders,
    activeWorkspace,
    createInvoice,
    updateInvoiceStatus,
    recordPayment,
    can,
  } = useSuite();

  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Invoice Form State
  const [formData, setFormData] = useState(() => ({
    customerId: '',
    orderId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    taxRate: 0,
    notes: 'Net 30 terms. Electronic bank transfer preferred.',
    items: [{ description: 'Professional Services / Milestone Delivery', quantity: 1, unitPrice: 5000 }],
  }));

  // Payment Form State
  const [paymentData, setPaymentData] = useState(() => ({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer' as PaymentMethod,
    referenceNote: '',
  }));

  const filteredInvoices = invoices.filter((i) => {
    return statusFilter === 'all' ? true : i.status === statusFilter;
  });

  const handleOpenCreate = () => {
    setFormData({
      customerId: customers[0]?.id || '',
      orderId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      taxRate: 0,
      notes: 'Net 30 payment terms. Wire transfer instructions provided upon request.',
      items: [{ description: 'Retainer / Deliverables Sprint', quantity: 1, unitPrice: 5000 }],
    });
    setIsCreateModalOpen(true);
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: 'description' | 'quantity' | 'unitPrice', value: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  // Live Totals calculation for modal
  const liveTotals = calculateInvoiceTotals(formData.items, formData.taxRate);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.items.length === 0) return;

    createInvoice({
      customerId: formData.customerId,
      orderId: formData.orderId || undefined,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      items: formData.items,
      taxRate: Number(formData.taxRate) || 0,
      notes: formData.notes,
    });
    setIsCreateModalOpen(false);
  };

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentData({
      amount: inv.balance,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      referenceNote: `Payment against ${inv.invoiceNumber}`,
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment || paymentData.amount <= 0) return;

    recordPayment({
      invoiceId: selectedInvoiceForPayment.id,
      amount: Number(paymentData.amount),
      paymentDate: paymentData.paymentDate,
      paymentMethod: paymentData.paymentMethod,
      referenceNote: paymentData.referenceNote,
    });

    setSelectedInvoiceForPayment(null);
  };

  const getStatusBadge = (s: InvoiceStatus) => {
    switch (s) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'partial':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'sent':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'overdue':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'draft':
      case 'void':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Invoices & Payment Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue commercial billing invoices, manage line items, and reconcile transactions
          </p>
        </div>

        {can('create_invoice') && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Create Invoice</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {(['all', 'sent', 'partial', 'paid', 'overdue'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
              statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Invoices Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No invoices in this view</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Create an invoice with line items to bill your customer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {inv.invoiceNumber}
                      {inv.orderNumber && (
                        <div className="text-[10px] text-slate-400 font-sans">Ref: {inv.orderNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{inv.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{inv.issueDate}</td>
                    <td className="py-3 px-4 text-slate-500">{inv.dueDate}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span className={inv.balance > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                        {formatCurrency(inv.balance, inv.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-sm capitalize font-medium border ${getStatusBadge(
                          inv.status
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoiceForPrint(inv)}
                          title="View & Print Invoice"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {inv.balance > 0 && can('record_payment') && (
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            className="px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Invoice"
        description="Decimal-accurate line item billing with tax calculations"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Linked Service Order (Optional)</label>
              <select
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">No linked contract</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} - {o.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Issue Date</label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Line Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900">Line Items</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-medium text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {formData.items.map((item, idx) => {
                const lineTotal = calculateLineTotal(item.quantity, item.unitPrice);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Service description"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="flex-3 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                      type="number"
                      required
                      min={1}
                      step={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-16 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                    />
                    <input
                      type="number"
                      required
                      min={0}
                      step="50"
                      placeholder="Rate"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                      className="w-24 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                    />
                    <div className="w-24 text-right font-mono font-medium text-slate-900 text-xs">
                      {formatCurrency(lineTotal, activeWorkspace.currency)}
                    </div>
                    <button
                      type="button"
                      disabled={formData.items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subtotal, Tax and Total Summary */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums text-slate-800">
                {formatCurrency(liveTotals.subtotal, activeWorkspace.currency)}
              </span>
            </div>
            {formData.taxRate > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax ({formData.taxRate}%):</span>
                <span className="font-mono tabular-nums text-slate-800">
                  {formatCurrency(liveTotals.taxAmount, activeWorkspace.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Invoice Amount:</span>
              <span className="font-mono tabular-nums text-cyan-800">
                {formatCurrency(liveTotals.total, activeWorkspace.currency)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Payment Instructions / Notes</label>
            <textarea
              rows={2}
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
              Issue Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      {selectedInvoiceForPayment && (
        <Modal
          isOpen={Boolean(selectedInvoiceForPayment)}
          onClose={() => setSelectedInvoiceForPayment(null)}
          title={`Record Payment for ${selectedInvoiceForPayment.invoiceNumber}`}
          description={`Customer: ${selectedInvoiceForPayment.customerName} · Balance: ${formatCurrency(
            selectedInvoiceForPayment.balance,
            selectedInvoiceForPayment.currency
          )}`}
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Amount ({selectedInvoiceForPayment.currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0.01}
                max={selectedInvoiceForPayment.balance}
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, paymentMethod: e.target.value as PaymentMethod })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="bank_transfer">Bank Wire / ACH</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reference / Transaction Note</label>
              <input
                type="text"
                placeholder="e.g. Bank Wire Ref #992817441"
                value={paymentData.referenceNote}
                onChange={(e) => setPaymentData({ ...paymentData, referenceNote: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Printable Invoice Modal */}
      {selectedInvoiceForPrint && (
        <Modal
          isOpen={Boolean(selectedInvoiceForPrint)}
          onClose={() => setSelectedInvoiceForPrint(null)}
          title={`Print Preview — ${selectedInvoiceForPrint.invoiceNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 p-4 bg-white" id="printable-invoice">
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {activeWorkspace.name}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  Commercial Business Operations
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold font-mono text-slate-900">
                  {selectedInvoiceForPrint.invoiceNumber}
                </div>
                <div className="text-xs text-slate-500">
                  Status: <span className="uppercase font-semibold">{selectedInvoiceForPrint.status}</span>
                </div>
              </div>
            </div>

            {/* Billed To & Dates */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">
                  Billed To
                </span>
                <div className="font-semibold text-slate-900 text-sm">
                  {selectedInvoiceForPrint.customerName}
                </div>
                <div className="text-slate-600 font-mono mt-0.5">
                  {selectedInvoiceForPrint.customerEmail}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div>
                  <span className="text-slate-400">Issue Date:</span>{' '}
                  <span className="font-mono text-slate-900">{selectedInvoiceForPrint.issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-400">Due Date:</span>{' '}
                  <span className="font-mono text-slate-900 font-medium">{selectedInvoiceForPrint.dueDate}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Price</th>
                  <th className="py-2 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedInvoiceForPrint.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2.5 px-3 text-slate-900">{it.description}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{it.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatCurrency(it.unitPrice, selectedInvoiceForPrint.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(it.lineTotal, selectedInvoiceForPrint.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary */}
            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedInvoiceForPrint.subtotal, selectedInvoiceForPrint.currency)}
                  </span>
                </div>
                {selectedInvoiceForPrint.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({selectedInvoiceForPrint.taxRate}%):</span>
                    <span className="font-mono">
                      {formatCurrency(selectedInvoiceForPrint.taxAmount, selectedInvoiceForPrint.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span className="font-mono text-cyan-800">
                    {formatCurrency(selectedInvoiceForPrint.total, selectedInvoiceForPrint.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid to Date:</span>
                  <span className="font-mono text-emerald-700">
                    {formatCurrency(selectedInvoiceForPrint.paidAmount, selectedInvoiceForPrint.currency)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Remaining Balance:</span>
                  <span className="font-mono text-amber-700">
                    {formatCurrency(selectedInvoiceForPrint.balance, selectedInvoiceForPrint.currency)}
                  </span>
                </div>
              </div>
            </div>

            {selectedInvoiceForPrint.notes && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                <span className="font-semibold block text-slate-800 mb-0.5">Notes & Terms:</span>
                {selectedInvoiceForPrint.notes}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPrint(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
