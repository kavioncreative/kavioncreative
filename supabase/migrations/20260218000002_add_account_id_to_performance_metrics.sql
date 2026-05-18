ALTER TABLE performance_metrics ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
