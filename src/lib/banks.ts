// src/lib/banks.ts
// Curated directory of Nigerian commercial & digital banks compatible with Bachs.io Payouts.
// Codes match Bachs / NIP central clearing codes.

export interface BankItem {
  name: string;
  code: string;
  popular?: boolean;
}

export const POPULAR_NIGERIAN_BANKS: BankItem[] = [
  { name: "OPay (PayCom)", code: "100004", popular: true },
  { name: "Moniepoint Microfinance Bank", code: "090405", popular: true },
  { name: "PalmPay", code: "100033", popular: true },
  { name: "Kuda Bank", code: "090267", popular: true },
  { name: "Guaranty Trust Bank (GTBank)", code: "058", popular: true },
  { name: "Zenith Bank", code: "057", popular: true },
  { name: "Access Bank", code: "044", popular: true },
  { name: "United Bank for Africa (UBA)", code: "033", popular: true },
  { name: "First Bank of Nigeria", code: "011", popular: true },
  { name: "Providus Bank", code: "101", popular: true },
  { name: "Stanbic IBTC Bank", code: "221", popular: true },
  { name: "Fidelity Bank", code: "070", popular: true },
  { name: "First City Monument Bank (FCMB)", code: "214", popular: true },
  { name: "Sterling Bank", code: "232", popular: true },
  { name: "Wema Bank", code: "035", popular: true },
  { name: "Union Bank of Nigeria", code: "032", popular: true },
  { name: "Ecobank Nigeria", code: "050", popular: true },
  { name: "Keystone Bank", code: "082", popular: true },
  { name: "Globus Bank", code: "103", popular: true },
  { name: "Jaiz Bank", code: "301", popular: true },
  { name: "Taj Bank", code: "302", popular: true },
  { name: "Lotus Bank", code: "303", popular: true },
  { name: "VFD Microfinance Bank", code: "566", popular: true },
  { name: "Rubies Bank", code: "125", popular: true },
  { name: "FairMoney Microfinance Bank", code: "090551", popular: true },
  { name: "Carbon (One Finance)", code: "100026", popular: true },
  { name: "Parallex Bank", code: "526", popular: true },
  { name: "Signature Bank", code: "000034", popular: true },
  { name: "Optimus Bank", code: "000036", popular: true },
  { name: "Premium Trust Bank", code: "000031", popular: true },
];

/**
 * Normalizes and resolves a bank name to its verified NIP bank code.
 */
export function resolveBankCode(bankNameOrCode: string): string | null {
  if (!bankNameOrCode) return null;
  const query = bankNameOrCode.trim().toLowerCase();

  // If already a numeric code
  if (/^\d{3,6}$/.test(query)) {
    return query;
  }

  // Exact or substring match in popular banks
  const matched = POPULAR_NIGERIAN_BANKS.find(
    (b) => b.name.toLowerCase() === query || b.name.toLowerCase().includes(query) || query.includes(b.name.toLowerCase())
  );

  return matched ? matched.code : null;
}

