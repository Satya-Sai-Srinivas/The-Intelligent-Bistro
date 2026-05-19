import { useCallback, useEffect, useState } from 'react';
import { setMenuCatalog } from '../constants/menu';
import { supabase } from '../lib/supabase';
import type { MenuItem } from '../types/menu';

interface MenuRow {
  id: string | number;
  name: string;
  description: string;
  price: number;
  category?: string | null;
  ingredients?: string[] | null;
  image_url?: string | null;
  translations?: Record<string, { name: string; description: string }> | null;
}

function mapRow(row: MenuRow): MenuItem {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category ?? undefined,
    ingredients: row.ingredients ?? undefined,
    imageUrl: row.image_url ?? null,
    translations: row.translations ?? undefined,
  };
}

export function useMenuItems() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('menu_items')
      .select('id, name, description, price, category, ingredients, image_url, translations')
      .order('name');

    if (fetchError) {
      setError(fetchError.message);
      setMenuCatalog([]);
      setItems([]);
    } else {
      const mapped = (data ?? []).map((row) => mapRow(row as MenuRow));
      setMenuCatalog(mapped);
      setItems(mapped);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return { items, loading, error, refetch: fetchMenu };
}
