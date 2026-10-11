const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value).trim());
}

// US numbers only: 10 digits, optionally prefixed with the country code 1.
// Common separators (spaces, dashes, dots, parentheses) are allowed.
export function isValidPhone(value) {
  const phone = String(value).trim();
  if (!PHONE_PATTERN.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return digits.length === 11 && digits[0] === '1';
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}
