-- Fix broken or mismatched category card images (run in Supabase SQL editor).

UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1527751171053-6ac5ec50000b?auto=format&fit=crop&w=800&q=80' WHERE name = 'Appetizers';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80' WHERE name = 'Burgers & Sandwiches';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1712579733874-c3a79f0f9d12?auto=format&fit=crop&w=800&q=80' WHERE name = 'Chicken Dishes';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?auto=format&fit=crop&w=800&q=80' WHERE name = 'Steaks & Chops';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1606850780554-b55ea4dd0b70?auto=format&fit=crop&w=800&q=80' WHERE name = 'Seafood';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80' WHERE name = 'Drinks';
