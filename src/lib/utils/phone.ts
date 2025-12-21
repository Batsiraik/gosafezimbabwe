/**
 * Formats a Zimbabwean phone number to the standard +263 format
 * Accepts: +263776954448, 0776954448, 263776954448
 * Returns: +263776954448
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all spaces, dashes, and other non-digit characters except +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If it starts with +263, return as is
  if (cleaned.startsWith('+263')) {
    return cleaned;
  }
  
  // If it starts with 263 (without +), add the +
  if (cleaned.startsWith('263')) {
    return '+' + cleaned;
  }
  
  // If it starts with 0, replace with +263
  if (cleaned.startsWith('0')) {
    return '+263' + cleaned.substring(1);
  }
  
  // If it's just 9 digits, assume it's missing the country code and add +263
  if (cleaned.length === 9 && /^\d+$/.test(cleaned)) {
    return '+263' + cleaned;
  }
  
  // If it's 10 digits starting with 7, assume it's missing the country code
  if (cleaned.length === 10 && cleaned.startsWith('7')) {
    return '+263' + cleaned;
  }
  
  // Return cleaned number (fallback)
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

/**
 * Validates if a phone number is a valid Zimbabwean number
 */
export function isValidZimbabwePhone(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Zimbabwe numbers: +263 followed by 9 digits (mobile numbers start with 7)
  const zimbabwePhoneRegex = /^\+2637\d{8}$/;
  return zimbabwePhoneRegex.test(formatted);
}
