export type CatalogGroup = {
  id: string;
  title: string;
  description: string;
  items: string[];
};

export const primaryCatalogGroups: CatalogGroup[] = [
  {
    id: "vitamins-minerals",
    title: "VITAMINS & MINERALS",
    description:
      "Daily micronutrients, minerals and foundational wellness.",
    items: [
      "Men's Multivitamins",
      "Women's Multivitamins",
      "Kids Multivitamins",
      "Prenatal Multivitamins",
      "Vitamin A",
      "B-Complex",
      "Vitamin C",
      "Vitamin D",
      "Vitamin D3 & K2",
      "Vitamin E",
      "Vitamin K",
      "Magnesium Glycinate",
      "Magnesium Citrate",
      "Calcium",
      "Zinc",
      "Iron",
      "Electrolytes",
      "Trace Minerals",
    ],
  },
  {
    id: "sports-nutrition",
    title: "SPORTS NUTRITION",
    description:
      "Protein, performance, hydration and training support.",
    items: [
      "Whey Isolate",
      "Whey Concentrate",
      "Plant Protein",
      "Casein Protein",
      "Egg White Protein",
      "Collagen Protein",
      "Creatine Monohydrate",
      "Pre-Workouts",
      "Nitric Oxide Boosters",
      "Post-Workout / BCAAs",
      "BCAAs / EAAs",
      "Glutamine",
      "Mass Gainers",
      "Electrolyte Powders",
      "Hydration Drinks",
      "Energy Bars",
      "Weight Management",
      "Meal Replacements",
      "L-Carnitine",
    ],
  },
  {
    id: "supplements-botanicals",
    title: "SUPPLEMENTS & BOTANICALS",
    description:
      "Omegas, specialty supplements, herbs and digestive support.",
    items: [
      "Omega-3 & Fish Oils",
      "Omega 3-6-9",
      "DHA",
      "Krill Oil",
      "Algae Oil",
      "Probiotics",
      "Prebiotics",
      "Digestive Enzymes",
      "Fiber",
      "Collagen Peptides",
      "CoQ10",
      "L-Carnitine",
      "Glutamine",
      "NMN / NAD+",
      "Ashwagandha",
      "Rhodiola",
      "Curcumin / Turmeric",
      "Mushroom Extracts",
      "Elderberry",
      "Milk Thistle",
    ],
  },
  {
    id: "beauty-skin",
    title: "BEAUTY & SKIN WELLNESS",
    description:
      "Beauty-from-within support for skin, hair and nails.",
    items: [
      "Biotin",
      "Hyaluronic Acid",
      "Marine Collagen",
      "Anti-Aging Formulas",
      "Hair / Skin / Nails Blends",
    ],
  },
  {
    id: "baby-kids",
    title: "BABY & KIDS HEALTH",
    description:
      "Age-specific nutrition and everyday support for children.",
    items: [
      "Infant Vitamin D3 Drops",
      "Infant Probiotics",
      "Children's Multivitamin Gummies",
      "Kids Probiotics",
      "Kids Omega-3",
      "Cold & Cough Support",
      "DHA for Kids",
      "Organic Puffs",
      "Purees",
      "Teething Biscuits",
      "Teething Support",
    ],
  },
];

export const healthTopicGroups: CatalogGroup[] = [
  {
    id: "general-wellness",
    title: "GENERAL WELLNESS & LONGEVITY",
    description:
      "Daily support, vitality, longevity and foundational routines.",
    items: [
      "Anti-Aging & Longevity",
      "Energy & Vitality",
      "Multivitamins & Daily Support",
      "Stress & Fatigue",
    ],
  },
  {
    id: "immune-seasonal",
    title: "IMMUNE & SEASONAL SUPPORT",
    description:
      "Immune, respiratory and seasonal-support routines.",
    items: [
      "Immune Support",
      "Common Cold & Flu",
      "Seasonal Allergies",
      "Respiratory & Lung Health",
    ],
  },
  {
    id: "digestion-metabolism",
    title: "DIGESTION & METABOLISM",
    description:
      "Gut, digestive, metabolic and liver-focused support.",
    items: [
      "Digestive Support & Gut Health",
      "Detox & Cleanse",
      "Blood Sugar Support",
      "Weight Management",
      "Liver Support",
    ],
  },
  {
    id: "heart-brain-circulation",
    title: "HEART, BRAIN & CIRCULATION",
    description:
      "Cardiovascular, cognitive and circulation-focused wellness.",
    items: [
      "Brain & Cognitive Support",
      "Memory & Focus",
      "Heart & Cardiovascular Health",
      "Blood Pressure Support",
      "Circulation & Vein Support",
      "Cholesterol Support",
    ],
  },
  {
    id: "bone-joint-pain",
    title: "BONE, JOINT & PAIN",
    description:
      "Joint, muscle, bone and inflammation-support routines.",
    items: [
      "Bone & Joint Support",
      "Inflammation & Pain Relief",
      "Muscle, Cramp & Recovery Support",
      "Cartilage Support",
    ],
  },
  {
    id: "mind-sleep-mood",
    title: "MIND, SLEEP & MOOD",
    description:
      "Sleep, mood, relaxation and stress-relief support.",
    items: [
      "Sleep Support",
      "Mood & Anxiety Support",
      "Stress Relief & Relaxation",
    ],
  },
  {
    id: "life-stages",
    title: "LIFE STAGES",
    description:
      "Wellness organized around age, gender and stage of life.",
    items: [
      "Women's Health",
      "Men's Health",
      "Children's Health",
      "Senior Health",
      "Pregnancy & Maternity Support",
    ],
  },
  {
    id: "systems-aesthetics",
    title: "BODY SYSTEMS & AESTHETICS",
    description:
      "Targeted support for body systems and appearance goals.",
    items: [
      "Hair, Skin & Nails",
      "Eye & Vision Support",
      "Urinary Tract & Kidney Health",
      "Prostate Health",
      "Thyroid Support",
      "Oral & Dental Care",
    ],
  },
];
