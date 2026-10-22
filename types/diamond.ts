export type Role = 'owner' | 'manager' | 'employee' | 'viewer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  title?: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  status: 'active' | 'invited' | 'suspended';
  user: User;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  industry: string;
  currency: string;
  timezone: string;
  logoUrl?: string;
  createdAt: string;
  subscriptionPlan: 'starter' | 'professional' | 'enterprise';
}

export interface Customer {
  id: string;
  workspaceId: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'archived';
  notes: string;
  tags: string[];
  totalBilled: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export type LeadStage = 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Lead {
  id: string;
  workspaceId: string;
  customerId: string;
  customerName: string;
  title: string;
  source: string;
  stage: LeadStage;
  estimatedValue: number;
  currency: string;
  expectedCloseDate: string;
  assignedToUserId: string;
  assignedToName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  assignedToUserId: string;
  assignedToName: string;
  relatedEntityType?: 'customer' | 'lead' | 'order' | 'invoice';
  relatedEntityId?: string;
  relatedEntityTitle?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  completedAt?: string;
  createdAt: string;
}

export type OrderStatus = 'draft' | 'confirmed' | 'in_progress' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  workspaceId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  startDate: string;
  completionDate: string;
  assignedToUserId: string;
  assignedToName: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void';

export interface Invoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderId?: string;
  orderNumber?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number; // percentage, e.g. 10 for 10%
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'cash' | 'cheque' | 'other';

export interface Payment {
  id: string;
  workspaceId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNote?: string;
  recordedByUserId: string;
  recordedByName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'customer' | 'lead' | 'task' | 'order' | 'invoice' | 'payment' | 'workspace' | 'member';
  entityId: string;
  details: string;
  createdAt: string;
}
