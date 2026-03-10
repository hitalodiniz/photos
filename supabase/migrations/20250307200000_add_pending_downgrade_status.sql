-- Adiciona o valor 'pending_downgrade' ao enum upgrade_request_status
-- (solicitação de downgrade agendada para o fim do período atual)
ALTER TYPE upgrade_request_status ADD VALUE IF NOT EXISTS 'pending_downgrade';
