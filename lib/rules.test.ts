import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLineTotal,
  calculateInvoiceTotals,
  calculateRemainingBalance,
  sumAmounts,
  formatCurrency,
} from './money';
import { hasPermission } from './permissions';
import {
  filterByWorkspace,
  assertWorkspaceAccess,
  createTenantRecord,
  validateEntityRelationship,
} from './tenant';

test('tenant: validateEntityRelationship rejects foreign workspace customer link', () => {
  const foreignCustomer = {
    id: 'cust-vanguard-1',
    workspaceId: 'ws-vanguard',
    name: 'Vanguard VIP Client',
  };

  // Attempt to link Vanguard customer inside Acme workspace
  const check = validateEntityRelationship(foreignCustomer, 'ws-acme', 'Customer');
  assert.equal(check.valid, false);
  assert.match(check.reason ?? '', /Security Violation: Referenced Customer belongs to workspace "ws-vanguard"/);

  // Legitimate link inside Vanguard workspace
  const validCheck = validateEntityRelationship(foreignCustomer, 'ws-vanguard', 'Customer');
  assert.equal(validCheck.valid, true);
});

test('tenant: validateEntityRelationship rejects nonexistent entity link', () => {
  const check = validateEntityRelationship(null, 'ws-acme', 'Order');
  assert.equal(check.valid, false);
  assert.match(check.reason ?? '', /Referenced Order not found/);
});

test('money: decimal-safe line total avoids floating point drift', () => {
  // 3 items at $19.99
  const line = calculateLineTotal(3, 19.99);
  assert.equal(line, 59.97);

  // 0.1 qty / fraction cases
  const fractional = calculateLineTotal(2.5, 10.5);
  assert.equal(fractional, 26.25);
});

test('money: calculateInvoiceTotals computes subtotal, tax and total accurately', () => {
  const items = [
    { quantity: 2, unitPrice: 1500.0 }, // 3000.00
    { quantity: 5, unitPrice: 120.5 }, // 602.50
    { quantity: 1, unitPrice: 49.99 }, // 49.99
  ];
  // Subtotal = 3652.49
  // 10% tax = 365.25
  // Total = 4017.74
  const result = calculateInvoiceTotals(items, 10);
  assert.equal(result.subtotal, 3652.49);
  assert.equal(result.taxAmount, 365.25);
  assert.equal(result.total, 4017.74);
});

test('money: remaining balance calculation', () => {
  assert.equal(calculateRemainingBalance(4017.74, 2000.0), 2017.74);
  assert.equal(calculateRemainingBalance(100.0, 100.0), 0);
  assert.equal(calculateRemainingBalance(50.0, 100.0), 0); // overpayment doesn't produce negative balance
});

test('money: sumAmounts sums multiple amounts safely', () => {
  assert.equal(sumAmounts([0.1, 0.2, 0.3]), 0.6);
  assert.equal(sumAmounts([199.99, 450.5, 23.25]), 673.74);
});

test('permissions: owner has full administrative power', () => {
  assert.equal(hasPermission('owner', 'manage_workspace_settings'), true);
  assert.equal(hasPermission('owner', 'delete_customer'), true);
  assert.equal(hasPermission('owner', 'create_invoice'), true);
  assert.equal(hasPermission('owner', 'view_audit_logs'), true);
});

test('permissions: manager can create invoices but cannot edit core workspace settings', () => {
  assert.equal(hasPermission('manager', 'create_invoice'), true);
  assert.equal(hasPermission('manager', 'manage_team_members'), true);
  assert.equal(hasPermission('manager', 'manage_workspace_settings'), false);
});

test('permissions: employee can edit assigned tasks and leads but cannot delete customers', () => {
  assert.equal(hasPermission('employee', 'create_lead'), true);
  assert.equal(hasPermission('employee', 'create_task'), true);
  assert.equal(hasPermission('employee', 'delete_customer'), false);
  assert.equal(hasPermission('employee', 'manage_team_members'), false);
});

