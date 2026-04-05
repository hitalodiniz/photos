-- Usuário isento: acesso vitalício ao plan_key atual; não aplica expiração/downgrade.
ALTER TABLE tb_profiles
ADD COLUMN IF NOT EXISTS is_exempt boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN tb_profiles.is_exempt IS 'Se true, acesso ao plan_key atual é vitalício e não sofre downgrade por expiração.';
