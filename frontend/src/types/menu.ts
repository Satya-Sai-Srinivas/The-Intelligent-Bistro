export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category?: string;
  ingredients?: string[];
  imageUrl?: string | null;
}
