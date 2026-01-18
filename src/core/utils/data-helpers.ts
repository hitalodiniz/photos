export const getTimestamp = () => {
  const agora = new Date();
  const data = agora.toISOString().split('T')[0].replace(/-/g, ''); // 20260110
  const hora = agora.getHours().toString().padStart(2, '0');
  const min = agora.getMinutes().toString().padStart(2, '0');
  return `${data}_${hora}${min}`;
};

export const formatDateLong = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
  });
};
