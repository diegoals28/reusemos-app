// ============================================
// REUSA - Formatters Utility
// ============================================

/**
 * Format price in Argentine Pesos
 */
export function formatPrice(price: number, showDecimals = false): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(price);
}

/**
 * Format compact number (1K, 1M, etc.)
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

/**
 * Format date relative to now
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHour < 24) return `Hace ${diffHour} h`;
  if (diffDay === 1) return 'Ayer';
  if (diffDay < 7) return `Hace ${diffDay} días`;
  if (diffWeek < 4) return `Hace ${diffWeek} sem`;
  if (diffMonth < 12) return `Hace ${diffMonth} meses`;

  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return d.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      });
    case 'long':
      return d.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    case 'time':
      return d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      });
  }
}

/**
 * Format distance
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format for Argentina
  if (cleaned.startsWith('54')) {
    const withoutCountry = cleaned.slice(2);
    if (withoutCountry.length === 10) {
      return `+54 ${withoutCountry.slice(0, 2)} ${withoutCountry.slice(2, 6)}-${withoutCountry.slice(6)}`;
    }
  }

  // Default format
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string, maxChars = 2): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts
      .slice(0, maxChars)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
  return name.slice(0, maxChars).toUpperCase();
}

/**
 * Format username
 */
export function formatUsername(username: string): string {
  if (username.startsWith('@')) return username;
  return `@${username}`;
}

/**
 * Format CO2 saved
 */
export function formatCO2(kg: number): string {
  if (kg < 1) return `${(kg * 1000).toFixed(0)} g CO₂`;
  if (kg < 1000) return `${kg.toFixed(1)} kg CO₂`;
  return `${(kg / 1000).toFixed(1)} t CO₂`;
}

/**
 * Format water saved
 */
export function formatWater(liters: number): string {
  if (liters < 1000) return `${Math.round(liters)} L`;
  return `${(liters / 1000).toFixed(1)} m³`;
}
