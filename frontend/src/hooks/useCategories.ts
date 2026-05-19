import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types/menu';

interface CategoryRow {
  id: string;
  name: string;
  image_url: string;
  sort_order: number;
}

function mapRow(row: CategoryRow): Category {
  return {
    id: String(row.id),
    name: row.name,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
  };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('id, name, image_url, sort_order')
      .order('sort_order');

    if (fetchError) {
      setError(fetchError.message);
      setCategories([]);
    } else {
      setCategories((data ?? []).map((row) => mapRow(row as CategoryRow)));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
}
