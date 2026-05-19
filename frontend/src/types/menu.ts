export interface Category {
  id: string;
  name: string;
  imageUrl: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category?: string;
  ingredients?: string[];
  imageUrl?: string | null;
  translations?: Record<string, { name: string; description: string }>;
}
