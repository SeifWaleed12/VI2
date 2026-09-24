import type { Product } from "@/types/product";

export const products: Product[] = [
  // =========================================================
  // NUTRI-NATIONS
  // =========================================================
  {
    id: "1",
    slug: "for-him-multivitamin",
    brand: "Nutri-Nations",
    name: "For Him Multivitamins",
    shortName: "For Him Multivitamin",
    category: "Vitamins",
    description:
      "Whole-body daily support for men in a simple daily multivitamin format.",
    price: 260,
    rating: 4.8,
    reviewCount: 221,
    image: "/products/nutri-nations/for-him-multivitamin.png",
    size: "30 Tablets",
    servings: 30,
    stock: 47,
    badge: "Featured",
  },
  {
    id: "2",
    slug: "nutri-nations-creatine",
    brand: "Nutri-Nations",
    name: "Nutri-Nations Creatine",
    shortName: "Creatine",
    category: "Creatine",
    description:
      "Micronized creatine for strength, performance and muscle-focused training routines.",
    price: 950,
    rating: 4.9,
    reviewCount: 264,
    image: "/products/trending-rail/nutri-creatine-transparent.png",
    size: "300 G",
    servings: 60,
    stock: 41,
    badge: "Best Seller",
  },
  {
    id: "3",
    slug: "nutri-nations-glutamine",
    brand: "Nutri-Nations",
    name: "Nutri-Nations Glutamine",
    shortName: "Glutamine",
    category: "Wellness",
    description:
      "Glutamine powder formulated for recovery-focused sports nutrition routines.",
    price: 1100,
    rating: 4.7,
    reviewCount: 184,
    image: "/products/nutri-nations/glutamine.png",
    size: "300 G",
    servings: 60,
    stock: 31,
    badge: "Vi2 Pick",
  },
  {
    id: "4",
    slug: "omega-x",
    brand: "Nutri-Nations",
    name: "Omega X",
    shortName: "Omega X",
    category: "Wellness",
    description:
      "An omega supplement created for a simple everyday wellness routine.",
    price: 525,
    rating: 4.8,
    reviewCount: 184,
    image: "/products/nutri-nations/omega-x.png",
    size: "30 Softgels",
    stock: 38,
    badge: "Everyday Essential",
  },
  {
    id: "5",
    slug: "whey-x",
    brand: "Nutri-Nations",
    name: "Whey X",
    shortName: "Whey X",
    category: "Protein",
    description:
      "Whey protein created for convenient everyday sports nutrition.",
    price: 2690,
    rating: 4.8,
    reviewCount: 306,
    image: "/products/trending-rail/whey-x-transparent.png",
    flavor: "Chocolate",
    size: "1015 G",
    servings: 29,
    stock: 24,
    badge: "Popular",
  },

  // =========================================================
  // PRODUCTS LISTED ON iHERB
  //
  // Product identities/details are based on current iHerb listings.
  // EGP values below are Vi2 local placeholder selling prices,
  // not live iHerb prices.
  // =========================================================
  {
    id: "6",
    slug: "doctors-best-high-absorption-magnesium",
    brand: "Doctor's Best",
    name: "High Absorption Magnesium",
    shortName: "High Absorption Magnesium",
    category: "Wellness",
    description:
      "Doctor's Best High Absorption Magnesium, 120 tablets, 100 mg per tablet.",
    price: 790,
    rating: 4.8,
    reviewCount: 211380,
    image:
      "/products/trending-rail/doctors-best-magnesium-transparent.png",
    size: "120 Tablets",
    stock: 20,
    badge: "Best Seller",
  },
  {
    id: "7",
    slug: "now-foods-omega-3-200-softgels",
    brand: "NOW Foods",
    name: "Omega-3 Fish Oil 1,000 mg",
    shortName: "Omega-3 Fish Oil",
    category: "Wellness",
    description:
      "NOW Foods Omega-3 fish oil in a 200-softgel bottle.",
    price: 980,
    rating: 4.8,
    reviewCount: 176655,
    image:
      "/products/trending-rail/now-omega-3-transparent.png",
    size: "200 Softgels",
    stock: 28,
    badge: "Popular",
  },
  {
    id: "8",
    slug: "california-gold-vitamin-d3-5000",
    brand: "California Gold Nutrition",
    name: "Vitamin D3 5,000 IU",
    shortName: "Vitamin D3",
    category: "Vitamins",
    description:
      "California Gold Nutrition Vitamin D3, 125 mcg (5,000 IU), 90 fish gelatin softgels.",
    price: 650,
    rating: 4.8,
    reviewCount: 322909,
    image:
      "/products/trending-rail/vitamin-d3-transparent.png",
    size: "90 Softgels",
    stock: 35,
    badge: "Top Rated",
  },
  {
    id: "9",
    slug: "now-foods-ultra-omega-3",
    brand: "NOW Foods",
    name: "Ultra Omega-3",
    shortName: "Ultra Omega-3",
    category: "Wellness",
    description:
      "NOW Foods Ultra Omega-3 fish oil in a convenient softgel format.",
    price: 1320,
    rating: 4.8,
    reviewCount: 2798,
    image:
      "https://s3.images-iherb.com/now/now01662/u/22.jpg",
    size: "180 Softgels",
    stock: 16,
    badge: "Premium",
  },
  {
    id: "10",
    slug: "california-gold-collagenup-206g",
    brand: "California Gold Nutrition",
    name:
      "CollagenUP Marine Collagen Peptides with Hyaluronic Acid and Vitamin C",
    shortName: "CollagenUP",
    category: "Wellness",
    description:
      "Marine-sourced hydrolyzed collagen peptides with hyaluronic acid and vitamin C, unflavored.",
    price: 1250,
    rating: 4.7,
    reviewCount: 325761,
    image:
      "/products/trending-rail/collagenup-transparent.png",
    size: "206 G",
    servings: 41,
    stock: 22,
    badge: "Best Seller",
  },
  {
    id: "11",
    slug: "california-gold-gold-c-vitamin-c-1000",
    brand: "California Gold Nutrition",
    name: "Gold C USP Grade Vitamin C 1,000 mg",
    shortName: "Gold C Vitamin C",
    category: "Vitamins",
    description:
      "USP-grade vitamin C, 1,000 mg per veggie capsule, in a 60-capsule bottle.",
    price: 520,
    rating: 4.8,
    reviewCount: 384601,
    image:
      "/products/trending-rail/gold-c-transparent.png",
    size: "60 Veggie Capsules",
    servings: 60,
    stock: 30,
    badge: "Top Rated",
  },
  {
    id: "12",
    slug: "now-foods-zinc-picolinate-50",
    brand: "NOW Foods",
    name: "Zinc Picolinate 50 mg",
    shortName: "Zinc Picolinate",
    category: "Vitamins",
    description:
      "NOW Foods Zinc Picolinate, 50 mg, in a 120 veggie-capsule bottle.",
    price: 680,
    rating: 4.8,
    reviewCount: 52553,
    image:
      "/products/trending-rail/zinc-picolinate-transparent.png",
    size: "120 Veg Capsules",
    servings: 120,
    stock: 26,
    badge: "Popular",
  },
  {
    id: "13",
    slug: "now-foods-creatine-capsules",
    brand: "NOW Foods",
    name: "Sports Creatine Monohydrate 750 mg",
    shortName: "Creatine Monohydrate",
    category: "Creatine",
    description:
      "NOW Foods Sports creatine monohydrate, 0.75 g per capsule, 120 veggie capsules.",
    price: 720,
    rating: 4.8,
    reviewCount: 5438,
    image:
      "/products/trending-rail/creatine-monohydrate-transparent.png",
    size: "120 Veg Capsules",
    stock: 18,
    badge: "Sports",
  },
  {
    id: "14",
    slug: "now-foods-ashwagandha-450",
    brand: "NOW Foods",
    name: "Ashwagandha Standardized Extract 450 mg",
    shortName: "Ashwagandha",
    category: "Wellness",
    description:
      "NOW Foods standardized ashwagandha extract, 450 mg, 90 veggie capsules.",
    price: 780,
    rating: 4.7,
    reviewCount: 47878,
    image:
      "/products/trending-rail/ashwagandha-transparent.png",
    size: "90 Veg Capsules",
    servings: 90,
    stock: 25,
    badge: "Trending",
  },
  {
    id: "15",
    slug: "california-gold-lactobif-30",
    brand: "California Gold Nutrition",
    name: "LactoBif 30 Probiotics, 30 Billion CFU",
    shortName: "LactoBif 30",
    category: "Wellness",
    description:
      "California Gold Nutrition LactoBif 30 probiotics with 30 billion CFU per veggie capsule.",
    price: 1950,
    rating: 4.7,
    reviewCount: 167156,
    image:
      "/products/trending-rail/lactobif-transparent.png",
    size: "120 Veg Capsules",
    servings: 120,
    stock: 14,
    badge: "Gut Health",
  },
  {
    id: "16",
    slug: "california-gold-coq10-100",
    brand: "California Gold Nutrition",
    name: "CoQ10 100 mg",
    shortName: "CoQ10",
    category: "Wellness",
    description:
      "California Gold Nutrition CoQ10, 100 mg, in tapioca-based veggie softgels.",
    price: 820,
    rating: 4.7,
    reviewCount: 41152,
    image:
      "/products/trending-rail/coq10-transparent.png",
    size: "30 Veggie Softgels",
    servings: 30,
    stock: 19,
    badge: "Vi2 Pick",
  },
  {
    id: "17",
    slug: "optimum-nutrition-gold-standard-whey-chocolate-malt",
    brand: "Optimum Nutrition",
    name: "Gold Standard 100% Whey Protein, Chocolate Malt",
    shortName: "Gold Standard Whey",
    category: "Protein",
    description:
      "Optimum Nutrition Gold Standard 100% Whey Protein, Chocolate Malt, 2 lb (907 g).",
    price: 4350,
    rating: 4.6,
    reviewCount: 711,
    image:
      "/products/trending-rail/on-whey-transparent.png",
    flavor: "Chocolate Malt",
    size: "907 G",
    stock: 12,
    badge: "Premium Protein",
  },
  // =========================================================
  // BIG RAMY LABS
  // Current public product details sourced from Big Ramy Labs Egypt.
  // =========================================================
  {
    id: "18",
    slug: "big-ramy-red-rex-creatine-5000mg",
    brand: "Big Ramy Labs",
    name: "RED REX Creatine 5000MG Unflavored",
    shortName: "Red Rex Creatine 5000MG",
    category: "Creatine",
    description:
      "Unflavored creatine monohydrate delivering 5,000 mg (5 g) per serving for strength, power and high-intensity training performance.",
    price: 449.1,
    compareAtPrice: 499,
    rating: 4.9,
    reviewCount: 176,
    image:
      "https://eg.bigramylabs.com/cdn/shop/files/Redrex-_Creatine-_Unflavored-_150_gm_Front.jpg?v=1783934104&width=2000",
    flavor: "Unflavored",
    size: "150 G",
    servings: 30,
    stock: 20,
    badge: "New at Vi2",
  },

];

export function getProductBySlug(
  slug: string,
): Product | undefined {
  return products.find(
    (product) =>
      product.slug === slug,
  );
}
