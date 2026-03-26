-- Primeira cobrança paga com o mesmo plano durante trial NÃO é renovação (status approved).
-- remove concatenação em notes (coluna guarda JSON v1; texto livre quebrava o parse).

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
  v_is_renovacao boolean;
  v_profile_trial boolean;
BEGIN
  SELECT * INTO v_request
  FROM public.tb_upgrade_requests
  WHERE asaas_payment_id = p_asaas_payment_id
     OR (asaas_subscription_id = p_asaas_subscription_id AND p_asaas_subscription_id IS NOT NULL)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_request.id IS NULL THEN
    RAISE WARNING 'Registro não encontrado para payment % / subscription %', p_asaas_payment_id, p_asaas_subscription_id;
    RETURN;
  END IF;

  SELECT COALESCE(p.is_trial, false) INTO v_profile_trial
  FROM public.tb_profiles p
  WHERE p.id = v_request.profile_id;

  v_is_renovacao :=
    (v_request.plan_key_current = v_request.plan_key_requested)
    AND NOT COALESCE(v_profile_trial, false);

  UPDATE public.tb_upgrade_requests
  SET asaas_raw_status = p_asaas_status,
      updated_at = now()
  WHERE id = v_request.id;

  IF p_asaas_status IN ('CONFIRMED', 'RECEIVED') THEN
    IF v_request.status IN ('approved', 'renewed') THEN
      RETURN;
    END IF;

    UPDATE public.tb_profiles
    SET plan_key = v_request.plan_key_requested,
        is_trial = false,
        plan_trial_expires = NULL,
        updated_at = now()
    WHERE id = v_request.profile_id;

    UPDATE public.tb_upgrade_requests
    SET status = CASE
          WHEN v_is_renovacao THEN 'renewed'::upgrade_request_status
          ELSE 'approved'::upgrade_request_status
        END,
        processed_at = now(),
        updated_at = now()
    WHERE id = v_request.id;

  ELSIF p_asaas_status IN ('OVERDUE', 'REFUNDED', 'CHARGEBACK_REQUESTED') THEN
    UPDATE public.tb_upgrade_requests
    SET status = 'rejected',
        updated_at = now()
    WHERE id = v_request.id
      AND status NOT IN ('approved', 'renewed');
  END IF;
END;
$$;
