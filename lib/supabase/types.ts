export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          industry: string;
          currency: string;
          timezone: string;
          logo_url: string | null;
          subscription_plan: 'starter' | 'professional' | 'enterprise';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          industry?: string;
          currency?: string;
          timezone?: string;
          logo_url?: string | null;
          subscription_plan?: 'starter' | 'professional' | 'enterprise';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          industry?: string;
          currency?: string;
          timezone?: string;
          logo_url?: string | null;
          subscription_plan?: 'starter' | 'professional' | 'enterprise';
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
          status: 'active' | 'invited' | 'suspended';
          title: string | null;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
          status?: 'active' | 'invited' | 'suspended';
          title?: string | null;
          joined_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
          status?: 'active' | 'invited' | 'suspended';
          title?: string | null;
          joined_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          company_name: string | null;
          email: string;
          phone: string | null;
          address: string | null;
          status: 'active' | 'archived';
          notes: string | null;
          tags: string[];
          total_billed_subunits: number;
          outstanding_balance_subunits: number;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          company_name?: string | null;
          email: string;
          phone?: string | null;
          address?: string | null;
          status?: 'active' | 'archived';
          notes?: string | null;
          tags?: string[];
          total_billed_subunits?: number;
          outstanding_balance_subunits?: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          company_name?: string | null;
          email?: string;
          phone?: string | null;
          address?: string | null;
          status?: 'active' | 'archived';
          notes?: string | null;
          tags?: string[];
          total_billed_subunits?: number;
          outstanding_balance_subunits?: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          workspace_id: string;
          customer_id: string;
          customer_name: string;
          title: string;
          source: string;
          stage: 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
          estimated_value_subunits: number;
          currency: string;
          expected_close_date: string | null;
          assigned_to_user_id: string | null;
          assigned_to_name: string | null;
          notes: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          customer_id: string;
          customer_name: string;
          title: string;
          source?: string;
          stage?: 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
          estimated_value_subunits?: number;
          currency?: string;
          expected_close_date?: string | null;
          assigned_to_user_id?: string | null;
          assigned_to_name?: string | null;
          notes?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          customer_id?: string;
          customer_name?: string;
          title?: string;
          source?: string;
          stage?: 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
          estimated_value_subunits?: number;
          currency?: string;
          expected_close_date?: string | null;
          assigned_to_user_id?: string | null;
          assigned_to_name?: string | null;
          notes?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          assigned_to_user_id: string | null;
          assigned_to_name: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          related_entity_title: string | null;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
          due_date: string;
          completed_at: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          assigned_to_user_id?: string | null;
          assigned_to_name?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          related_entity_title?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
          due_date: string;
          completed_at?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          description?: string | null;
          assigned_to_user_id?: string | null;
          assigned_to_name?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          related_entity_title?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
          due_date?: string;
          completed_at?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          workspace_id: string;
          order_number: string;
          customer_id: string;
          customer_name: string;
          title: string;
          description: string | null;
          status: 'draft' | 'confirmed' | 'in_progress' | 'delivered' | 'cancelled';
          amount_subunits: number;
          currency: string;
          start_date: string | null;
          completion_date: string | null;
          assigned_to_user_id: string | null;
          assigned_to_name: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          order_number: string;
          customer_id: string;
          customer_name: string;
          title: string;
          description?: string | null;
          status?: 'draft' | 'confirmed' | 'in_progress' | 'delivered' | 'cancelled';
          amount_subunits?: number;
          currency?: string;
          start_date?: string | null;
          completion_date?: string | null;
          assigned_to_user_id?: string | null;
          assigned_to_name?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          order_number?: string;
          customer_id?: string;
          customer_name?: string;
          title?: string;
          description?: string | null;
          status?: 'draft' | 'confirmed' | 'in_progress' | 'delivered' | 'cancelled';
          amount_subunits?: number;
          currency?: string;
          start_date?: string | null;
          completion_date?: string | null;
          assigned_to_user_id?: string | null;
          assigned_to_name?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          workspace_id: string;
          invoice_number: string;
          customer_id: string;
          customer_name: string;
          customer_email: string | null;
          order_id: string | null;
          order_number: string | null;
          issue_date: string;
          due_date: string;
          subtotal_subunits: number;
          tax_rate_basis_points: number;
          tax_subunits: number;
          total_subunits: number;
          paid_subunits: number;
          balance_subunits: number;
          currency: string;
          status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void';
          notes: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          invoice_number: string;
          customer_id: string;
          customer_name: string;
          customer_email?: string | null;
          order_id?: string | null;
          order_number?: string | null;
          issue_date: string;
          due_date: string;
          subtotal_subunits?: number;
          tax_rate_basis_points?: number;
          tax_subunits?: number;
          total_subunits?: number;
          paid_subunits?: number;
          balance_subunits?: number;
          currency?: string;
          status?: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void';
          notes?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          invoice_number?: string;
          customer_id?: string;
          customer_name?: string;
          customer_email?: string | null;
          order_id?: string | null;
          order_number?: string | null;
          issue_date?: string;
          due_date?: string;
          subtotal_subunits?: number;
          tax_rate_basis_points?: number;
          tax_subunits?: number;
          total_subunits?: number;
          paid_subunits?: number;
          balance_subunits?: number;
          currency?: string;
          status?: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void';
          notes?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          workspace_id: string;
          invoice_id: string;
          invoice_number: string;
          amount_subunits: number;
          currency: string;
          payment_date: string;
          payment_method: string;
          reference_note: string | null;
          recorded_by_user_id: string | null;
          recorded_by_name: string | null;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          invoice_id: string;
          invoice_number: string;
          amount_subunits: number;
          currency?: string;
          payment_date?: string;
          payment_method: string;
          reference_note?: string | null;
          recorded_by_user_id?: string | null;
          recorded_by_name?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          invoice_id?: string;
          invoice_number?: string;
          amount_subunits?: number;
          currency?: string;
          payment_date?: string;
          payment_method?: string;
          reference_note?: string | null;
          recorded_by_user_id?: string | null;
          recorded_by_name?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string | null;
          user_name: string;
          action: string;
          entity_type: string;
          entity_id: string;
          details: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          user_name: string;
          action: string;
          entity_type: string;
          entity_id: string;
          details: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string | null;
          user_name?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          details?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
  };
}
