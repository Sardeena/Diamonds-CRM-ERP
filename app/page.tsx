'use client';

import React, { useState } from 'react';
import { SuiteProvider, useSuite } from '../lib/suite-context';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { ExecutiveDashboard } from '../components/dashboard/ExecutiveDashboard';
import { CustomerDirectory } from '../components/customers/CustomerDirectory';
import { SalesPipeline } from '../components/pipeline/SalesPipeline';
import { TaskManager } from '../components/tasks/TaskManager';
import { OrderManager } from '../components/orders/OrderManager';
import { InvoiceManager } from '../components/invoices/InvoiceManager';
import { WorkspaceSettings } from '../components/settings/WorkspaceSettings';
import { AuthModal } from '../components/auth/AuthModal';
import { Menu, X, CheckCircle, AlertCircle } from 'lucide-react';

function SuiteApp() {
  const {
    activeView,
    setActiveView,
    toastMessage,
    setToastMessage,
    authModalOpen,
    setAuthModalOpen,
  } = useSuite();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Quick Action in header mapped to current view
  let quickActionLabel: string | undefined;
  let onQuickAction: (() => void) | undefined;

  if (activeView === 'customers') {
    quickActionLabel = 'New Customer';
    onQuickAction = () => {
      // Handled inside CustomerDirectory
    };
  } else if (activeView === 'leads') {
    quickActionLabel = 'New Opportunity';
    onQuickAction = () => {};
  } else if (activeView === 'tasks') {
    quickActionLabel = 'Create Task';
    onQuickAction = () => {};
  } else if (activeView === 'invoices') {
    quickActionLabel = 'Create Invoice';
    onQuickAction = () => {};
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 antialiased overflow-hidden font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-700 animate-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Supabase Authentication & Provisioning Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="lg:hidden h-14 bg-[#0B192C] text-white flex items-center justify-between px-4 shrink-0 border-b border-[#1E3E62]">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md hover:bg-[#1E3E62] text-slate-300"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-semibold text-xs tracking-wide">Diamond Business Suite</div>
          <div className="w-5" />
        </div>

        {/* Global Desktop Header */}
        <Header onQuickAction={onQuickAction} quickActionLabel={quickActionLabel} />

        {/* Dynamic View Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && <ExecutiveDashboard />}
            {activeView === 'customers' && <CustomerDirectory />}
            {activeView === 'leads' && <SalesPipeline />}
            {activeView === 'tasks' && <TaskManager />}
            {activeView === 'orders' && <OrderManager />}
            {activeView === 'invoices' && <InvoiceManager />}
            {activeView === 'settings' && <WorkspaceSettings />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <SuiteProvider>
      <SuiteApp />
    </SuiteProvider>
  );
}
