// ============================================
// REUSA - Validators Utility
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Debe tener al menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 12 && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { isValid: false, error: 'Debe tener al menos 3 caracteres' };
  }

  if (username.length > 20) {
    return { isValid: false, error: 'Máximo 20 caracteres' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Solo letras, números y guión bajo' };
  }

  if (/^[0-9]/.test(username)) {
    return { isValid: false, error: 'No puede empezar con un número' };
  }

  return { isValid: true };
}

/**
 * Validate phone number (Argentina)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');

  // Argentina phone numbers
  if (cleaned.startsWith('54')) {
    return cleaned.length === 12; // +54 + 10 digits
  }

  return cleaned.length === 10;
}

/**
 * Validate price
 */
export function isValidPrice(price: number | string): boolean {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice > 0 && numPrice < 100000000; // Max 100M
}

/**
 * Validate product title
 */
export function validateProductTitle(title: string): {
  isValid: boolean;
  error?: string;
} {
  if (title.length < 3) {
    return { isValid: false, error: 'Debe tener al menos 3 caracteres' };
  }

  if (title.length > 100) {
    return { isValid: false, error: 'Máximo 100 caracteres' };
  }

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{4,}/i, // Same character 5+ times
    /(\b\w+\b)(\s+\1){2,}/i, // Same word repeated 3+ times
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(title)) {
      return { isValid: false, error: 'Evita repeticiones innecesarias' };
    }
  }

  return { isValid: true };
}

/**
 * Validate product description
 */
export function validateProductDescription(description: string): {
  isValid: boolean;
  error?: string;
} {
  if (description.length < 10) {
    return { isValid: false, error: 'Debe tener al menos 10 caracteres' };
  }

  if (description.length > 2000) {
    return { isValid: false, error: 'Máximo 2000 caracteres' };
  }

  return { isValid: true };
}

/**
 * Validate review rating
 */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize input (remove potentially harmful characters)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}
