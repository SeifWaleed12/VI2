export type BrandProfile = {
  name: string;
  logo: string;
  focus: string;
  note: string;
  accent: string;
  featured?: boolean;
};

export const brandProfiles: BrandProfile[] = [
  {
    name: "Nutri-Nations",
    logo: "/brands/nutri-nations.png",
    focus: "DAILY WELLNESS / SPORTS",
    note: "Everyday nutrition and performance essentials.",
    accent: "#aa3a27",
  },
  {
    name: "Doctor's Best",
    logo: "/brands/doctors-best.png",
    focus: "MINERALS / WELLNESS",
    note: "Science-led daily wellness and mineral support.",
    accent: "#5f8d44",
  },
  {
    name: "NOW Foods",
    logo: "/brands/now-foods.png",
    focus: "WELLNESS / SPORTS",
    note: "Broad-spectrum nutrition for everyday routines.",
    accent: "#43665b",
  },
  {
    name: "California Gold Nutrition",
    logo: "/brands/california-gold.png",
    focus: "VITAMINS / COLLAGEN / GUT",
    note: "Daily essentials across vitamins, collagen and probiotics.",
    accent: "#a7873d",
  },
  {
    name: "Optimum Nutrition",
    logo: "/brands/optimum-nutrition.png",
    focus: "PREMIUM PROTEIN",
    note: "Performance protein for training and recovery.",
    accent: "#383b36",
  },
  {
    name: "Big Ramy Labs",
    logo: "/brands/big-ramy-labs.svg",
    focus: "SPORTS PERFORMANCE",
    note: "Strength, creatine and performance-focused sports nutrition.",
    accent: "#9e3128",
    featured: true,
  },
];
