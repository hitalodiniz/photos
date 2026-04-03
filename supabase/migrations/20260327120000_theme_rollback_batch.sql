-- Colunas para lembrar o último tema pago (PRO/PREMIUM) antes de um downgrade.
ALTER TABLE public.tb_profiles
  ADD COLUMN IF NOT EXISTS last_paid_theme_key text;

ALTER TABLE public.tb_galerias
  ADD COLUMN IF NOT EXISTS last_paid_theme_key text;

COMMENT ON COLUMN public.tb_profiles.last_paid_theme_key IS 'Último theme_key pago (Elite) antes de downgrade; usado na reativação.';
COMMENT ON COLUMN public.tb_galerias.last_paid_theme_key IS 'Último theme_key pago (Elite) da galeria antes de downgrade; usado na reativação.';

-- Atualização em lote: persiste tema não padrão em last_paid_theme_key e força PHOTOGRAPHER.
CREATE OR REPLACE FUNCTION public.apply_theme_rollback_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tb_galerias g
  SET
    last_paid_theme_key = CASE
      WHEN g.theme_key IS NOT NULL
        AND trim(g.theme_key) <> ''
        AND upper(trim(g.theme_key)) <> 'PHOTOGRAPHER'
      THEN trim(g.theme_key)
      ELSE g.last_paid_theme_key
    END,
    theme_key = 'PHOTOGRAPHER',
    updated_at = now()
  WHERE g.user_id = p_user_id;
END;
$$;

-- Restaura galerias a partir do last_paid_theme_key salvo (reativação PRO/PREMIUM).
CREATE OR REPLACE FUNCTION public.restore_gallery_themes_from_last_paid(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tb_galerias g
  SET
    theme_key = trim(g.last_paid_theme_key),
    last_paid_theme_key = NULL,
    updated_at = now()
  WHERE g.user_id = p_user_id
    AND g.last_paid_theme_key IS NOT NULL
    AND trim(g.last_paid_theme_key) <> '';
END;
$$;
