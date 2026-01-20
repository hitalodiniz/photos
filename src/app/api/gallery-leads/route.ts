import { NextRequest, NextResponse } from 'next/server';
import { createGalleryLead } from '@/core/services/gallery-lead.service';
import type { CreateGalleryLeadInput } from '@/core/types/gallery-lead';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /gallery-leads] Recebendo requisição POST');
    const body: CreateGalleryLeadInput = await request.json();
    console.log('[API /gallery-leads] Body recebido:', {
      galeria_id: body.galeria_id,
      name: body.name,
      email: body.email,
      hasWhatsapp: !!body.whatsapp,
    });

    // Validação básica
    if (!body.galeria_id || !body.name || !body.email) {
      console.error('[API /gallery-leads] Validação falhou:', body);
      return NextResponse.json(
        { success: false, error: 'Dados obrigatórios não fornecidos' },
        { status: 400 },
      );
    }

    const result = await createGalleryLead(body);
    console.log('[API /gallery-leads] Resultado:', {
      success: result.success,
      error: result.error,
      hasLead: !!result.lead,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: true, message: result.message, lead: result.lead },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API /gallery-leads] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
