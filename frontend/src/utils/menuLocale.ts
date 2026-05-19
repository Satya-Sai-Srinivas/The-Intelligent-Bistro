import type { MenuItem } from '../types/menu';

export function getMenuItemDisplayFields(
  item: MenuItem,
  currentLanguage: string
): { name: string; description: string } {
  if (currentLanguage !== 'en' && item.translations?.[currentLanguage]) {
    return item.translations[currentLanguage];
  }
  return { name: item.name, description: item.description };
}
