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
  return data
    .filter((item: any) =>
      item.nome.toLowerCase().includes(query.toLowerCase()),
    )
    .map((item: any) => `${item.nome}, ${uf}`);
};