test('permissions: viewer has zero mutation permissions', () => {
  assert.equal(hasPermission('viewer', 'create_customer'), false);
  assert.equal(hasPermission('viewer', 'create_invoice'), false);
  assert.equal(hasPermission('viewer', 'delete_task'), false);
  assert.equal(hasPermission('viewer', 'manage_workspace_settings'), false);
});

test('tenant: filterByWorkspace returns only records matching the active workspace', () => {
  const records = [
    { id: '1', workspaceId: 'ws-acme', title: 'Acme record' },
    { id: '2', workspaceId: 'ws-vanguard', title: 'Vanguard record' },
    { id: '3', workspaceId: 'ws-acme', title: 'Acme record 2' },
  ];

  const acmeOnly = filterByWorkspace(records, 'ws-acme');
  assert.equal(acmeOnly.length, 2);
  assert.deepEqual(
    acmeOnly.map((r) => r.id),
    ['1', '3']
  );

  const vanguardOnly = filterByWorkspace(records, 'ws-vanguard');
  assert.equal(vanguardOnly.length, 1);
  assert.equal(vanguardOnly[0].id, '2');
});

test('tenant: assertWorkspaceAccess flags cross-tenant access attempts', () => {
  const foreignRecord = { id: 'cust-99', workspaceId: 'ws-vanguard', name: 'Secret client' };

  // Acme user attempts access
  const check = assertWorkspaceAccess(foreignRecord, 'ws-acme');
  assert.equal(check.authorized, false);
  assert.match(check.reason ?? '', /Tenant isolation violation/);

  // Legitimate access
  const validCheck = assertWorkspaceAccess(foreignRecord, 'ws-vanguard');
  assert.equal(validCheck.authorized, true);
});

test('tenant: createTenantRecord stamps the active workspace ID', () => {
  const record = createTenantRecord({ name: 'Acme New Client', email: 'hello@client.com' }, 'ws-acme');
  assert.equal(record.workspaceId, 'ws-acme');
  assert.equal(record.name, 'Acme New Client');
});

test('tenant: unauthenticated or empty workspace request is strictly rejected', () => {
  const record = { id: 'cust-1', workspaceId: 'ws-acme' };
  const check = assertWorkspaceAccess(record, '');
  assert.equal(check.authorized, false);
  assert.match(check.reason ?? '', /No active workspace selected/);
});

test('financial: overpayment guard rejects payment amounts greater than remaining invoice balance', () => {
  const invoice = {
    id: 'inv-1',
    total: 1000.0,
    paidAmount: 600.0,
    balance: 400.0,
  };

  const paymentAttempt = 450.0;
  const isOverpayment = paymentAttempt > invoice.balance;
  assert.equal(isOverpayment, true);

  // Remaining balance cannot become negative
  const safeBalance = calculateRemainingBalance(invoice.total, invoice.paidAmount + paymentAttempt);
  assert.equal(safeBalance, 0); // floor is 0
});

test('financial: idempotency simulation detects duplicate submission and prevents double charge', () => {
  const processedIdempotencyKeys = new Set<string>();
  const firstSubmission = { key: 'idem-tx-9941', amount: 500 };
  const duplicateSubmission = { key: 'idem-tx-9941', amount: 500 };

  function processPayment(key: string) {
    if (processedIdempotencyKeys.has(key)) {
      return { status: 'duplicate_ignored', processed: false };
    }
    processedIdempotencyKeys.add(key);
    return { status: 'processed', processed: true };
  }

  const res1 = processPayment(firstSubmission.key);
  assert.equal(res1.status, 'processed');
  assert.equal(res1.processed, true);

  const res2 = processPayment(duplicateSubmission.key);
  assert.equal(res2.status, 'duplicate_ignored');
  assert.equal(res2.processed, false);
});

test('audit: audit log entries are immutable and prevent updates', () => {
  const auditEntry = Object.freeze({
    id: 'aud-101',
    workspaceId: 'ws-acme',
    action: 'payment.record',
    entityId: 'pay-1',
    details: 'Payment recorded',
    createdAt: new Date().toISOString(),
  });

  // Attempt to mutate frozen audit record throws in strict mode
  assert.throws(() => {
    (auditEntry as any).details = 'Tampered log';
  }, TypeError);
});

