-- ==============================================================================
-- Migration: 003_financial_transactions.sql
-- Description: Trusted PostgreSQL transactional functions for atomic financial
--              operations (invoices, payments, idempotency, customer AR balance).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- FUNCTION: record_payment_transaction
-- Atomically validates payment boundaries, checks idempotency, locks invoice,
-- records payment, recalculates balance & status, updates customer outstanding
-- balance, and generates an audit log entry within a single ACID transaction.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
    p_workspace_id UUID,
    p_invoice_id UUID,
    p_amount_subunits BIGINT,
    p_payment_method VARCHAR(50),
    p_payment_date TIMESTAMPTZ,
    p_reference_note TEXT,
    p_idempotency_key VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv RECORD;
    v_cust RECORD;
    v_new_paid BIGINT;
    v_new_balance BIGINT;
    v_new_status VARCHAR(50);
    v_payment_id UUID;
    v_existing_payment RECORD;
    v_user_name VARCHAR(255);
BEGIN
    -- 1. Authorization check: User must be member with owner/admin/manager role
    IF NOT public.user_has_workspace_role(p_workspace_id, ARRAY['owner', 'admin', 'manager']) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to record payments in this workspace.';
    END IF;

    -- 2. Validate amount
    IF p_amount_subunits <= 0 THEN
        RAISE EXCEPTION 'Invalid Amount: Payment amount must be greater than zero.';
    END IF;

    -- 3. Idempotency Check: Prevent duplicate payment submissions
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, amount_subunits, invoice_number INTO v_existing_payment
        FROM public.payments
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'idempotent_duplicate', true,
                'payment_id', v_existing_payment.id,
                'message', 'Payment already recorded via this idempotency key.'
            );
        END IF;
    END IF;

    -- 4. Lock and retrieve Invoice FOR UPDATE to prevent race conditions
    SELECT id, workspace_id, invoice_number, customer_id, total_subunits, paid_subunits, balance_subunits, currency, status
    INTO v_inv
    FROM public.invoices
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found or does not belong to active workspace.';
    END IF;

    IF v_inv.status = 'void' THEN
        RAISE EXCEPTION 'Cannot apply payment to a void invoice.';
    END IF;

    IF v_inv.balance_subunits <= 0 THEN
        RAISE EXCEPTION 'Invoice is already fully paid.';
    END IF;

    -- 5. Overpayment guard: Reject if payment exceeds remaining balance
    IF p_amount_subunits > v_inv.balance_subunits THEN
        RAISE EXCEPTION 'Overpayment Rejected: Payment amount (% minor units) exceeds outstanding invoice balance (% minor units).',
            p_amount_subunits, v_inv.balance_subunits;
    END IF;

    -- 6. Lock and retrieve Customer FOR UPDATE
    SELECT id, outstanding_balance_subunits
    INTO v_cust
    FROM public.customers
    WHERE id = v_inv.customer_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    -- 7. Calculate new invoice financials
    v_new_paid := v_inv.paid_subunits + p_amount_subunits;
    v_new_balance := v_inv.total_subunits - v_new_paid;

    IF v_new_balance = 0 THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'partial';
    END IF;

    -- 8. Get current actor name
    SELECT COALESCE(raw_user_meta_data->>'full_name', email, 'Authorized User')
    INTO v_user_name
    FROM auth.users
    WHERE id = auth.uid();

    IF v_user_name IS NULL THEN
        v_user_name := 'System Operator';
    END IF;

    -- 9. Insert Payment Record
    INSERT INTO public.payments (
        workspace_id,
        invoice_id,
        invoice_number,
        amount_subunits,
        currency,
        payment_date,
        payment_method,
        reference_note,
        recorded_by_user_id,
        recorded_by_name,
        idempotency_key
    ) VALUES (
        p_workspace_id,
        v_inv.id,
        v_inv.invoice_number,
        p_amount_subunits,
        v_inv.currency,
        COALESCE(p_payment_date, NOW()),
        p_payment_method,
        p_reference_note,
        auth.uid(),
        v_user_name,
        p_idempotency_key
    ) RETURNING id INTO v_payment_id;

    -- 10. Update Invoice paid & balance
    UPDATE public.invoices
    SET paid_subunits = v_new_paid,
        balance_subunits = v_new_balance,
        status = v_new_status,
        version = version + 1
    WHERE id = v_inv.id;

    -- 11. Decrement Customer outstanding balance safely
    IF v_cust.id IS NOT NULL THEN
        UPDATE public.customers
        SET outstanding_balance_subunits = GREATEST(0, outstanding_balance_subunits - p_amount_subunits),
            version = version + 1
        WHERE id = v_cust.id;
    END IF;

    -- 12. Write immutable Audit Log
    INSERT INTO public.audit_logs (
        workspace_id,
        user_id,
        user_name,
        action,
        entity_type,
        entity_id,
        details,
        metadata
    ) VALUES (
        p_workspace_id,
        auth.uid(),
        v_user_name,
        'payment.recorded',
        'payment',
        v_payment_id::text,
        format('Recorded payment of %s minor units for invoice %s', p_amount_subunits, v_inv.invoice_number),
        jsonb_build_object(
            'invoice_id', v_inv.id,
            'invoice_number', v_inv.invoice_number,
            'amount_subunits', p_amount_subunits,
            'new_status', v_new_status,
            'remaining_balance_subunits', v_new_balance
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'invoice_id', v_inv.id,
        'invoice_status', v_new_status,
        'paid_subunits', v_new_paid,
        'balance_subunits', v_new_balance
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_transaction(UUID, UUID, BIGINT, VARCHAR, TIMESTAMPTZ, TEXT, VARCHAR) TO authenticated;
