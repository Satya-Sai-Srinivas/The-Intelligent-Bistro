import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MenuItem } from '../types/menu';

interface MenuRow {
  id: string;
  name: string;
  description: string;
  price: number;
  category?: string | null;
  ingredients?: string[] | null;
}

function mapRow(row: MenuRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category ?? undefined,
    ingredients: row.ingredients ?? undefined,
    imageUrl: null,
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
      .select('id, name, description, price, category, ingredients')
      .order('name');

    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems((data ?? []).map((row) => mapRow(row as MenuRow)));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return { items, loading, error, refetch: fetchMenu };
}
