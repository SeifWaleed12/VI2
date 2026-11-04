// Egypt's governorates and the phone check, shared by checkout and the account pages.

export const governorates = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Qalyubia",
  "Sharqia",
  "Dakahlia",
  "Gharbia",
  "Monufia",
  "Beheira",
  "Fayoum",
  "Beni Suef",
  "Minya",
  "Assiut",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
  "Red Sea",
  "Suez",
  "Ismailia",
  "Port Said",
];

export function normalizeEgyptPhone(
  value: string,
) {
  return value.replace(
    /[\s\-()]/g,
    "",
  );
}

export function isValidEgyptPhone(
  value: string,
) {
  const phone =
    normalizeEgyptPhone(value);

  return (
    /^01[0125]\d{8}$/.test(phone) ||
    /^\+201[0125]\d{8}$/.test(phone) ||
    /^00201[0125]\d{8}$/.test(phone)
  );
}
