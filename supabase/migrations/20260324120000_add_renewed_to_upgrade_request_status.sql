-- Renovação de ciclo (mesmo plano) — histórico financeiro / webhook
ALTER TYPE upgrade_request_status ADD VALUE IF NOT EXISTS 'renewed';
