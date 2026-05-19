-- Categories table for menu navigation and category card imagery.
-- Run once in the Supabase SQL editor (or via CLI migration).

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  image_url text NOT NULL,
  sort_order integer NOT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'categories'
      AND policyname = 'Allow public read access on categories'
  ) THEN
    CREATE POLICY "Allow public read access on categories"
      ON categories FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

INSERT INTO categories (name, image_url, sort_order) VALUES
  (
    'Appetizers',
    'https://images.unsplash.com/photo-1527751171053-6ac5ec50000b?auto=format&fit=crop&w=800&q=80',
    1
  ),
  (
    'Salads',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    2
  ),
  (
    'Burgers & Sandwiches',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    3
  ),
  (
    'Pasta',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
    4
  ),
  (
    'Chicken Dishes',
    'https://images.unsplash.com/photo-1712579733874-c3a79f0f9d12?auto=format&fit=crop&w=800&q=80',
    5
  ),
  (
    'Steaks & Chops',
    'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?auto=format&fit=crop&w=800&q=80',
    6
  ),
  (
    'Seafood',
    'https://images.unsplash.com/photo-1606850780554-b55ea4dd0b70?auto=format&fit=crop&w=800&q=80',
    7
  ),
  (
    'Pizzas',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    8
  ),
  (
    'Mains',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    9
  ),
  (
    'Sides',
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
    10
  ),
  (
    'Cheesecakes & Desserts',
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
    11
  ),
  (
    'Beverages',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    12
  ),
  (
    'Drinks',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    13
  )
ON CONFLICT (name) DO NOTHING;
