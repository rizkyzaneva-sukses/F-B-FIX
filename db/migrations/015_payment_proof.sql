-- Migration 015: Payment Proof Upload
alter table receivable_payments add column if not exists payment_proof_url text;
alter table payable_payments add column if not exists payment_proof_url text;
