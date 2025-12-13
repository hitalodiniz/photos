// app/api/galeria/[id]/photos/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase.server";
import { listPhotosFromDriveFolder } from "@/lib/google-drive";
import { getDriveAccessTokenForUser } from "@/lib/google-auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClientReadOnly();

  const { data: galeria } = await supabase
    .from("tb_galerias")
    .select("id, drive_folder_id, user_id")
    .eq("id", params.id)
    .single();

  if (!galeria || !galeria.drive_folder_id) {
    return NextResponse.json({ photos: [] });
  }

  const accessToken = await getDriveAccessTokenForUser(galeria.user_id);

  if (!accessToken) {
    return NextResponse.json({ photos: [] });
  }

  const photos = await listPhotosFromDriveFolder(
    galeria.drive_folder_id,
    accessToken
  );

  return NextResponse.json({ photos });
}
