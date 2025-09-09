import { CountryCode, DialCode } from "../enums/dial-codes.enum";

export function getCountryByPhoneNumber(phoneNumber: string): {
  countryCode: CountryCode;
  dialCode: DialCode;
} | null {
  if (!phoneNumber.startsWith("+")) {
    phoneNumber = "+" + phoneNumber;
  }

  // Convert enums to array of [country, dialCode]
  const entries = Object.entries(DialCode) as [keyof typeof DialCode, string][];

  // Sort by dial code length (longest first to avoid partial matches)
  entries.sort((a, b) => b[1].length - a[1].length);

  for (const [countryKey, dialCode] of entries) {
    if (phoneNumber.startsWith(dialCode)) {
      return {
        countryCode: CountryCode[countryKey],
        dialCode: dialCode as DialCode,
      };
    }
  }

  return null; // No match found
}
