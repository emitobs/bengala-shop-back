export const APP_NAME = 'Bengala Max';
export const DEFAULT_CURRENCY = 'UYU';
export const DEFAULT_COUNTRY = 'UY';
export const DEFAULT_LOCALE = 'es-UY';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const ORDER_NUMBER_PREFIX = 'BM';

export const URUGUAY_DEPARTMENTS = [
  'Montevideo',
  'Canelones',
  'Maldonado',
  'Salto',
  'Paysandú',
  'Rivera',
  'Colonia',
  'San José',
  'Soriano',
  'Cerro Largo',
  'Tacuarembó',
  'Rocha',
  'Florida',
  'Lavalleja',
  'Durazno',
  'Artigas',
  'Río Negro',
  'Treinta y Tres',
  'Flores',
] as const;

export const IMAGE_SIZES = {
  ORIGINAL: { width: 1200, quality: 85 },
  THUMBNAIL: { width: 400, height: 400, quality: 80 },
  MICRO: { width: 80, height: 80, quality: 70 },
} as const;

export const PASSWORD_MIN_LENGTH = 8;
export const RATING_MIN = 1;
export const RATING_MAX = 5;
