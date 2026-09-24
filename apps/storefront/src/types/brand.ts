export type Brand = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  country?: string | null;
  status: string;
};
