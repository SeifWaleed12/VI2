export type Locale = "en" | "ar";
export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}
export const medusaLocale = (locale: Locale) =>
  locale === "ar" ? "ar-EG" : "en-US";
export function localizedHref(href: string, locale: Locale): string {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    /^\/(api|_next)(\/|$)/.test(href)
  )
    return href;
  return `/${locale}${href.replace(/^\/(en|ar)(?=\/|\?|#|$)/, "") || "/"}`;
}
export function removedCategoryPath(path: string) {
  return /^\/(?:en\/|ar\/)?categories(?:\/|$)/.test(path);
}
const en = {
  "hero.statement": "PREMIUM SUPPLEMENTS FOR A STRONGER, HEALTHIER YOU.",
  "nav.switchArabic": "Switch to Arabic",
  "nav.switchEnglish": "Switch to English",
  "cart.close": "Close cart",
  "ticker.pause": "Pause animation",
  "ticker.resume": "Resume animation",
  "nav.shopShort": "Shop",
  "nav.searchShort": "Search",
  "search.placeholder": "Product, brand, health goal…",
  "search.products": "Search products",
  "search.close": "Close search",
  "search.clear": "Clear search",
  "search.recent": "Recent searches",
  "search.popular": "Popular searches",
  "search.suggestions": "Suggested results",
  "search.picks": "Popular picks",
  "search.viewAll": "View all results",
  "search.empty": "Try another product, brand, category or health goal.",
  "search.error": "Search is temporarily unavailable.",
  "shop.filters": "Filters",
  "shop.sort": "Sort",
  "shop.featured": "Featured",
  "shop.low": "Price: Low to High",
  "shop.high": "Price: High to Low",
  "nav.home": "Home",
  "nav.mobile": "Mobile navigation",

  "nav.categories": "Categories",
  "nav.shopAll": "Shop all",
  "nav.back": "Back",
  "nav.close": "Close menu",
  "nav.brands": "Brands",
  "nav.health": "Health Goals",
  "nav.shop": "Shop Products",
  "nav.new": "New",
  "nav.bundles": "Bundles",
  "nav.deals": "Deals",
  "nav.search": "Search Vi2",
  "nav.menu": "Menu",
  "nav.cart": "Cart",
  "nav.account": "Account",
  "nav.signIn": "Sign in",
  "nav.egp": "EGP",
  "nav.collection": "Explore the collection",
  "nav.shopVi2": "Shop Vi2",
  "catalog.error": "The catalog is temporarily unavailable.",
  "catalog.empty": "No categories are available yet.",
  "catalog.retry": "Try again",
  "catalog.all": "All products",
  "catalog.invalid": "This category is unavailable.",
  "catalog.noProducts": "No products are available in this category yet.",
  "catalog.loading": "Loading categories…",
} as const;
type MessageKey = keyof typeof en;
const ar: Record<MessageKey, string> = {
  "hero.statement": "مكملات غذائية عالية الجودة لصحة أفضل وقوة أكبر.",
  "nav.switchArabic": "التبديل إلى العربية",
  "nav.switchEnglish": "التبديل إلى الإنجليزية",
  "cart.close": "إغلاق السلة",
  "ticker.pause": "إيقاف الحركة مؤقتاً",
  "ticker.resume": "استئناف الحركة",
  "nav.shopShort": "المتجر",
  "nav.searchShort": "بحث",
  "search.placeholder": "منتج، علامة تجارية، هدف صحي…",
  "search.products": "ابحث عن المنتجات",
  "search.close": "إغلاق البحث",
  "search.clear": "مسح البحث",
  "search.recent": "عمليات البحث الأخيرة",
  "search.popular": "الأكثر بحثاً",
  "search.suggestions": "نتائج مقترحة",
  "search.picks": "اختيارات شائعة",
  "search.viewAll": "عرض كل النتائج",
  "search.empty": "جرّب منتجاً أو علامة تجارية أو قسماً أو هدفاً صحياً آخر.",
  "search.error": "البحث غير متاح مؤقتاً.",
  "shop.filters": "الفلاتر",
  "shop.sort": "الترتيب",
  "shop.featured": "المميز",
  "shop.low": "السعر: من الأقل إلى الأعلى",
  "shop.high": "السعر: من الأعلى إلى الأقل",
  "nav.home": "الرئيسية",
  "nav.mobile": "التنقل على الهاتف",

  "nav.categories": "الأقسام",
  "nav.shopAll": "تسوق الكل",
  "nav.back": "رجوع",
  "nav.close": "إغلاق القائمة",
  "nav.brands": "العلامات التجارية",
  "nav.health": "الأهداف الصحية",
  "nav.shop": "تسوق المنتجات",
  "nav.new": "الجديد",
  "nav.bundles": "الباقات",
  "nav.deals": "العروض",
  "nav.search": "ابحث في Vi2",
  "nav.menu": "القائمة",
  "nav.cart": "السلة",
  "nav.account": "الحساب",
  "nav.signIn": "تسجيل الدخول",
  "nav.egp": "ج.م",
  "nav.collection": "اكتشف المنتجات",
  "nav.shopVi2": "تسوق Vi2",
  "catalog.error": "المنتجات والأقسام غير متاحة مؤقتاً.",
  "catalog.empty": "لا توجد أقسام متاحة بعد.",
  "catalog.retry": "حاول مرة أخرى",
  "catalog.all": "كل المنتجات",
  "catalog.invalid": "هذا القسم غير متاح.",
  "catalog.noProducts": "لا توجد منتجات متاحة في هذا القسم بعد.",
  "catalog.loading": "جارٍ تحميل الأقسام…",
};
export function message(locale: Locale, key: MessageKey) {
  return (locale === "ar" ? ar : en)[key];
}
