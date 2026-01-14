// ============================================
// REUSA - Environmental Impact Utility
// ============================================

/**
 * Impact factors per category (kg CO2 / item)
 */
const CO2_FACTORS: Record<string, number> = {
  ropa: 10.0, // Clothing
  tech: 50.0, // Electronics
  hogar: 20.0, // Home goods
  libros: 2.5, // Books
  deportes: 15.0, // Sports equipment
  ninos: 8.0, // Kids items
  default: 12.0,
};

/**
 * Water factors per category (liters / item)
 */
const WATER_FACTORS: Record<string, number> = {
  ropa: 2700, // Clothing (cotton production)
  tech: 1500, // Electronics
  hogar: 800, // Home goods
  libros: 400, // Books
  deportes: 1000, // Sports equipment
  ninos: 1200, // Kids items
  default: 1000,
};

/**
 * Calculate CO2 saved for a product
 */
export function calculateCO2Saved(categoryId: string, _weight?: number): number {
  const factor = CO2_FACTORS[categoryId] || CO2_FACTORS.default;
  // Could multiply by weight if available
  return factor;
}

/**
 * Calculate water saved for a product
 */
export function calculateWaterSaved(categoryId: string): number {
  return WATER_FACTORS[categoryId] || WATER_FACTORS.default;
}

/**
 * Calculate total environmental impact
 */
export function calculateEnvironmentalImpact(
  categoryId: string,
  _weight?: number
): {
  co2Saved: number;
  waterSaved: number;
} {
  return {
    co2Saved: calculateCO2Saved(categoryId, _weight),
    waterSaved: calculateWaterSaved(categoryId),
  };
}

/**
 * Get environmental equivalents for understanding impact
 */
export function getImpactEquivalents(co2Kg: number): {
  carKm: number; // Kilometers driven
  treeDays: number; // Days of tree absorption
  showers: number; // Number of showers worth of water
  description: string;
} {
  const carKm = co2Kg / 0.12; // Average car emits 120g/km
  const treeDays = co2Kg / 0.06; // Tree absorbs ~60g/day
  const showers = co2Kg * 100; // Rough equivalent for visualization

  let description = '';
  if (carKm >= 100) {
    description = `Como no conducir ${Math.round(carKm)} km`;
  } else if (treeDays >= 30) {
    description = `Como plantar un árbol por ${Math.round(treeDays / 30)} meses`;
  } else {
    description = `Equivalente a ${Math.round(treeDays)} días de absorción de un árbol`;
  }

  return {
    carKm,
    treeDays,
    showers,
    description,
  };
}

/**
 * Get sustainability level based on user activity
 */
export function getSustainabilityLevel(
  totalCO2Saved: number
): {
  level: 'seedling' | 'sprout' | 'tree' | 'forest' | 'ecosystem';
  name: string;
  nextLevelAt: number;
  progress: number;
} {
  if (totalCO2Saved < 50) {
    return {
      level: 'seedling',
      name: 'Semilla',
      nextLevelAt: 50,
      progress: (totalCO2Saved / 50) * 100,
    };
  } else if (totalCO2Saved < 200) {
    return {
      level: 'sprout',
      name: 'Brote',
      nextLevelAt: 200,
      progress: ((totalCO2Saved - 50) / 150) * 100,
    };
  } else if (totalCO2Saved < 500) {
    return {
      level: 'tree',
      name: 'Árbol',
      nextLevelAt: 500,
      progress: ((totalCO2Saved - 200) / 300) * 100,
    };
  } else if (totalCO2Saved < 1000) {
    return {
      level: 'forest',
      name: 'Bosque',
      nextLevelAt: 1000,
      progress: ((totalCO2Saved - 500) / 500) * 100,
    };
  }

  return {
    level: 'ecosystem',
    name: 'Ecosistema',
    nextLevelAt: Infinity,
    progress: 100,
  };
}

/**
 * Get sustainability tips
 */
export function getSustainabilityTips(): string[] {
  return [
    'Vender o donar lo que no usas evita la producción de nuevos items',
    'La moda circular reduce hasta un 80% las emisiones del sector textil',
    'Comprar usado ahorra hasta 2,700 litros de agua por prenda',
    'Los electrónicos reacondicionados ahorran 50kg de CO₂ cada uno',
    'El comercio local reduce la huella de carbono del transporte',
    'Alargar la vida útil de un producto 9 meses reduce su impacto un 30%',
    'La economía circular podría reducir las emisiones globales un 39%',
  ];
}

/**
 * Get category-specific environmental facts
 */
export function getCategoryFact(categoryId: string): string {
  const facts: Record<string, string[]> = {
    ropa: [
      'Producir una camiseta de algodón usa 2,700 litros de agua',
      'La industria textil emite más CO₂ que todos los vuelos internacionales',
      'Solo el 1% de la ropa se recicla para hacer nueva ropa',
    ],
    tech: [
      'Un smartphone contiene más de 60 elementos diferentes de la tabla periódica',
      'Fabricar un laptop genera hasta 400kg de CO₂',
      'El 80% del impacto de un dispositivo ocurre en su fabricación',
    ],
    hogar: [
      'Fabricar un sofá genera unos 90kg de CO₂',
      'Los muebles de segunda mano evitan la deforestación',
      'Reutilizar reduce la demanda de materias primas',
    ],
    libros: [
      'Producir un libro usa hasta 7.5kg de CO₂',
      'Un libro puede leerse y compartirse infinitas veces',
      'El papel reciclado usa 70% menos energía que el nuevo',
    ],
  };

  const categoryFacts = facts[categoryId] || facts.hogar;
  return categoryFacts[Math.floor(Math.random() * categoryFacts.length)];
}
