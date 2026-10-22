-- ==============================================================================
-- Migration: 002_row_level_security.sql
-- Description: Multi-tenant Row-Level Security (RLS) policies enforcing
--              workspace membership boundaries and strict RBAC authorization.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- HELPER FUNCTIONS (SECURITY DEFINER with safe search_path)
-- ------------------------------------------------------------------------------

-- Check if current authenticated user has an active membership in target workspace
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = target_workspace_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Check if user has one of the required roles in target workspace
CREATE OR REPLACE FUNCTION public.user_has_workspace_role(target_workspace_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = target_workspace_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(allowed_roles)
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_workspace_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_workspace_role(UUID, TEXT[]) TO authenticated;

-- ------------------------------------------------------------------------------
-- 1. WORKSPACES RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Read: Users can only see workspaces they belong to
CREATE POLICY "workspaces_select_member" ON public.workspaces
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(id));

-- Insert: Any authenticated user can create a workspace (becomes owner via trigger)
CREATE POLICY "workspaces_insert_auth" ON public.workspaces
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Update: Only owner or admin can update workspace profile
CREATE POLICY "workspaces_update_admin" ON public.workspaces
    FOR UPDATE TO authenticated
    USING (public.user_has_workspace_role(id, ARRAY['owner', 'admin']))
    WITH CHECK (public.user_has_workspace_role(id, ARRAY['owner', 'admin']));

-- Delete: Only owner can delete workspace
CREATE POLICY "workspaces_delete_owner" ON public.workspaces
    FOR DELETE TO authenticated
    USING (public.user_has_workspace_role(id, ARRAY['owner']));

-- Trigger: When a user creates a workspace, auto-insert them as owner
CREATE OR REPLACE FUNCTION public.handle_new_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, title)
  VALUES (NEW.id, auth.uid(), 'owner', 'active', 'Founder / Owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace_owner();

-- ------------------------------------------------------------------------------
-- 2. WORKSPACE MEMBERS RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Read: Members of a workspace can see all co-members
CREATE POLICY "members_select_member" ON public.workspace_members
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

-- Insert: Only owners or admins can invite/add new members
CREATE POLICY "members_insert_admin" ON public.workspace_members
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- Update: Only owners or admins can update member roles
CREATE POLICY "members_update_admin" ON public.workspace_members
    FOR UPDATE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- Delete: Only owners or admins can remove members
CREATE POLICY "members_delete_admin" ON public.workspace_members
    FOR DELETE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- ------------------------------------------------------------------------------
-- 3. CUSTOMERS RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON public.customers
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "customers_insert" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee'])
    );

CREATE POLICY "customers_update" ON public.customers
    FOR UPDATE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee']))
    WITH CHECK (
        workspace_id = customers.workspace_id AND
        public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee'])
    );

CREATE POLICY "customers_delete" ON public.customers
    FOR DELETE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- ------------------------------------------------------------------------------
-- 4. LEADS RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select" ON public.leads
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "leads_insert" ON public.leads
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee']));

CREATE POLICY "leads_update" ON public.leads
    FOR UPDATE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee']))
    WITH CHECK (
        workspace_id = leads.workspace_id AND
        public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee'])
    );

CREATE POLICY "leads_delete" ON public.leads
    FOR DELETE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

-- ------------------------------------------------------------------------------
-- 5. TASKS RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.tasks
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "tasks_insert" ON public.tasks
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee']));

CREATE POLICY "tasks_update" ON public.tasks
    FOR UPDATE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee']))
    WITH CHECK (
        workspace_id = tasks.workspace_id AND
        public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'employee'])
    );

CREATE POLICY "tasks_delete" ON public.tasks
    FOR DELETE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

-- ------------------------------------------------------------------------------
-- 6. ORDERS RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select" ON public.orders
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "orders_insert" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "orders_update" ON public.orders
    FOR UPDATE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']))
    WITH CHECK (
        workspace_id = orders.workspace_id AND
        public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
    );

CREATE POLICY "orders_delete" ON public.orders
    FOR DELETE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- ------------------------------------------------------------------------------
-- 7. INVOICES & INVOICE ITEMS RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON public.invoices
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "invoices_insert" ON public.invoices
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "invoices_update" ON public.invoices
    FOR UPDATE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']))
    WITH CHECK (
        workspace_id = invoices.workspace_id AND
        public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
    );

CREATE POLICY "invoices_delete" ON public.invoices
    FOR DELETE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY "items_select" ON public.invoice_items
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "items_insert" ON public.invoice_items
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "items_update" ON public.invoice_items
    FOR UPDATE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']))
    WITH CHECK (
        workspace_id = invoice_items.workspace_id AND
        public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
    );

CREATE POLICY "items_delete" ON public.invoice_items
    FOR DELETE TO authenticated
    USING (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- ------------------------------------------------------------------------------
-- 8. PAYMENTS RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON public.payments
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "payments_insert" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

-- Direct UPDATE and DELETE on payments are disabled to prevent ledger alteration
-- Corrections must be handled by credit notes or refund entries

-- ------------------------------------------------------------------------------
-- 9. AUDIT LOGS RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Members can view their workspace audit trails
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.user_has_workspace_access(workspace_id));

-- System and authenticated members can append audit events
CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_workspace_access(workspace_id));

-- UPDATE & DELETE have NO policies, making rows strictly immutable
