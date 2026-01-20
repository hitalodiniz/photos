-- Tabela para armazenar leads capturados das galerias
CREATE TABLE IF NOT EXISTS tb_galeria_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  galeria_id UUID NOT NULL REFERENCES tb_galerias(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_galeria_leads_galeria_id ON tb_galeria_leads(galeria_id);
CREATE INDEX IF NOT EXISTS idx_galeria_leads_email ON tb_galeria_leads(email);
CREATE INDEX IF NOT EXISTS idx_galeria_leads_created_at ON tb_galeria_leads(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_galeria_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tb_galeria_leads_updated_at
  BEFORE UPDATE ON tb_galeria_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_galeria_leads_updated_at();

-- Adicionar coluna enable_lead_capture na tabela tb_galerias se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tb_galerias' AND column_name = 'enable_lead_capture'
  ) THEN
    ALTER TABLE tb_galerias ADD COLUMN enable_lead_capture BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON TABLE tb_galeria_leads IS 'Armazena leads capturados de visualizadores de galerias';
COMMENT ON COLUMN tb_galeria_leads.galeria_id IS 'Referência à galeria que capturou o lead';
COMMENT ON COLUMN tb_galeria_leads.name IS 'Nome do lead';
COMMENT ON COLUMN tb_galeria_leads.email IS 'Email do lead';
COMMENT ON COLUMN tb_galeria_leads.whatsapp IS 'WhatsApp do lead (opcional)';
COMMENT ON COLUMN tb_galerias.enable_lead_capture IS 'Indica se a galeria deve capturar leads antes de liberar acesso';

-- 🎯 RLS (Row Level Security) - Permite inserção pública de leads
-- Habilita RLS na tabela
ALTER TABLE tb_galeria_leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERT público (qualquer pessoa pode criar um lead)
CREATE POLICY "Permitir inserção pública de leads"
  ON tb_galeria_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política para permitir SELECT apenas para o dono da galeria
-- (fotógrafo pode ver seus próprios leads)
CREATE POLICY "Fotógrafos podem ver leads de suas galerias"
  ON tb_galeria_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tb_galerias
      WHERE tb_galerias.id = tb_galeria_leads.galeria_id
      AND tb_galerias.user_id = auth.uid()
    )
  );
