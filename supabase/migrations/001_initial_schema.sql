-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core multi-tenant business schema with composite foreign key
--              workspace boundary constraints and integer minor-unit finances.
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. WORKSPACES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    industry VARCHAR(100) NOT NULL DEFAULT 'Professional Services',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    logo_url TEXT,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. WORKSPACE MEMBERS (RBAC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'admin', 'manager', 'employee', 'viewer')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    title VARCHAR(150),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);

CREATE TRIGGER set_workspace_members_updated_at
    BEFORE UPDATE ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. CUSTOMERS
-- Composite constraint (id, workspace_id) ensures child records cannot reference
-- a customer belonging to another workspace.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    total_billed_subunits BIGINT NOT NULL DEFAULT 0 CHECK (total_billed_subunits >= 0),
    outstanding_balance_subunits BIGINT NOT NULL DEFAULT 0 CHECK (outstanding_balance_subunits >= 0),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_tenant UNIQUE (id, workspace_id)
);

CREATE INDEX idx_customers_workspace ON public.customers(workspace_id);
CREATE INDEX idx_customers_email ON public.customers(workspace_id, email);

CREATE TRIGGER set_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. LEADS (Sales Pipeline)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'Inbound',
    stage VARCHAR(50) NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost')),
    estimated_value_subunits BIGINT NOT NULL DEFAULT 0 CHECK (estimated_value_subunits >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    expected_close_date TIMESTAMPTZ,
    assigned_to_user_id UUID,
    assigned_to_name VARCHAR(255),
    notes TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_lead_customer_tenant FOREIGN KEY (customer_id, workspace_id)
        REFERENCES public.customers(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX idx_leads_workspace ON public.leads(workspace_id);
CREATE INDEX idx_leads_stage ON public.leads(workspace_id, stage);

CREATE TRIGGER set_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. TASKS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to_user_id UUID,
    assigned_to_name VARCHAR(255),
    related_entity_type VARCHAR(50) CHECK (related_entity_type IN ('customer', 'lead', 'order', 'invoice')),
    related_entity_id UUID,
    related_entity_title VARCHAR(255),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_status ON public.tasks(workspace_id, status);

CREATE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. ORDERS (Service Contracts & Retainers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_progress', 'delivered', 'cancelled')),
    amount_subunits BIGINT NOT NULL DEFAULT 0 CHECK (amount_subunits >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    start_date TIMESTAMPTZ,
    completion_date TIMESTAMPTZ,
    assigned_to_user_id UUID,
    assigned_to_name VARCHAR(255),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_order_number_per_workspace UNIQUE (workspace_id, order_number),
    CONSTRAINT uq_order_tenant UNIQUE (id, workspace_id),
    CONSTRAINT fk_order_customer_tenant FOREIGN KEY (customer_id, workspace_id)
        REFERENCES public.customers(id, workspace_id) ON DELETE RESTRICT
);

CREATE INDEX idx_orders_workspace ON public.orders(workspace_id);

CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. INVOICES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    customer_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    order_id UUID,
    order_number VARCHAR(100),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_subunits BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_subunits >= 0),
    tax_rate_basis_points INT NOT NULL DEFAULT 0 CHECK (tax_rate_basis_points >= 0), -- e.g. 1000 = 10.00%
    tax_subunits BIGINT NOT NULL DEFAULT 0 CHECK (tax_subunits >= 0),
    total_subunits BIGINT NOT NULL DEFAULT 0 CHECK (total_subunits >= 0),
    paid_subunits BIGINT NOT NULL DEFAULT 0 CHECK (paid_subunits >= 0),
    balance_subunits BIGINT NOT NULL DEFAULT 0 CHECK (balance_subunits >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'void')),
    notes TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invoice_number_per_workspace UNIQUE (workspace_id, invoice_number),
    CONSTRAINT uq_invoice_tenant UNIQUE (id, workspace_id),
    CONSTRAINT fk_invoice_customer_tenant FOREIGN KEY (customer_id, workspace_id)
        REFERENCES public.customers(id, workspace_id) ON DELETE RESTRICT
);

CREATE INDEX idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX idx_invoices_status ON public.invoices(workspace_id, status);

CREATE TRIGGER set_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. INVOICE ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price_subunits BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_subunits >= 0),
    line_total_subunits BIGINT NOT NULL DEFAULT 0 CHECK (line_total_subunits >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_item_invoice_tenant FOREIGN KEY (invoice_id, workspace_id)
        REFERENCES public.invoices(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ------------------------------------------------------------------------------
-- 9. PAYMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    amount_subunits BIGINT NOT NULL CHECK (amount_subunits > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('bank_transfer', 'credit_card', 'cash', 'cheque', 'other')),
    reference_note TEXT,
    recorded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_payment_invoice_tenant FOREIGN KEY (invoice_id, workspace_id)
        REFERENCES public.invoices(id, workspace_id) ON DELETE RESTRICT
);

CREATE INDEX idx_payments_workspace ON public.payments(workspace_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);

-- ------------------------------------------------------------------------------
-- 10. AUDIT LOGS (Immutable)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customer', 'lead', 'task', 'order', 'invoice', 'payment', 'workspace', 'member')),
    entity_id VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_workspace ON public.audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(workspace_id, created_at DESC);

-- Enforce immutability on audit logs: no updates, no deletes allowed
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;
