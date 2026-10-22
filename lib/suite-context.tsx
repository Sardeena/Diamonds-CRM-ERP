'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Workspace,
  User,
  WorkspaceMember,
  Role,
  Customer,
  Lead,
  LeadStage,
  Task,
  TaskStatus,
  Order,
  OrderStatus,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Payment,
  AuditLog,
} from '../types/diamond';
import {
  INITIAL_WORKSPACES,
  INITIAL_USERS,
  INITIAL_MEMBERS,
  INITIAL_CUSTOMERS,
  INITIAL_LEADS,
  INITIAL_TASKS,
  INITIAL_ORDERS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_AUDIT_LOGS,
} from './initial-data';
import {
  filterByWorkspace,
  assertWorkspaceAccess,
  createTenantRecord,
  validateEntityRelationship,
} from './tenant';
import { calculateInvoiceTotals, calculateRemainingBalance, toSubunits, fromSubunits } from './money';
import { hasPermission, ActionKey } from './permissions';
import { supabase, isSupabaseConfigured } from './supabase/client';

export type ActiveView = 'dashboard' | 'customers' | 'leads' | 'tasks' | 'orders' | 'invoices' | 'settings';

interface SuiteContextType {
  // Navigation & Session
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  currentUser: User;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  workspaceMembers: WorkspaceMember[];

  // Backend & Authentication State
  isSupabaseConfigured: boolean;
  isLiveBackend: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signOut: () => Promise<void>;
  backendSyncStatus: 'synced' | 'loading' | 'offline_sandbox' | 'error';

  // Tenant-Scoped Data
  customers: Customer[];
  leads: Lead[];
  tasks: Task[];
  orders: Order[];
  invoices: Invoice[];
  payments: Payment[];
  auditLogs: AuditLog[];

  // Cross-tenant data (for isolation verification inspect)
  allWorkspaces: Workspace[];

  // Permissions check helper
  can: (action: ActionKey) => boolean;

  // Customer Actions
  createCustomer: (data: {
    name: string;
    companyName: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    tags: string[];
  }) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  archiveCustomer: (id: string) => void;
  deleteCustomer: (id: string) => boolean;
  exportCustomersCSV: () => void;

  // Lead / Pipeline Actions
  createLead: (data: {
    customerId: string;
    title: string;
    source: string;
    stage: LeadStage;
    estimatedValue: number;
    expectedCloseDate: string;
    assignedToUserId: string;
    notes: string;
  }) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLeadStage: (id: string, newStage: LeadStage) => void;
  deleteLead: (id: string) => void;

  // Task Actions
  createTask: (data: {
    title: string;
    description: string;
    assignedToUserId: string;
    priority: Task['priority'];
    dueDate: string;
    relatedEntityType?: Task['relatedEntityType'];
    relatedEntityId?: string;
  }) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTaskStatus: (id: string) => void;
  deleteTask: (id: string) => void;

  // Order Actions
  createOrder: (data: {
    customerId: string;
    title: string;
    description: string;
    amount: number;
    startDate: string;
    completionDate: string;
    assignedToUserId: string;
  }) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;

  // Invoice & Payment Actions
  createInvoice: (data: {
    customerId: string;
    orderId?: string;
    issueDate: string;
    dueDate: string;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
    taxRate: number;
    notes?: string;
  }) => Invoice;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  recordPayment: (data: {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: Payment['paymentMethod'];
    referenceNote?: string;
  }) => Payment;

  // Workspace Settings & Team
  createWorkspace: (name: string, industry: string, currency: string) => Workspace;
  updateWorkspaceSettings: (updates: Partial<Workspace>) => void;
  inviteTeamMember: (email: string, fullName: string, role: Role, title: string) => void;
  updateMemberRole: (memberId: string, role: Role) => void;

  // Maintenance
  resetToDemoData: () => void;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
}

const SuiteContext = createContext<SuiteContextType | null>(null);

interface StoredData {
  workspaces?: Workspace[];
  members?: WorkspaceMember[];
  customers?: Customer[];
  leads?: Lead[];
  tasks?: Task[];
  orders?: Order[];
  invoices?: Invoice[];
  payments?: Payment[];
  auditLogs?: AuditLog[];
  activeWorkspaceId?: string;
  currentRole?: Role;
}

