const CHAR_MAP: Record<string, string> = {
  'á': 'a',
  'à': 'a',
  'ä': 'a',
  'â': 'a',
  'ã': 'a',
  'é': 'e',
  'è': 'e',
  'ë': 'e',
  'ê': 'e',
  'í': 'i',
  'ì': 'i',
  'ï': 'i',
  'î': 'i',
  'ó': 'o',
  'ò': 'o',
  'ö': 'o',
  'ô': 'o',
  'õ': 'o',
  'ú': 'u',
  'ù': 'u',
  'ü': 'u',
  'û': 'u',
  'ñ': 'n',
  'ç': 'c',
  'Á': 'a',
  'À': 'a',
  'Ä': 'a',
  'Â': 'a',
  'Ã': 'a',
  'É': 'e',
  'È': 'e',
  'Ë': 'e',
  'Ê': 'e',
  'Í': 'i',
  'Ì': 'i',
  'Ï': 'i',
  'Î': 'i',
  'Ó': 'o',
  'Ò': 'o',
  'Ö': 'o',
  'Ô': 'o',
  'Õ': 'o',
  'Ú': 'u',
  'Ù': 'u',
  'Ü': 'u',
  'Û': 'u',
  'Ñ': 'n',
  'Ç': 'c',
};

export function generateSlug(text: string): string {
  return text
    .split('')
    .map((char) => CHAR_MAP[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
