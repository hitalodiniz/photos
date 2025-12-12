


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_uid"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return auth.uid();
end;
$$;


ALTER FUNCTION "public"."get_uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.tb_profiles (id, email, username, studio_id)
  VALUES (
    NEW.id,
    NEW.email,
    -- Pega o primeiro segmento do e-mail e remove caracteres especiais para o username
    LOWER(regexp_replace(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g')),
    '00000000-0000-0000-0000-000000000000'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."tb_galerias" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "studio_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "date" "date" NOT NULL,
    "location" "text",
    "client_name" "text" NOT NULL,
    "client_whatsapp" "text",
    "drive_folder_id" "text" NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "password" "text",
    "cover_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tb_galerias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tb_profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "studio_id" "uuid" NOT NULL,
    "full_name" "text",
    "website" "text",
    "mini_bio" "text",
    "profile_picture_url" "text",
    "phone_contact" "text",
    "instagram_link" "text",
    "operating_cities" "text"[],
    "updated_at" timestamp with time zone,
    "email" "text" NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."tb_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tb_studios" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "plan_level" "text" DEFAULT 'Free'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tb_studios" OWNER TO "postgres";


ALTER TABLE ONLY "public"."tb_galerias"
    ADD CONSTRAINT "tb_galerias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tb_galerias"
    ADD CONSTRAINT "tb_galerias_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."tb_profiles"
    ADD CONSTRAINT "tb_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."tb_profiles"
    ADD CONSTRAINT "tb_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tb_profiles"
    ADD CONSTRAINT "tb_profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."tb_studios"
    ADD CONSTRAINT "tb_studios_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tb_studios"
    ADD CONSTRAINT "tb_studios_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_galerias_studio_id" ON "public"."tb_galerias" USING "btree" ("studio_id");



CREATE INDEX "idx_galerias_user_id" ON "public"."tb_galerias" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_profiles_username" ON "public"."tb_profiles" USING "btree" ("username");



ALTER TABLE ONLY "public"."tb_galerias"
    ADD CONSTRAINT "tb_galerias_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."tb_studios"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tb_galerias"
    ADD CONSTRAINT "tb_galerias_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."tb_profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tb_profiles"
    ADD CONSTRAINT "tb_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tb_profiles"
    ADD CONSTRAINT "tb_profiles_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."tb_studios"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tb_profiles"
    ADD CONSTRAINT "tb_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Enable insert for authenticated users" ON "public"."tb_profiles" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "cannot delete profile" ON "public"."tb_profiles" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "select own profile" ON "public"."tb_profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."tb_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update own profile" ON "public"."tb_profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."tb_galerias" TO "anon";
GRANT ALL ON TABLE "public"."tb_galerias" TO "authenticated";
GRANT ALL ON TABLE "public"."tb_galerias" TO "service_role";



GRANT ALL ON TABLE "public"."tb_profiles" TO "anon";
GRANT ALL ON TABLE "public"."tb_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."tb_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tb_studios" TO "anon";
GRANT ALL ON TABLE "public"."tb_studios" TO "authenticated";
GRANT ALL ON TABLE "public"."tb_studios" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Gestao de fotos 1pmf6kr_0"
  on "storage"."objects"
  as permissive
  for select
  to anon
using (((bucket_id = 'profile_pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Gestao de fotos 1pmf6kr_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'profile_pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Gestao de fotos 1pmf6kr_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'profile_pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



