import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createSupabaseServerClient } from '@/lib/supabase.server';

export async function GET() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('tb_profiles')
    .select('google_refresh_token')
    .eq('id', user.id)
    .single();

  if (error || !profile?.google_refresh_token) {
    return NextResponse.json(
      { error: 'Refresh token não encontrado' },
      { status: 400 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI! // mesmo redirect configurado no Google
  );

  oauth2Client.setCredentials({
    refresh_token: profile.google_refresh_token,
  });

  // Troca refresh_token por access_token
  const { credentials } = await oauth2Client.getAccessToken();

  if (!credentials.access_token) {
    return NextResponse.json(
      { error: 'Falha ao obter access token' },
      { status: 500 }
    );
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.list({
    pageSize: 10,
    fields: 'files(id, name, mimeType)',
  });

  return NextResponse.json({ files: response.data.files || [] });
}
