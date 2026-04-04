-- Ciclo de assinatura vigente: uma linha por perfil com is_current = true.

ALTER TABLE public.tb_upgrade_requests
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tb_upgrade_requests.is_current IS 'Indica o registro que representa o ciclo de assinatura vigente no histórico (um por profile_id).';

CREATE OR REPLACE FUNCTION public.set_upgrade_request_as_current(
  p_profile_id uuid,
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tb_upgrade_requests
  SET is_current = false,
      updated_at = now()
  WHERE profile_id = p_profile_id;

  UPDATE public.tb_upgrade_requests
  SET is_current = true,
      updated_at = now()
  WHERE id = p_request_id
    AND profile_id = p_profile_id;
END;
$$;

-- activate_plan_from_payment: ao aprovar/renovar, centraliza is_current na linha do pagamento.
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
  IF p_asaas_payment_id IS NOT NULL AND trim(p_asaas_payment_id) <> '' THEN
    SELECT * INTO v_request
    FROM public.tb_upgrade_requests
    WHERE asaas_payment_id = p_asaas_payment_id
    LIMIT 1;
  END IF;

  IF v_request.id IS NULL AND p_asaas_subscription_id IS NOT NULL AND trim(p_asaas_subscription_id) <> '' THEN
    SELECT * INTO v_request
    FROM public.tb_upgrade_requests
    WHERE asaas_subscription_id = p_asaas_subscription_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

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

    UPDATE public.tb_upgrade_requests
    SET is_current = false,
        updated_at = now()
    WHERE profile_id = v_request.profile_id;

    UPDATE public.tb_upgrade_requests
    SET is_current = true,
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

-- Backfill: perfis pagos — marca a linha mais recente “ativa” como vigente.
UPDATE public.tb_upgrade_requests SET is_current = false;

WITH ranked AS (
  SELECT
    ur.id,
    ROW_NUMBER() OVER (
      PARTITION BY ur.profile_id
      ORDER BY
        CASE
          WHEN ur.status IN ('approved', 'renewed') THEN 1
          WHEN ur.status IN ('pending_downgrade', 'pending_cancellation') THEN 2
          WHEN ur.status = 'pending_change' THEN 3
          WHEN ur.status IN ('pending', 'processing') THEN 4
          ELSE 5
        END,
        ur.created_at DESC
    ) AS rn
  FROM public.tb_upgrade_requests ur
  INNER JOIN public.tb_profiles p ON p.id = ur.profile_id
  WHERE p.plan_key IS DISTINCT FROM 'FREE'
    AND ur.status NOT IN ('cancelled', 'rejected')
)
UPDATE public.tb_upgrade_requests u
SET is_current = true
FROM ranked r
WHERE u.id = r.id
  AND r.rn = 1;
