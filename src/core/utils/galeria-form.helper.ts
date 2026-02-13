/**
 * Helpers para extração e formatação de dados de galerias
 */

/**
 * Extrai e formata dados do FormData para criar/atualizar galeria
 */
export function extractGalleryFormData(formData: FormData) {
  // 1. Extração de IDs de capa
  const rawIds = formData.get('cover_image_ids') as string;
  let coverIds: string[] = [];

  try {
    const parsed = JSON.parse(rawIds);
    coverIds = Array.isArray(parsed) ? parsed : [];
  } catch {
    coverIds = [];
  }

  // 2. Formatação para PostgreSQL (tipo text[])
  const coverIdsPostgres = `{${coverIds.map((id) => `"${id}"`).join(',')}}`;

  // 3. Normalização de telefone
  const normalizePhone = (value: string | null): string | null => {
    if (!value) return null;
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 11) {
      return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    }
    return cleaned || null;
  };

  // 4. Extração de campos
  return {
    // Campos obrigatórios
    title: formData.get('title') as string,
    date: new Date(formData.get('date') as string).toISOString(),
    drive_folder_id: formData.get('drive_folder_id') as string,
    drive_folder_name: formData.get('drive_folder_name') as string,

    // Campos de identificação
    client_name: (formData.get('client_name') as string) || 'Cobertura',
    client_whatsapp: normalizePhone(formData.get('client_whatsapp') as string),
    location: (formData.get('location') as string) || '',
    category: (formData.get('category') as string) || 'evento',

    // Campos de capa
    cover_image_ids: coverIdsPostgres,
    cover_image_url:
      coverIds.length > 0
        ? coverIds[0]
        : (formData.get('cover_image_url') as string) || null,
    photo_count: Number(formData.get('photo_count')) || 0,

    // Campos booleanos de visibilidade
    is_public: formData.get('is_public') === 'true',
    show_on_profile: formData.get('show_on_profile') === 'true',
    has_contracting_client: formData.get('has_contracting_client') === 'true',

    // Customização visual
    show_cover_in_grid: formData.get('show_cover_in_grid') === 'true',
    grid_bg_color: (formData.get('grid_bg_color') as string) || '#F3E5AB',
    columns_mobile: Number(formData.get('columns_mobile')) || 2,
    columns_tablet: Number(formData.get('columns_tablet')) || 3,
    columns_desktop: Number(formData.get('columns_desktop')) || 4,

    // Links de download
    zip_url_full: (formData.get('zip_url_full') as string) || null,

    // Captura de leads
    leads_enabled: formData.get('leads_enabled') === 'true',
    leads_require_name: formData.get('leads_require_name') === 'true',
    leads_require_email: formData.get('leads_require_email') === 'true',
    leads_require_whatsapp: formData.get('leads_require_whatsapp') === 'true',
    lead_purpose: (formData.get('lead_purpose') as string) || null,

    // Funcionalidades
    rename_files_sequential: formData.get('rename_files_sequential') === 'true',
    enable_favorites: formData.get('enable_favorites') === 'true',
    enable_slideshow: formData.get('enable_slideshow') === 'true',

    // Tags
    gallery_tags: (formData.get('gallery_tags') as string) || null,
    photo_tags: (formData.get('photo_tags') as string) || null,

    // Senha (para processamento posterior)
    _password: formData.get('password') as string,
  };
}

/**
 * Valida campos obrigatórios de uma galeria
 */
export function validateGalleryData(
  data: ReturnType<typeof extractGalleryFormData>,
) {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length < 3) {
    errors.push('O título da galeria é obrigatório (mín. 3 caracteres).');
  }

  if (!data.date) {
    errors.push('A data do evento é obrigatória.');
  }

  if (!data.drive_folder_id || data.drive_folder_id === 'undefined') {
    errors.push('Você precisa selecionar uma pasta do Google Drive.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    firstError: errors[0] || null,
  };
}

/**
 * Processa a senha para insert/update
 */
export function processPassword(
  extractedData: ReturnType<typeof extractGalleryFormData>,
  isUpdate: boolean = false,
): string | null {
  const { is_public, _password } = extractedData;

  // Se é público, remove a senha
  if (is_public) {
    return null;
  }

  // Se é privado e há senha nova, usa ela
  if (_password && _password.trim() !== '') {
    return _password.trim();
  }

  // Se é update e não há senha nova, não atualiza (retorna undefined)
  // Se é insert e não há senha, retorna null
  return isUpdate ? undefined : null;
}
