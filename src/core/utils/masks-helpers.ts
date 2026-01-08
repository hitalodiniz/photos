export const normalizePhoneNumber = (value: string | undefined) => {
  if (!value) return "";

  return value
    .replace(/[\D]/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})(\d+?)/, "$1");
};

export const maskPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value;

  // 1. Remove tudo que não é número
  value = value.replace(/\D/g, "");

  // 2. Limita a 11 dígitos
  value = value.slice(0, 11);

  // 3. Aplica a máscara (XX) XXXXX-XXXX
  value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
  value = value.replace(/(\d)(\d{4})$/, "$1-$2");

  return value;
};