const STORAGE_KEY = 'diamond_suite_v1_store';

function loadInitialStore(): StoredData {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not read from browser storage:', e);
  }
  return {};
}

export function SuiteProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(
    () => loadInitialStore().activeWorkspaceId || 'ws-acme'
  );
  const [currentRole, setCurrentRole] = useState<Role>(
    () => loadInitialStore().currentRole || 'owner'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Data Stores with lazy initialization from localStorage
  const [workspaces, setWorkspaces] = useState<Workspace[]>(
    () => loadInitialStore().workspaces || INITIAL_WORKSPACES
  );
  const [members, setMembers] = useState<WorkspaceMember[]>(
    () => loadInitialStore().members || INITIAL_MEMBERS
  );
  const [customers, setCustomers] = useState<Customer[]>(
    () => loadInitialStore().customers || INITIAL_CUSTOMERS
  );
  const [leads, setLeads] = useState<Lead[]>(
    () => loadInitialStore().leads || INITIAL_LEADS
  );
  const [tasks, setTasks] = useState<Task[]>(
    () => loadInitialStore().tasks || INITIAL_TASKS
  );
  const [orders, setOrders] = useState<Order[]>(
    () => loadInitialStore().orders || INITIAL_ORDERS
  );
  const [invoices, setInvoices] = useState<Invoice[]>(
    () => loadInitialStore().invoices || INITIAL_INVOICES
  );
  const [payments, setPayments] = useState<Payment[]>(
    () => loadInitialStore().payments || INITIAL_PAYMENTS
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(
    () => loadInitialStore().auditLogs || INITIAL_AUDIT_LOGS
  );

  // Persist store changes to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload: StoredData = {
        workspaces,
        members,
        customers,
        leads,
        tasks,
        orders,
        invoices,
        payments,
        auditLogs,
        activeWorkspaceId,
        currentRole,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not persist to browser storage:', e);
    }
  }, [
    workspaces,
    members,
    customers,
    leads,
    tasks,
    orders,
    invoices,
    payments,
    auditLogs,
    activeWorkspaceId,
    currentRole,
  ]);

  // Auto-hide toast after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Supabase Backend & Session State
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [backendSyncStatus, setBackendSyncStatus] = useState<'synced' | 'loading' | 'offline_sandbox' | 'error'>(
    isSupabaseConfigured ? 'loading' : 'offline_sandbox'
  );

  // Check Supabase Auth Session
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let active = true;

    async function initSession() {
      try {
        const { data, error } = await supabase!.auth.getSession();
        if (error) throw error;
        if (active) {
          if (data.session) {
            setIsLiveBackend(true);
            setBackendSyncStatus('synced');
          } else {
            setIsLiveBackend(false);
            setBackendSyncStatus('offline_sandbox');
          }
        }
      } catch (e) {
        if (active) {
          setBackendSyncStatus('error');
          console.warn('Could not establish Supabase session:', e);
        }
      }
    }

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsLiveBackend(Boolean(session));
        setBackendSyncStatus(session ? 'synced' : 'offline_sandbox');
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLiveBackend(false);
    setBackendSyncStatus('offline_sandbox');
    setToastMessage('Signed out of workspace session.');
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Active Workspace entity
  const activeWorkspace = useMemo(() => {
    const found = workspaces.find((w) => w.id === activeWorkspaceId);
    return found || workspaces[0];
  }, [workspaces, activeWorkspaceId]);

  // Current User (defaults to primary user for the workspace)
  const currentUser = useMemo(() => {
    const activeMember = members.find(
      (m) => m.workspaceId === activeWorkspaceId && m.role === currentRole
    ) || members.find((m) => m.workspaceId === activeWorkspaceId);

    if (activeMember) return activeMember.user;
    return INITIAL_USERS[0];
  }, [members, activeWorkspaceId, currentRole]);

  // Active Workspace Members
  const workspaceMembers = useMemo(() => {
    return members.filter((m) => m.workspaceId === activeWorkspaceId);
  }, [members, activeWorkspaceId]);

  // Tenant-Filtered Datasets
  const currentCustomers = useMemo(() => filterByWorkspace(customers, activeWorkspaceId), [customers, activeWorkspaceId]);
  const currentLeads = useMemo(() => filterByWorkspace(leads, activeWorkspaceId), [leads, activeWorkspaceId]);
  const currentTasks = useMemo(() => filterByWorkspace(tasks, activeWorkspaceId), [tasks, activeWorkspaceId]);
  const currentOrders = useMemo(() => filterByWorkspace(orders, activeWorkspaceId), [orders, activeWorkspaceId]);
  const currentInvoices = useMemo(() => filterByWorkspace(invoices, activeWorkspaceId), [invoices, activeWorkspaceId]);
  const currentPayments = useMemo(() => filterByWorkspace(payments, activeWorkspaceId), [payments, activeWorkspaceId]);
  const currentAuditLogs = useMemo(() => filterByWorkspace(auditLogs, activeWorkspaceId), [auditLogs, activeWorkspaceId]);

  // Permission Checker
  const can = useCallback(
    (action: ActionKey) => {
      return hasPermission(currentRole, action);
    },
    [currentRole]
  );

  // Log Audit Action
  const logAudit = useCallback(
    (action: string, entityType: AuditLog['entityType'], entityId: string, details: string) => {
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        userId: currentUser.id,
        userName: currentUser.fullName,
        action,
        entityType,
        entityId,
        details,
        createdAt: new Date().toISOString(),
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    },
    [activeWorkspaceId, currentUser]
  );

  // Switch Workspace Handler
  const setActiveWorkspaceId = useCallback(
    (id: string) => {
      const targetWs = workspaces.find((w) => w.id === id);
      if (targetWs) {
        setActiveWorkspaceIdState(id);
        // Find default role for this workspace
        const userMembership = members.find((m) => m.workspaceId === id);
        if (userMembership) {
          setCurrentRole(userMembership.role);
        } else {
          setCurrentRole('owner');
        }
        showToast(`Switched workspace to "${targetWs.name}". Scoped records re-loaded.`);
      }
    },
    [workspaces, members, showToast]
  );

  // Customer Management
  const createCustomer = useCallback(
    (data: {
      name: string;
      companyName: string;
      email: string;
      phone: string;
      address: string;
      notes: string;
      tags: string[];
    }): Customer => {
      if (!hasPermission(currentRole, 'create_customer')) {
        showToast('Permission Denied: Your role cannot create customers.');
        throw new Error('Permission denied');
      }

      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        name: data.name,
        companyName: data.companyName || data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        status: 'active',
        notes: data.notes,
        tags: data.tags || [],
        totalBilled: 0,
        outstandingBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCustomers((prev) => [newCustomer, ...prev]);
      logAudit('customer.create', 'customer', newCustomer.id, `Created customer "${newCustomer.name}"`);
      showToast(`Customer "${newCustomer.name}" created successfully.`);
      return newCustomer;
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const updateCustomer = useCallback(
    (id: string, updates: Partial<Customer>) => {
      if (!hasPermission(currentRole, 'edit_customer')) {
        showToast('Permission Denied: Your role cannot edit customers.');
        return;
      }
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === id && c.workspaceId === activeWorkspaceId) {
            return { ...c, ...updates, updatedAt: new Date().toISOString() };
          }
          return c;
        })
      );
      logAudit('customer.update', 'customer', id, `Updated customer fields.`);
      showToast('Customer details updated.');
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const archiveCustomer = useCallback(
    (id: string) => {
      if (!hasPermission(currentRole, 'archive_customer')) {
        showToast('Permission Denied: Your role cannot archive customers.');
        return;
      }
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === id && c.workspaceId === activeWorkspaceId) {
            const nextStatus = c.status === 'active' ? 'archived' : 'active';
            return { ...c, status: nextStatus, updatedAt: new Date().toISOString() };
          }
          return c;
        })
      );
      logAudit('customer.archive', 'customer', id, `Toggled customer archive status.`);
      showToast('Customer archive status updated.');
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const deleteCustomer = useCallback(
    (id: string): boolean => {
      if (!hasPermission(currentRole, 'delete_customer')) {
        showToast('Permission Denied: Only Owners can permanently delete customer records.');
        return false;
      }
      const target = customers.find((c) => c.id === id);
      if (!target) return false;

      const access = assertWorkspaceAccess(target, activeWorkspaceId);
      if (!access.authorized) {
        showToast(`Security Violation: ${access.reason}`);
        return false;
      }

      setCustomers((prev) => prev.filter((c) => c.id !== id));
      logAudit('customer.delete', 'customer', id, `Deleted customer "${target.name}".`);
      showToast(`Customer "${target.name}" permanently deleted.`);
      return true;
    },
    [currentRole, customers, activeWorkspaceId, logAudit, showToast]
  );

  const exportCustomersCSV = useCallback(() => {
    if (!hasPermission(currentRole, 'export_customers')) {
      showToast('Permission Denied: Your role cannot export customer records.');
      return;
    }
    const headers = ['ID', 'Name', 'Company', 'Email', 'Phone', 'Status', 'Total Billed', 'Outstanding Balance'];
    const rows = currentCustomers.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${(c.companyName || '').replace(/"/g, '""')}"`,
      c.email,
      c.phone,
      c.status,
      c.totalBilled.toFixed(2),
      c.outstandingBalance.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeWorkspace.slug}-customers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logAudit('customers.export', 'customer', activeWorkspaceId, `Exported ${currentCustomers.length} customer records.`);
    showToast(`Exported ${currentCustomers.length} customers to CSV.`);
  }, [currentRole, currentCustomers, activeWorkspace, activeWorkspaceId, logAudit, showToast]);

  // Lead / Pipeline Management
  const createLead = useCallback(
    (data: {
      customerId: string;
      title: string;
      source: string;
      stage: LeadStage;
      estimatedValue: number;
      expectedCloseDate: string;
      assignedToUserId: string;
      notes: string;
    }): Lead => {
      if (!hasPermission(currentRole, 'create_lead')) {
        showToast('Permission Denied: Your role cannot create sales leads.');
        throw new Error('Permission denied');
      }

      const customer = customers.find((c) => c.id === data.customerId);
      const relCheck = validateEntityRelationship(customer, activeWorkspaceId, 'Customer');
      if (!relCheck.valid) {
        showToast(relCheck.reason || 'Invalid customer reference');
        throw new Error(relCheck.reason);
      }

      const assigned = INITIAL_USERS.find((u) => u.id === data.assignedToUserId);

      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        customerId: data.customerId,
        customerName: customer ? customer.name : 'Unassigned Account',
        title: data.title,
        source: data.source || 'Direct Outreach',
        stage: data.stage || 'lead',
        estimatedValue: Number(data.estimatedValue) || 0,
        currency: activeWorkspace.currency,
        expectedCloseDate: data.expectedCloseDate,
        assignedToUserId: data.assignedToUserId,
        assignedToName: assigned ? assigned.fullName : currentUser.fullName,
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLeads((prev) => [newLead, ...prev]);
      logAudit('lead.create', 'lead', newLead.id, `Created sales opportunity "${newLead.title}"`);
      showToast(`Deal "${newLead.title}" added to pipeline.`);
      return newLead;
    },
    [currentRole, customers, activeWorkspace, activeWorkspaceId, currentUser, logAudit, showToast]
  );

  const updateLead = useCallback(
    (id: string, updates: Partial<Lead>) => {
      if (!hasPermission(currentRole, 'edit_lead')) {
        showToast('Permission Denied: Your role cannot edit deals.');
        return;
      }
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id === id && l.workspaceId === activeWorkspaceId) {
            return { ...l, ...updates, updatedAt: new Date().toISOString() };
          }
          return l;
        })
      );
      logAudit('lead.update', 'lead', id, `Updated deal information.`);
      showToast('Deal updated.');
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const moveLeadStage = useCallback(
    (id: string, newStage: LeadStage) => {
      if (!hasPermission(currentRole, 'edit_lead')) {
        showToast('Permission Denied: Your role cannot move deal stages.');
        return;
      }
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id === id && l.workspaceId === activeWorkspaceId) {
            return { ...l, stage: newStage, updatedAt: new Date().toISOString() };
          }
          return l;
        })
      );
      logAudit('lead.stage_change', 'lead', id, `Moved deal stage to "${newStage}".`);
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const deleteLead = useCallback(
    (id: string) => {
      if (!hasPermission(currentRole, 'delete_lead')) {
        showToast('Permission Denied: Your role cannot delete deals.');
        return;
      }
      setLeads((prev) => prev.filter((l) => l.id !== id));
      logAudit('lead.delete', 'lead', id, `Deleted deal.`);
      showToast('Deal removed from pipeline.');
    },
    [currentRole, logAudit, showToast]
  );

  // Task Management
  const createTask = useCallback(
    (data: {
      title: string;
      description: string;
      assignedToUserId: string;
      priority: Task['priority'];
      dueDate: string;
      relatedEntityType?: Task['relatedEntityType'];
      relatedEntityId?: string;
    }): Task => {
      if (!hasPermission(currentRole, 'create_task')) {
        showToast('Permission Denied: Your role cannot create tasks.');
        throw new Error('Permission denied');
      }

      const assigned = INITIAL_USERS.find((u) => u.id === data.assignedToUserId);

      const newTask: Task = {
        id: `task-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        title: data.title,
        description: data.description || '',
        assignedToUserId: data.assignedToUserId,
        assignedToName: assigned ? assigned.fullName : currentUser.fullName,
        priority: data.priority || 'medium',
        status: 'todo',
        dueDate: data.dueDate,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
        createdAt: new Date().toISOString(),
      };

      setTasks((prev) => [newTask, ...prev]);
      logAudit('task.create', 'task', newTask.id, `Created task "${newTask.title}"`);
      showToast(`Task created and assigned to ${newTask.assignedToName}.`);
      return newTask;
    },
    [currentRole, activeWorkspaceId, currentUser, logAudit, showToast]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      if (!hasPermission(currentRole, 'edit_task')) {
        showToast('Permission Denied: Your role cannot edit tasks.');
        return;
      }
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id && t.workspaceId === activeWorkspaceId) {
            return { ...t, ...updates };
          }
          return t;
        })
      );
      logAudit('task.update', 'task', id, `Updated task details.`);
      showToast('Task updated.');
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const toggleTaskStatus = useCallback(
    (id: string) => {
      if (!hasPermission(currentRole, 'edit_task')) {
        showToast('Permission Denied: Your role cannot update task statuses.');
        return;
      }
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id && t.workspaceId === activeWorkspaceId) {
            const nextStatus: TaskStatus = t.status === 'completed' ? 'todo' : 'completed';
            return {
              ...t,
              status: nextStatus,
              completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
            };
          }
          return t;
        })
      );
      logAudit('task.toggle', 'task', id, `Toggled task completion status.`);
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const deleteTask = useCallback(
    (id: string) => {
      if (!hasPermission(currentRole, 'delete_task')) {
        showToast('Permission Denied: Your role cannot delete tasks.');
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
      logAudit('task.delete', 'task', id, `Deleted task.`);
      showToast('Task removed.');
    },
    [currentRole, logAudit, showToast]
  );

  // Orders Management
  const createOrder = useCallback(
    (data: {
      customerId: string;
      title: string;
      description: string;
      amount: number;
      startDate: string;
      completionDate: string;
      assignedToUserId: string;
    }): Order => {
      if (!hasPermission(currentRole, 'create_order')) {
        showToast('Permission Denied: Your role cannot create orders.');
        throw new Error('Permission denied');
      }

      const customer = customers.find((c) => c.id === data.customerId);
      const relCheck = validateEntityRelationship(customer, activeWorkspaceId, 'Customer');
      if (!relCheck.valid) {
        showToast(relCheck.reason || 'Invalid customer reference');
        throw new Error(relCheck.reason);
      }

      const assigned = INITIAL_USERS.find((u) => u.id === data.assignedToUserId);
      const count = orders.filter((o) => o.workspaceId === activeWorkspaceId).length + 1;
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        orderNumber,
        customerId: data.customerId,
        customerName: customer ? customer.name : 'Client',
        title: data.title,
        description: data.description || '',
        status: 'confirmed',
        amount: Number(data.amount) || 0,
        currency: activeWorkspace.currency,
        startDate: data.startDate,
        completionDate: data.completionDate,
        assignedToUserId: data.assignedToUserId,
        assignedToName: assigned ? assigned.fullName : currentUser.fullName,
        createdAt: new Date().toISOString(),
      };

      setOrders((prev) => [newOrder, ...prev]);
      logAudit('order.create', 'order', newOrder.id, `Created order ${newOrder.orderNumber} ($${newOrder.amount})`);
      showToast(`Order ${newOrder.orderNumber} confirmed.`);
      return newOrder;
    },
    [currentRole, customers, orders, activeWorkspace, activeWorkspaceId, currentUser, logAudit, showToast]
  );

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus) => {
      if (!hasPermission(currentRole, 'edit_order')) {
        showToast('Permission Denied: Your role cannot update order status.');
        return;
      }
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === id && o.workspaceId === activeWorkspaceId) {
            return { ...o, status };
          }
          return o;
        })
      );
      logAudit('order.status', 'order', id, `Updated order status to "${status}".`);
      showToast(`Order status updated to "${status}".`);
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  // Invoices & Payments Management
  const createInvoice = useCallback(
    (data: {
      customerId: string;
      orderId?: string;
      issueDate: string;
      dueDate: string;
      items: Array<{ description: string; quantity: number; unitPrice: number }>;
      taxRate: number;
      notes?: string;
    }): Invoice => {
      if (!hasPermission(currentRole, 'create_invoice')) {
        showToast('Permission Denied: Your role cannot generate invoices.');
        throw new Error('Permission denied');
      }

      const customer = customers.find((c) => c.id === data.customerId);
      const custCheck = validateEntityRelationship(customer, activeWorkspaceId, 'Customer');
      if (!custCheck.valid) {
        showToast(custCheck.reason || 'Invalid customer reference');
        throw new Error(custCheck.reason);
      }

      let order: Order | undefined;
      if (data.orderId) {
        order = orders.find((o) => o.id === data.orderId);
        const orderCheck = validateEntityRelationship(order, activeWorkspaceId, 'Order');
        if (!orderCheck.valid) {
          showToast(orderCheck.reason || 'Invalid order reference');
          throw new Error(orderCheck.reason);
        }
      }

      const count = invoices.filter((i) => i.workspaceId === activeWorkspaceId).length + 1;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

      // Decimal-safe totals calculation
      const calculatedItems: InvoiceItem[] = data.items.map((it, idx) => {
        const lineTotal = Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100;
        return {
          id: `item-${Date.now()}-${idx}`,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          lineTotal,
        };
      });

      const { subtotal, taxAmount, total } = calculateInvoiceTotals(calculatedItems, data.taxRate);

      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        invoiceNumber,
        customerId: data.customerId,
        customerName: customer ? customer.name : 'Client',
        customerEmail: customer ? customer.email : '',
        orderId: data.orderId,
        orderNumber: order ? order.orderNumber : undefined,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        items: calculatedItems,
        subtotal,
        taxRate: Number(data.taxRate) || 0,
        taxAmount,
        total,
        paidAmount: 0,
        balance: total,
        currency: activeWorkspace.currency,
        status: 'sent',
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
      };

      setInvoices((prev) => [newInvoice, ...prev]);

      // Update customer total billed and outstanding balance
      if (customer) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === customer.id) {
              return {
                ...c,
                totalBilled: fromSubunits(toSubunits(c.totalBilled) + toSubunits(total)),
                outstandingBalance: fromSubunits(toSubunits(c.outstandingBalance) + toSubunits(total)),
              };
            }
            return c;
          })
        );
      }

      logAudit('invoice.create', 'invoice', newInvoice.id, `Created invoice ${newInvoice.invoiceNumber} for $${newInvoice.total}`);
      showToast(`Invoice ${newInvoice.invoiceNumber} created and marked as sent.`);
      return newInvoice;
    },
    [currentRole, customers, orders, invoices, activeWorkspace, activeWorkspaceId, logAudit, showToast]
  );

  const updateInvoiceStatus = useCallback(
    (id: string, status: InvoiceStatus) => {
      if (!hasPermission(currentRole, 'edit_invoice')) {
        showToast('Permission Denied: Your role cannot update invoice status.');
        return;
      }
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === id && inv.workspaceId === activeWorkspaceId) {
            return { ...inv, status };
          }
          return inv;
        })
      );
      logAudit('invoice.status', 'invoice', id, `Updated invoice status to "${status}".`);
      showToast(`Invoice status set to "${status}".`);
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const recordPayment = useCallback(
    (data: {
      invoiceId: string;
      amount: number;
      paymentDate: string;
      paymentMethod: Payment['paymentMethod'];
      referenceNote?: string;
    }): Payment => {
      if (!hasPermission(currentRole, 'record_payment')) {
        showToast('Permission Denied: Your role cannot record payments.');
        throw new Error('Permission denied');
      }

      const invoice = invoices.find((inv) => inv.id === data.invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const access = assertWorkspaceAccess(invoice, activeWorkspaceId);
      if (!access.authorized) {
        showToast(`Security Violation: ${access.reason}`);
        throw new Error('Tenant violation');
      }

      if (invoice.balance <= 0) {
        showToast(`Payment Rejected: Invoice ${invoice.invoiceNumber} is already settled in full.`);
        throw new Error('Invoice already settled');
      }

      const pAmount = Number(data.amount) || 0;
      if (pAmount <= 0) {
        showToast('Payment Rejected: Payment amount must be greater than zero.');
        throw new Error('Invalid payment amount');
      }
      if (pAmount > invoice.balance) {
        showToast(`Payment Rejected: Payment amount ($${pAmount}) exceeds invoice balance ($${invoice.balance}).`);
        throw new Error('Payment exceeds balance');
      }

      const newPaidSub = toSubunits(invoice.paidAmount) + toSubunits(pAmount);
      const newPaid = fromSubunits(newPaidSub);
      const newBalance = calculateRemainingBalance(invoice.total, newPaid);

      let nextStatus: InvoiceStatus = invoice.status;
      if (newBalance === 0) {
        nextStatus = 'paid';
      } else if (newPaid > 0) {
        nextStatus = 'partial';
      }

      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: pAmount,
        currency: invoice.currency,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        referenceNote: data.referenceNote || '',
        recordedByUserId: currentUser.id,
        recordedByName: currentUser.fullName,
        createdAt: new Date().toISOString(),
      };

      setPayments((prev) => [newPayment, ...prev]);

      // Update invoice paid & balance
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === invoice.id) {
            return {
              ...inv,
              paidAmount: newPaid,
              balance: newBalance,
              status: nextStatus,
            };
          }
          return inv;
        })
      );

      // Decrement customer outstanding balance
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === invoice.customerId) {
            const nextCustBalance = Math.max(0, fromSubunits(toSubunits(c.outstandingBalance) - toSubunits(pAmount)));
            return { ...c, outstandingBalance: nextCustBalance };
          }
          return c;
        })
      );

      logAudit(
        'payment.record',
        'payment',
        newPayment.id,
        `Recorded payment of $${pAmount} for ${invoice.invoiceNumber}`
      );
      showToast(`Payment of $${pAmount.toFixed(2)} recorded successfully.`);
      return newPayment;
    },
    [currentRole, invoices, activeWorkspaceId, currentUser, logAudit, showToast]
  );

  // Workspace Settings & Organization
  const createWorkspace = useCallback(
    (name: string, industry: string, currency: string): Workspace => {
      if (!hasPermission(currentRole, 'manage_workspace_settings')) {
        showToast('Permission Denied: Only platform administrators or Owners can create new business workspaces.');
        throw new Error('Permission denied');
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newWs: Workspace = {
        id: `ws-${Date.now()}`,
        name,
        slug,
        industry: industry || 'Professional Services',
        currency: currency || 'USD',
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        subscriptionPlan: 'starter',
      };

      setWorkspaces((prev) => [...prev, newWs]);

      // Add current user as owner of the new workspace
      const newMember: WorkspaceMember = {
        id: `mem-${Date.now()}`,
        workspaceId: newWs.id,
        userId: currentUser.id,
        role: 'owner',
        status: 'active',
        user: currentUser,
        joinedAt: new Date().toISOString(),
      };
      setMembers((prev) => [...prev, newMember]);

      setActiveWorkspaceIdState(newWs.id);
      setCurrentRole('owner');
      logAudit('workspace.create', 'workspace', newWs.id, `Created workspace "${newWs.name}"`);
      showToast(`New workspace "${newWs.name}" created and activated.`);
      return newWs;
    },
    [currentRole, currentUser, logAudit, showToast]
  );

  const updateWorkspaceSettings = useCallback(
    (updates: Partial<Workspace>) => {
      if (!hasPermission(currentRole, 'manage_workspace_settings')) {
        showToast('Permission Denied: Only Owners can edit business profile and financial currency settings.');
        return;
      }
      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w.id === activeWorkspaceId) {
            return { ...w, ...updates };
          }
          return w;
        })
      );
      logAudit('workspace.update', 'workspace', activeWorkspaceId, 'Updated workspace settings.');
      showToast('Workspace settings saved.');
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const inviteTeamMember = useCallback(
    (email: string, fullName: string, role: Role, title: string) => {
      if (!hasPermission(currentRole, 'manage_team_members')) {
        showToast('Permission Denied: Your role cannot invite or manage team members.');
        return;
      }

      const newUser: User = {
        id: `usr-${Date.now()}`,
        email,
        fullName,
        title: title || 'Team Member',
      };

      const newMember: WorkspaceMember = {
        id: `mem-${Date.now()}`,
        workspaceId: activeWorkspaceId,
        userId: newUser.id,
        role,
        status: 'active',
        user: newUser,
        joinedAt: new Date().toISOString(),
      };

      setMembers((prev) => [...prev, newMember]);
      logAudit('member.invite', 'member', newMember.id, `Invited ${fullName} (${email}) as ${role}`);
      showToast(`Invited ${fullName} to ${activeWorkspace.name} with ${role.toUpperCase()} role.`);
    },
    [currentRole, activeWorkspaceId, activeWorkspace.name, logAudit, showToast]
  );

  const updateMemberRole = useCallback(
    (memberId: string, role: Role) => {
      if (!hasPermission(currentRole, 'manage_team_members')) {
        showToast('Permission Denied: Your role cannot change staff permissions.');
        return;
      }
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId && m.workspaceId === activeWorkspaceId) {
            return { ...m, role };
          }
          return m;
        })
      );
      logAudit('member.role_update', 'member', memberId, `Updated member role to ${role}`);
      showToast(`Member role updated to ${role.toUpperCase()}.`);
    },
    [currentRole, activeWorkspaceId, logAudit, showToast]
  );

  const resetToDemoData = useCallback(() => {
    setWorkspaces(INITIAL_WORKSPACES);
    setMembers(INITIAL_MEMBERS);
    setCustomers(INITIAL_CUSTOMERS);
    setLeads(INITIAL_LEADS);
    setTasks(INITIAL_TASKS);
    setOrders(INITIAL_ORDERS);
    setInvoices(INITIAL_INVOICES);
    setPayments(INITIAL_PAYMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setActiveWorkspaceIdState('ws-acme');
    setCurrentRole('owner');
    showToast('Reset all workspace records to original clean demo state.');
  }, [showToast]);

  const value: SuiteContextType = {
    activeView,
    setActiveView,
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    currentUser,
    currentRole,
    setCurrentRole,
    workspaceMembers,
    isSupabaseConfigured,
    isLiveBackend,
    authModalOpen,
    setAuthModalOpen,
    signOut,
    backendSyncStatus,
    customers: currentCustomers,
    leads: currentLeads,
    tasks: currentTasks,
    orders: currentOrders,
    invoices: currentInvoices,
    payments: currentPayments,
    auditLogs: currentAuditLogs,
    allWorkspaces: workspaces,
    can,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    deleteCustomer,
    exportCustomersCSV,
    createLead,
    updateLead,
    moveLeadStage,
    deleteLead,
    createTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    createOrder,
    updateOrderStatus,
    createInvoice,
    updateInvoiceStatus,
    recordPayment,
    createWorkspace,
    updateWorkspaceSettings,
    inviteTeamMember,
    updateMemberRole,
    resetToDemoData,
    toastMessage,
    setToastMessage,
  };

  return <SuiteContext.Provider value={value}>{children}</SuiteContext.Provider>;
}

export function useSuite() {
  const ctx = useContext(SuiteContext);
  if (!ctx) {
    throw new Error('useSuite must be used within a SuiteProvider');
  }
  return ctx;
}
