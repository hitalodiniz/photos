-- Adiciona o campo full_name em tb_billing_profiles para o nome usado na cobrança/NF-e
-- (pode ser diferente do nome do perfil).
-- Execute no Supabase SQL Editor ou via: supabase db push

ALTER TABLE tb_billing_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

COMMENT ON COLUMN tb_billing_profiles.full_name IS 'Nome completo para cobrança e NF-e (pode diferir do nome do perfil).';
