export const normalizePhoneNumber = (value: string | undefined) => {
  if (!value) return "";

  // 1. Remove tudo que não é número
  let digits = value.replace(/\D/g, "");
  
  // 2. Trata prefixo internacional (ex: 55)
  // Se começar com 55 e tiver 12 ou 13 dígitos, removemos o 55 para exibição nacional
  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  // 3. Aplica máscara dinâmica (8 ou 9 dígitos)
  if (digits.length <= 10) {
    // Máscara (XX) XXXX-XXXX (fixo)
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(-\d{4})(\d+?)/, "$1");
  } else {
    // Máscara (XX) XXXXX-XXXX (celular)
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})(\d+?)/, "$1");
  }
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