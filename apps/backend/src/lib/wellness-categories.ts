import { MedusaError } from "@medusajs/framework/utils";

export type CatalogCategory = {
  handle: string;
  name: string;
  arabic: string;
  rank: number;
  parentHandle: string | null;
};
export const wellnessCategories: CatalogCategory[] = [
  {
    handle: "vitamins-minerals",
    name: "Vitamins & Minerals",
    arabic: "الفيتامينات والمعادن",
    rank: 0,
    parentHandle: null,
  },
  {
    handle: "multivitamins",
    name: "Multivitamins (Men’s, Women’s, Kids, Prenatal)",
    arabic: "الفيتامينات المتعددة (للرجال، للنساء، للأطفال، للحمل)",
    rank: 0,
    parentHandle: "vitamins-minerals",
  },
  {
    handle: "vitamin-c",
    name: "Vitamin C",
    arabic: "فيتامين C",
    rank: 1,
    parentHandle: "vitamins-minerals",
  },
  {
    handle: "vitamin-d3-k2",
    name: "Vitamin D3 & K2",
    arabic: "فيتامين D3 و K2",
    rank: 2,
    parentHandle: "vitamins-minerals",
  },
  {
    handle: "b-complex",
    name: "B-Complex",
    arabic: "فيتامينات B المركبة",
    rank: 3,
    parentHandle: "vitamins-minerals",
  },
  {
    handle: "magnesium",
    name: "Magnesium (Glycinate, Citrate)",
    arabic: "المغنيسيوم (جليسينات، سترات)",
    rank: 4,
    parentHandle: "vitamins-minerals",
  },
  {
    handle: "zinc",
    name: "Zinc",
    arabic: "الزنك",
    rank: 5,
    parentHandle: "vitamins-minerals",
  },
  {
    handle: "iron",
    name: "Iron",
    arabic: "الحديد",
    rank: 6,
    parentHandle: "vitamins-minerals",
  },
  {
    handle: "calcium",
    name: "Calcium",
    arabic: "الكالسيوم",
    rank: 7,
    parentHandle: "vitamins-minerals",
  },
  {
    handle: "sports-nutrition",
    name: "Sports Nutrition",
    arabic: "التغذية الرياضية",
    rank: 1,
    parentHandle: null,
  },
  {
    handle: "whey-protein",
    name: "Whey Protein (Isolate, Concentrate)",
    arabic: "بروتين مصل اللبن (معزول، مركز)",
    rank: 0,
    parentHandle: "sports-nutrition",
  },
  {
    handle: "plant-protein",
    name: "Plant Protein",
    arabic: "البروتين النباتي",
    rank: 1,
    parentHandle: "sports-nutrition",
  },
  {
    handle: "creatine-monohydrate",
    name: "Creatine Monohydrate",
    arabic: "كرياتين مونوهيدرات",
    rank: 2,
    parentHandle: "sports-nutrition",
  },
  {
    handle: "pre-workouts",
    name: "Pre-Workouts",
    arabic: "مكملات ما قبل التمرين",
    rank: 3,
    parentHandle: "sports-nutrition",
  },
  {
    handle: "bcaas-eaas",
    name: "BCAAs/EAAs",
    arabic: "الأحماض الأمينية BCAA / EAA",
    rank: 4,
    parentHandle: "sports-nutrition",
  },
  {
    handle: "glutamine",
    name: "Glutamine",
    arabic: "جلوتامين",
    rank: 5,
    parentHandle: "sports-nutrition",
  },
  {
    handle: "mass-gainers",
    name: "Mass Gainers",
    arabic: "مكملات زيادة الكتلة",
    rank: 6,
    parentHandle: "sports-nutrition",
  },
  {
    handle: "electrolytes",
    name: "Electrolytes",
    arabic: "الإلكتروليتات",
    rank: 7,
    parentHandle: "sports-nutrition",
  },
  {
    handle: "supplements-botanicals",
    name: "Supplements & Botanicals",
    arabic: "المكملات والمستخلصات النباتية",
    rank: 2,
    parentHandle: null,
  },
  {
    handle: "omega-3-fish-oils",
    name: "Omega-3 & Fish Oils",
    arabic: "أوميجا 3 وزيوت السمك",
    rank: 0,
    parentHandle: "supplements-botanicals",
  },
  {
    handle: "probiotics-prebiotics",
    name: "Probiotics & Prebiotics",
    arabic: "البروبيوتك والبريبيوتك",
    rank: 1,
    parentHandle: "supplements-botanicals",
  },
  {
    handle: "collagen-peptides",
    name: "Collagen Peptides",
    arabic: "ببتيدات الكولاجين",
    rank: 2,
    parentHandle: "supplements-botanicals",
  },
  {
    handle: "ashwagandha",
    name: "Ashwagandha",
    arabic: "أشواجاندا",
    rank: 3,
    parentHandle: "supplements-botanicals",
  },
  {
    handle: "milk-thistle",
    name: "Milk Thistle",
    arabic: "شوك الحليب",
    rank: 4,
    parentHandle: "supplements-botanicals",
  },
  {
    handle: "mushroom-extracts",
    name: "Mushroom Extracts",
    arabic: "مستخلصات الفطر",
    rank: 5,
    parentHandle: "supplements-botanicals",
  },
  {
    handle: "coq10",
    name: "CoQ10",
    arabic: "CoQ10",
    rank: 6,
    parentHandle: "supplements-botanicals",
  },
  {
    handle: "curcumin",
    name: "Curcumin",
    arabic: "الكركمين",
    rank: 7,
    parentHandle: "supplements-botanicals",
  },
  {
    handle: "beauty-skin-wellness",
    name: "Beauty & Skin Wellness",
    arabic: "الجمال وصحة البشرة",
    rank: 3,
    parentHandle: null,
  },
  {
    handle: "biotin",
    name: "Biotin",
    arabic: "البيوتين",
    rank: 0,
    parentHandle: "beauty-skin-wellness",
  },
  {
    handle: "hyaluronic-acid",
    name: "Hyaluronic Acid",
    arabic: "حمض الهيالورونيك",
    rank: 1,
    parentHandle: "beauty-skin-wellness",
  },
  {
    handle: "marine-collagen",
    name: "Marine Collagen",
    arabic: "الكولاجين البحري",
    rank: 2,
    parentHandle: "beauty-skin-wellness",
  },
  {
    handle: "anti-aging-formulas",
    name: "Anti-Aging Formulas",
    arabic: "تركيبات مكافحة علامات التقدم في العمر",
    rank: 3,
    parentHandle: "beauty-skin-wellness",
  },
  {
    handle: "hair-skin-nails",
    name: "Hair/Skin/Nails Blends",
    arabic: "تركيبات الشعر والبشرة والأظافر",
    rank: 4,
    parentHandle: "beauty-skin-wellness",
  },
  {
    handle: "baby-kids-health",
    name: "Baby & Kids Health",
    arabic: "صحة الأطفال والرضع",
    rank: 4,
    parentHandle: null,
  },
  {
    handle: "infant-drops",
    name: "Infant Drops (D3/Probiotics)",
    arabic: "قطرات الرضع (D3 / بروبيوتك)",
    rank: 0,
    parentHandle: "baby-kids-health",
  },
  {
    handle: "childrens-multivitamin-gummies",
    name: "Children’s Multivitamin Gummies",
    arabic: "حلوى مطاطية من الفيتامينات المتعددة للأطفال",
    rank: 1,
    parentHandle: "baby-kids-health",
  },
  {
    handle: "teething-support",
    name: "Teething Support",
    arabic: "دعم التسنين",
    rank: 2,
    parentHandle: "baby-kids-health",
  },
  {
    handle: "dha-for-kids",
    name: "DHA for Kids",
    arabic: "DHA للأطفال",
    rank: 3,
    parentHandle: "baby-kids-health",
  },
];

type ExistingCategory = {
  id: string;
  name: string;
  handle: string;
  parent_category_id?: string | null;
};
export function planWellnessCategories(existing: ExistingCategory[]) {
  const used = new Set<string>();
  const plans = wellnessCategories.map((category) => {
    const matches = existing.filter(
      (item) =>
        item.handle === category.handle ||
        item.name.trim().toLowerCase() === category.name.toLowerCase(),
    );
    if (matches.length > 1)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Ambiguous category: ${category.name}`,
      );
    const match = matches[0];
    if (match && used.has(match.id))
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Category matched twice: ${category.name}`,
      );
    if (match) used.add(match.id);
    return {
      ...category,
      id: match?.id,
      existingParent: match?.parent_category_id ?? null,
    };
  });
  for (const plan of plans) {
    const parent = plans.find((item) => item.handle === plan.parentHandle);
    if (plan.id && plan.existingParent !== (parent?.id ?? null))
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Conflicting parent: ${plan.name}`,
      );
    if (plan.id && plan.parentHandle && !parent?.id)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Existing child has no matching parent: ${plan.name}`,
      );
  }
  return plans;
}
