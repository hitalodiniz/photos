-- Corrige erro: operator does not exist: text[] @> jsonb
-- A política de INSERT em tb_galeria_stats provavelmente usava
-- ignored_visitor_ids @> to_jsonb(visitor_id), o que é inválido.
-- Correto: NOT (visitor_id = ANY(ignored_visitor_ids))

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'tb_galeria_stats'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON tb_galeria_stats', pol.policyname);
  END LOOP;
END $$;

-- Recria política de INSERT: permite inserir quando visitor_id não está em ignored_visitor_ids do dono da galeria
DROP POLICY IF EXISTS "Allow insert galeria stats when visitor not ignored" ON tb_galeria_stats;

CREATE POLICY "Allow insert galeria stats when visitor not ignored"
ON tb_galeria_stats
FOR INSERT
WITH CHECK (
  NOT (
    visitor_id = ANY(
      COALESCE(
        (
          SELECT p.ignored_visitor_ids
          FROM tb_galerias g
          JOIN tb_profiles p ON p.id = g.user_id
          WHERE g.id = galeria_id
        ),
        ARRAY[]::text[]
      )
    )
  )
);

COMMENT ON POLICY "Allow insert galeria stats when visitor not ignored" ON tb_galeria_stats IS
  'Permite inserção quando visitor_id não está na lista ignored_visitor_ids do fotógrafo (evita operator text[] @> jsonb).';
