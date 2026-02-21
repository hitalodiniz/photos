export const fetchStates = async () => {
  const response = await fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
  );
  return await response.json();
};

export const fetchCitiesByState = async (uf: string, query: string) => {
  if (query.length < 2) return [];
  const response = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
  );
  const data = await response.json();

  const normalize = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const normalizedQuery = normalize(query);

  return data
    .filter((item: any) => normalize(item.nome).includes(normalizedQuery))
    .map((item: any) => `${item.nome}, ${uf}`);
};

export const normalize = (text: string) =>
  text
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim() || '';
