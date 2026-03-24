-- RPC usada pelo webhook Asaas (activate_plan_from_payment).
-- Enum upgrade_request_status usa 'renewed' (minúsculo), alinhado a src/core/types/billing.ts.

CREATE OR REPLACE FUNCTION public.activate_plan_from_payment(
  p_asaas_payment_id text,
  p_asaas_status text,
  p_asaas_subscription_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_request public.tb_upgrade_requests%ROWTYPE;
  v_is_renovacao BOOLEAN;
BEGIN
  -- 1) Busca o registro da solicitação
  SELECT * INTO v_request
  FROM public.tb_upgrade_requests
  WHERE asaas_payment_id = p_asaas_payment_id
     OR (asaas_subscription_id = p_asaas_subscription_id AND p_asaas_subscription_id IS NOT NULL)
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2) Validação de existência
  IF v_request.id IS NULL THEN
    RAISE WARNING 'Registro não encontrado para payment % / subscription %', p_asaas_payment_id, p_asaas_subscription_id;
    RETURN;
  END IF;

  -- Identifica se é uma renovação (mesmo plano)
  v_is_renovacao := (v_request.plan_key_current = v_request.plan_key_requested);

  -- Atualiza status bruto (asaas_raw_status)
  UPDATE public.tb_upgrade_requests
  SET asaas_raw_status = p_asaas_status,
      updated_at = now()
  WHERE id = v_request.id;

  -- 3) Processamento de Sucesso (CONFIRMED / RECEIVED)
  IF p_asaas_status IN ('CONFIRMED', 'RECEIVED') THEN
    IF v_request.status IN ('approved', 'renewed') THEN
      RETURN;
    END IF;

    -- Lógica de Atualização do Perfil
    UPDATE public.tb_profiles
    SET plan_key = v_request.plan_key_requested,
        is_trial = false,
        plan_trial_expires = NULL,
        updated_at = now()
    WHERE id = v_request.profile_id;

    -- Atualiza a solicitação para 'approved' ou 'renewed'
    UPDATE public.tb_upgrade_requests
    SET status = CASE WHEN v_is_renovacao THEN 'renewed'::upgrade_request_status ELSE 'approved'::upgrade_request_status END,
        processed_at = now(),
        updated_at = now(),
        notes = CASE
                  WHEN v_is_renovacao THEN COALESCE(notes, '') || ' | Renovação de manutenção processada.'
                  WHEN v_request.status = 'cancelled' THEN COALESCE(notes, '') || ' | Reativado via webhook.'
                  ELSE notes
                END
    WHERE id = v_request.id;

  -- 4) Tratamento de Inadimplência / Estorno
  ELSIF p_asaas_status IN ('OVERDUE', 'REFUNDED', 'CHARGEBACK_REQUESTED') THEN
    UPDATE public.tb_upgrade_requests
    SET status = 'rejected',
        updated_at = now()
    WHERE id = v_request.id
      AND status NOT IN ('approved', 'renewed');
  END IF;
END;
$$;
