import { createClient } from '@supabase/supabase-js';
import '../config/env';

const CATEGORY_IMAGES: Array<{ name: string; imageUrl: string }> = [
  {
    name: 'Appetizers',
    imageUrl:
      'https://images.unsplash.com/photo-1527751171053-6ac5ec50000b?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Salads',
    imageUrl:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Burgers & Sandwiches',
    imageUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pasta',
    imageUrl:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Chicken Dishes',
    imageUrl:
      'https://images.unsplash.com/photo-1712579733874-c3a79f0f9d12?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Steaks & Chops',
    imageUrl:
      'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Seafood',
    imageUrl:
      'https://images.unsplash.com/photo-1606850780554-b55ea4dd0b70?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pizzas',
    imageUrl:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Mains',
    imageUrl:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Sides',
    imageUrl:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Cheesecakes & Desserts',
    imageUrl:
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Beverages',
    imageUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Drinks',
    imageUrl:
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
  },
];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to backend/.env (see .env.example).`);
  }
  return value;
}

async function main(): Promise<void> {
  const supabase = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  );

  for (const { name, imageUrl } of CATEGORY_IMAGES) {
    const { error } = await supabase
      .from('categories')
      .update({ image_url: imageUrl })
      .eq('name', name);

    if (error) {
      console.error(`Failed to update ${name}: ${error.message}`);
      process.exit(1);
    }

    console.log(`Updated image for ${name}`);
  }

  console.log('All category images updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
