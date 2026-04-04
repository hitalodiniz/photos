-- Texto editorial exibido na galeria pública (abaixo da toolbar, acima do grid).
ALTER TABLE public.tb_galerias
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.tb_galerias.description IS 'Descrição editorial opcional na página pública da galeria.';
