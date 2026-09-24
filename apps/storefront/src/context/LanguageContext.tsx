"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Language = "en" | "ar";

type LanguageContextValue = {
  language: Language;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  t: <T>(value: T) => T;
};

const STORAGE_KEY = "vi2-language";
const LanguageContext = createContext<LanguageContextValue | null>(null);

let currentLanguage: Language | null = null;
const listeners = new Set<() => void>();

const dictionary: Record<string, string> = {
  reviews: "تقييمات",
  ratings: "تقييمات",
  "LIVE WELL, LIVE FULLY.": "عيش بصحة، عيش حياتك.",
  "LIVE WELL,": "عيش بصحة،",
  "LIVE FULLY.": "عيش حياتك.",
  "VI2 · DIETARY & WELLNESS SUPPLEMENTS": "VI2 · مكملات غذائية لصحتك وحياتك",
  "MORE THAN": "أكثر من مجرد",
  SUPPLEMENTS: "مكملات غذائية",
  "PREMIUM SUPPLEMENTS": "مكملات غذائية عالية الجودة",
  "FOR A STRONGER, HEALTHIER YOU.": "لصحة أفضل وقوة أكبر.",
  "SUPPLEMENTS FOR A BRIGHTER YOU": "مكملات لحياة مليانة حيوية",
  "FREE SHIPPING ON ORDERS OVER 2,500 EGP": "شحن مجاني للطلبات فوق ٢٬٥٠٠ ج.م",
  "DAILY FLASH DEALS": "عروض يومية لفترة محدودة",
  "Search all of Vi2": "ابحث في كل منتجات Vi2",
  ACCOUNT: "حسابي",
  "SIGN IN": "تسجيل الدخول",
  SHOP: "تسوق",
  "Sports Nutrition": "التغذية الرياضية",
  "Vitamins & Minerals": "الفيتامينات والمعادن",
  Wellness: "الصحة والعافية",
  "Beauty & Wellness": "الجمال والعناية",
  "Baby & Kids": "الأطفال والرضع",
  Brands: "العلامات التجارية",
  "Health Goals": "أهدافك الصحية",
  Deals: "العروض",
  "Best Sellers": "الأكثر مبيعًا",
  "BEST SELLERS": "الأكثر مبيعًا",
  "BEST SELLERS.": "الأكثر مبيعًا.",
  "BEST SELLER": "الأكثر مبيعًا",
  "Best Seller": "الأكثر مبيعًا",
  "best sellers": "الأكثر مبيعًا",
  "best seller": "الأكثر مبيعًا",
  "BESTSELLER": "الأكثر مبيعًا",
  "Bestseller": "الأكثر مبيعًا",
  "bestseller": "الأكثر مبيعًا",
  New: "جديد",
  Bundles: "الباقات",
  "Welcome!": "أهلًا بيك!",
  "SHOP BY": "تسوق حسب",
  "My Orders": "طلباتي",
  "My Rewards": "مكافآتي",
  Menu: "القائمة",
  Cart: "السلة",
  Multivitamins: "فيتامينات متعددة",
  "Vitamin C": "فيتامين C",
  "Vitamin D3 & K2": "فيتامين D3 وK2",
  "B-Complex": "فيتامينات B المركبة",
  "Magnesium (Glycinate, Citrate)": "ماغنيسيوم (جليسينات، سترات)",
  Zinc: "زنك",
  Iron: "حديد",
  Calcium: "كالسيوم",
  "Whey Protein (Isolate, Concentrate)": "واي بروتين (معزول، مركز)",
  "Plant Protein": "بروتين نباتي",
  "Creatine Monohydrate": "كرياتين مونوهيدرات",
  "Pre-Workouts": "مكملات ما قبل التمرين",
  Glutamine: "جلوتامين",
  "Mass Gainers": "مكملات زيادة الوزن",
  Electrolytes: "أملاح ومعادن الترطيب",
  "Supplements & Botanicals": "المكملات والمستخلصات النباتية",
  "Omega-3 & Fish Oils": "أوميجا 3 وزيوت السمك",
  "Probiotics & Prebiotics": "البروبيوتيك والبريبايوتيك",
  "Collagen Peptides": "ببتيدات الكولاجين",
  Ashwagandha: "أشواجندا",
  "Milk Thistle": "شوك الحليب",
  "Mushroom Extracts": "مستخلصات الفطر",
  Curcumin: "كركمين",
  "Beauty & Skin Wellness": "الجمال وصحة البشرة",
  Biotin: "بيوتين",
  "Hyaluronic Acid": "حمض الهيالورونيك",
  "Marine Collagen": "كولاجين بحري",
  "Anti-Aging Formulas": "تركيبات للعناية مع التقدم في العمر",
  "Hair, Skin & Nails Blends": "تركيبات الشعر والبشرة والأظافر",
  "Baby & Kids Health": "صحة الأطفال والرضع",
  "Children's Multivitamin Gummies": "فيتامينات متعددة للأطفال قابلة للمضغ",
  "Teething Support": "العناية أثناء التسنين",
  "DHA for Kids": "DHA للأطفال",
  "General Wellness & Longevity": "الصحة العامة والعافية طويلة المدى",
  "Immune & Seasonal Support": "المناعة والعناية الموسمية",
  "Digestion & Metabolism": "الهضم والتمثيل الغذائي",
  "Heart, Brain & Circulation": "القلب والمخ والدورة الدموية",
  "Bone, Joint & Pain": "العظام والمفاصل والراحة",
  "Mind, Sleep & Mood": "الذهن والنوم والمزاج",
  "Demographics & Stage of Life": "الفئة العمرية ومرحلة الحياة",
  "Specific Body Systems & Aesthetics": "العناية المتخصصة بالجسم والمظهر",
  "HIGH QUALITY": "جودة عالية",
  "REAL RESULTS": "نتائج حقيقية",
  "TRUSTED BRANDS": "علامات موثوقة",
  "A HEALTHIER TOMORROW": "بكرة بصحة أفضل",
  "24H PICKS": "اختيارات اليوم",
  EGP: "ج.م",
  "Vi2 home": "الصفحة الرئيسية لـVi2",
  "Search Vi2": "ابحث في Vi2",
  "Close menu": "إغلاق القائمة",
  "LOG OUT": "تسجيل الخروج",
  Back: "رجوع",
  "Shop all": "تسوق الكل",
  "Browse ingredients and everyday supplement essentials without leaving the page.":
    "اكتشف المكونات والمكملات الأساسية لروتينك اليومي من هنا.",
  POPULAR: "الأكثر رواجًا",
  Magnesium: "ماغنيسيوم",
  Probiotics: "بروبيوتيك",
  "DIGESTION & GUT": "الهضم وصحة الأمعاء",
  Prebiotics: "بريبايوتيك",
  "Digestive Enzymes": "إنزيمات الهضم",
  Fiber: "ألياف",
  HERBS: "الأعشاب",
  Rhodiola: "روديولا",
  SPECIALTY: "مكملات متخصصة",
  Collagen: "كولاجين",
  "L-Carnitine": "إل-كارنيتين",
  "Protein, performance, recovery and hydration organized for faster shopping.":
    "بروتين ومكملات للأداء والاستشفاء والترطيب، لتلاقي احتياجك بسهولة.",
  Protein: "بروتين",
  "Whey Protein": "واي بروتين",
  "Whey Isolate": "واي بروتين معزول",
  PERFORMANCE: "الأداء الرياضي",
  Creatine: "كرياتين",
  "Pre-Workout": "ما قبل التمرين",
  Hydration: "الترطيب",
  Energy: "الطاقة",
  GOALS: "الأهداف",
  "Muscle & Recovery": "العضلات والاستشفاء",
  "Energy & Fitness": "الطاقة واللياقة",
  "Weight Management": "إدارة الوزن",
  "Daily vitamins, minerals and multivitamins grouped for quick comparison.":
    "فيتامينات ومعادن يومية مصنفة علشان تقارن وتختار بسهولة.",
  Vitamins: "فيتامينات",
  "Vitamin D3": "فيتامين D3",
  "Vitamin E": "فيتامين E",
  MINERALS: "المعادن",
  "Men's Multivitamins": "فيتامينات متعددة للرجال",
  "Women's Multivitamins": "فيتامينات متعددة للنساء",
  "Daily Multivitamins": "فيتامينات متعددة يومية",
  ESSENTIALS: "الأساسيات",
  "Trace Minerals": "المعادن النادرة",
  "Shop around the goal first: sleep, stress, heart, gut and everyday wellbeing.":
    "ابدأ بهدفك: النوم، الاسترخاء، صحة القلب، الهضم أو العافية اليومية.",
  "Daily Wellness": "العافية اليومية",
  "Immune Support": "دعم المناعة",
  "Stress & Sleep": "الاسترخاء والنوم",
  "Heart Health": "صحة القلب",
  "Gut Health": "صحة الأمعاء",
  "MIND & MOOD": "الذهن والمزاج",
  "Sleep Support": "دعم النوم",
  "Stress Relief": "الاسترخاء",
  Focus: "التركيز",
  "BODY SUPPORT": "العناية بالجسم",
  "Bone & Joint": "العظام والمفاصل",
  "Hair, Skin & Nails": "الشعر والبشرة والأظافر",
  "Healthy Aging": "الصحة مع التقدم في العمر",
  DISCOVER: "اكتشف",
  "All Health Goals": "كل الأهداف الصحية",
  "Value Sets": "باقات التوفير",
  "VIEW ALL BRANDS": "كل العلامات التجارية",
  "VI2 BRANDS": "علامات Vi2 التجارية",
  "SHOP BY BRAND": "تسوق حسب العلامة التجارية",
  "SHOP VI2": "تسوق Vi2",
  Trending: "رائج",
  "FLASH DEALS": "عروض لفترة محدودة",
  "Omega-3": "أوميجا 3",
  "Product, brand, health goal...": "منتج، علامة تجارية، هدف صحي...",
  "RECENT SEARCHES": "عمليات البحث الأخيرة",
  "POPULAR SEARCHES": "عمليات بحث شائعة",
  "SUGGESTED RESULTS": "نتائج مقترحة",
  "POPULAR PICKS": "اختيارات رائجة",
  "VIEW ALL RESULTS": "عرض كل النتائج",
  CLEAR: "مسح",
  "Try another product, brand, category or health goal.":
    "جرب منتج أو علامة تجارية أو قسم أو هدف صحي مختلف.",
  "Close search": "إغلاق البحث",
  Home: "الرئيسية",
  SEARCH: "بحث",
  "Mobile navigation": "التنقل على الموبايل",
  "Dietary, wellness and sports nutrition selected around quality, simplicity and everyday living.":
    "مكملات غذائية وصحية ورياضية بنختارها بعناية، لجودة تثق فيها وروتين يومي أبسط.",
  "All products": "كل المنتجات",
  "About us": "عن Vi2",
  Authenticity: "أصالة المنتجات",
  Shipping: "الشحن",
  Returns: "الاسترجاع",
  Contact: "تواصل معنا",
  FOLLOW: "تابعنا",
  "Dietary & Wellness Supplements": "مكملات غذائية للصحة والعافية",
  Egypt: "مصر",
  "Vi2 performance supplement collection": "مجموعة Vi2 للأداء الرياضي",
  "Vi2 daily wellness supplement collection": "مجموعة Vi2 للعافية اليومية",
  "Vi2 sports nutrition supplement collection": "مجموعة Vi2 للتغذية الرياضية",
  "Vi2 everyday wellness supplement collection": "مجموعة Vi2 للصحة اليومية",
  "Vi2 featured collections": "مجموعات Vi2 المختارة",
  "Choose hero slide": "اختار صورة العرض",
  "VI2 PICKS": "اختيارات Vi2",
  "TRENDING NOW": "رائج دلوقتي",
  "VIEW ALL": "عرض الكل",
  All: "الكل",
  "POPULAR RIGHT NOW": "الأكثر رواجًا دلوقتي",
  ADDED: "تمت الإضافة",
  ADD: "أضف",
  "Vi2 brands": "علامات Vi2 التجارية",
  "Everyday defense": "دعم يومي لمناعتك",
  "Vitamin C, D3, zinc and daily immune-support essentials.":
    "فيتامين C وD3 والزنك وأساسيات دعم المناعة اليومية.",
  "Feel better daily": "راحة أكتر كل يوم",
  "Probiotics and digestive-support routines for everyday balance.":
    "بروبيوتيك ومكملات لدعم الهضم والتوازن اليومي.",
  "Fuel your day": "طاقة تكمل بيها يومك",
  "Performance-focused nutrition for energy, movement and daily drive.":
    "تغذية لدعم الأداء والطاقة والحركة والنشاط اليومي.",
  "Build. Repair. Perform.": "قوة. استشفاء. أداء.",
  "Protein, creatine and recovery support for stronger training days.":
    "بروتين وكرياتين ودعم للاستشفاء لتمرين أقوى.",
  "For a healthier tomorrow": "بكرة بصحة أفضل",
  "Omega support and cardiovascular wellness essentials.":
    "أوميجا وأساسيات العناية بصحة القلب والأوعية الدموية.",
  "A calmer, better you": "هدوء وراحة أكتر",
  "Sleep and stress-support routines built around better recovery.":
    "روتين لدعم النوم والاسترخاء واستشفاء أفضل.",
  "SHOP BY HEALTH GOAL": "تسوق حسب هدفك الصحي",
  "START WITH": "ابدأ باللي",
  "WHAT YOU NEED.": "محتاجه.",
  "Real health.": "صحة حقيقية.",
  "Real progress.": "تقدم حقيقي.",
  "A stronger you.": "نسخة أقوى منك.",
  STRONGER: "أقوى",
  EVERYDAY: "كل يوم",
  "VI2 GOAL PICK": "اختيار Vi2 لهدفك",
  "SHOP NOW": "تسوق دلوقتي",
  "STRENGTH ROUTINE": "روتين القوة",
  "TRAIN + BUILD": "تمرّن وابني",
  "Creatine and whey together for a simple training routine.":
    "كرياتين وواي بروتين مع بعض لروتين تمرين بسيط.",
  "DAILY ESSENTIALS": "أساسيات يومك",
  "EVERYDAY WELLNESS": "العافية كل يوم",
  "A simple daily pairing for general wellness support.":
    "منتجين مكملين لبعض لدعم عافيتك اليومية.",
  "CALM + RECOVER": "استرخِ واستعيد نشاطك",
  "REST + RECOVERY": "راحة واستشفاء",
  "Magnesium and ashwagandha in one recovery-focused set.":
    "ماغنيسيوم وأشواجندا في باقة لدعم الاستشفاء.",
  "VI2 VALUE SETS": "باقات التوفير من Vi2",
  "BUILD A": "كوّن",
  "ROUTINE.": "روتينك.",
  "SHOP INDIVIDUALLY": "تسوق المنتجات منفردة",
  "ADD SET": "أضف الباقة",
  "Mass Gainer": "زيادة الوزن",
  "All Brands": "كل العلامات التجارية",
  "All Diets": "كل الأنظمة الغذائية",
  Vegan: "نباتي بالكامل",
  Vegetarian: "نباتي",
  Keto: "كيتو",
  "Non-GMO": "غير معدل وراثيًا",
  "All Allergen Filters": "كل خيارات مسببات الحساسية",
  "Gluten-Free": "خالٍ من الجلوتين",
  "Dairy-Free": "خالٍ من الألبان",
  "Soy-Free": "خالٍ من الصويا",
  "All Goals": "كل الأهداف",
  "All Forms": "كل الأشكال",
  "HEALTH GOAL": "الهدف الصحي",
  CATEGORY: "القسم",
  BRAND: "العلامة التجارية",
  FORM: "شكل المنتج",
  DIET: "النظام الغذائي",
  "Verified dietary attributes must be supplied per SKU before launch.":
    "لازم تتوفر بيانات غذائية موثقة لكل منتج قبل الإطلاق.",
  "ALLERGEN-FREE": "خالٍ من مسببات الحساسية",
  "Verified manufacturer allergen data is required per SKU before launch.":
    "لازم تتوفر بيانات موثقة من المصنع عن مسببات الحساسية لكل منتج قبل الإطلاق.",
  "IN STOCK ONLY": "المتوفر فقط",
  "VI2 COLLECTION": "مجموعة Vi2",
  "Search by product, brand, category or health goal — then narrow the catalog without slowing down the buying flow.":
    "ابحث باسم المنتج أو العلامة التجارية أو القسم أو هدفك الصحي، وصفّي النتائج علشان توصل لاختيارك بسهولة.",
  "Search products, brands, goals...":
    "ابحث عن منتجات، علامات تجارية، أهداف...",
  "Search products": "البحث عن منتجات",
  "Clear search": "مسح البحث",
  FILTERS: "الفلاتر",
  SORT: "الترتيب",
  Featured: "مختارات",
  "Price: Low to High": "السعر: من الأقل للأعلى",
  "Price: High to Low": "السعر: من الأعلى للأقل",
  "Highest Rated": "الأعلى تقييمًا",
  "POPULAR:": "الأكثر بحثًا:",
  FILTER: "تصفية",
  RESET: "إعادة ضبط",
  PRODUCT: "منتج",
  PRODUCTS: "منتجات",
  "NO MATCHES": "مفيش نتائج مطابقة",
  "Nothing found.": "ملقيناش نتائج.",
  "Try another product, health goal, category or brand.":
    "جرب منتج أو هدف صحي أو قسم أو علامة تجارية مختلفة.",
  "VIEW ALL PRODUCTS": "عرض كل المنتجات",
  "Product filters": "فلاتر المنتجات",
  "VI2 CATALOG": "كتالوج Vi2",
  "FILTER PRODUCTS": "تصفية المنتجات",
  "Close filters": "إغلاق الفلاتر",
  SHOW: "عرض",
  Breadcrumb: "مسار الصفحة",
  "Show product": "عرض المنتج",
  "Show product facts": "عرض معلومات المنتج",
  FACTS: "المعلومات",
  SERVINGS: "الحصص",
  "Show package details": "عرض تفاصيل العبوة",
  PACKAGE: "العبوة",
  "Show quality details": "عرض تفاصيل الجودة",
  QUALITY: "الجودة",
  "Save product": "حفظ المنتج",
  "Share product": "مشاركة المنتج",
  "PRODUCT FACTS": "معلومات المنتج",
  "See package": "راجع العبوة",
  SIZE: "الحجم",
  "PACKAGE DETAILS": "تفاصيل العبوة",
  "PACKAGE SIZE": "حجم العبوة",
  "Package format shown exactly as listed in the Vi2 catalog.":
    "شكل العبوة موضح زي ما هو مسجل في كتالوج Vi2.",
  "VI2 QUALITY": "جودة Vi2",
  "QUALITY FIRST.": "الجودة أولًا.",
  "Authenticity, batch and supporting product information are organized in one place.":
    "معلومات أصالة المنتج والتشغيلة والبيانات الداعمة مجمعة في مكان واحد.",
  By: "من",
  "PACKAGE QUANTITY": "عدد العبوات",
  "1 PACK": "عبوة واحدة",
  "Current package": "العبوة الحالية",
  "KEY INFO": "معلومات أساسية",
  "TOTAL SERVINGS": "إجمالي الحصص",
  STOCK: "المخزون",
  "In Stock": "متوفر",
  "LOW STOCK": "كمية محدودة",
  "OUT OF STOCK": "غير متوفر",
  "QUALITY & PRODUCT DATA": "الجودة وبيانات المنتج",
  "AUTHENTICITY FOCUSED": "نهتم بأصالة المنتجات",
  "LAB DATA READY": "قسم بيانات التحاليل جاهز",
  "BATCH INFO READY": "قسم معلومات التشغيلة جاهز",
  "SIMILAR RECOMMENDATION": "منتج مشابه ليك",
  VIEW: "عرض",
  "OUR PRICE": "سعرنا",
  "ONE-TIME PURCHASE": "شراء مرة واحدة",
  "SUBSCRIBE & SAVE": "اشترك ووفر",
  "DELIVER EVERY": "توصيل كل",
  "1 month": "شهر",
  "2 months": "شهرين",
  "3 months": "٣ شهور",
  "Decrease quantity": "تقليل الكمية",
  "Increase quantity": "زيادة الكمية",
  "ADD TO CART": "أضف للسلة",
  "BUY NOW": "اشتري دلوقتي",
  "FAST SHIPPING": "شحن سريع",
  "Free over 2,500 EGP": "مجاني فوق ٢٬٥٠٠ ج.م",
  "PRODUCT INFORMATION": "تفاصيل المنتج",
  "SUPPLEMENT FACTS": "معلومات المكمل الغذائي",
  "Full ingredient panels can be connected when the final supplier catalog is provided.":
    "تفاصيل المكونات الكاملة هتتوفر لما نستلم الكتالوج النهائي من المورد.",
  "QUALITY, BATCH & COMPLIANCE": "الجودة والتشغيلة والامتثال",
  "Batch & expiry area": "قسم التشغيلة والصلاحية",
  "Regulatory status area": "قسم الحالة التنظيمية",
  "DELIVERY & RETURNS": "التوصيل والاسترجاع",
  "Delivery pricing is shown before the order is placed. Orders over 2,500 EGP receive free delivery.":
    "تكلفة التوصيل بتظهر قبل تأكيد الطلب. الطلبات فوق ٢٬٥٠٠ ج.م توصيلها مجاني.",
  "RELATED CATEGORIES": "أقسام مرتبطة",
  "DISCOVER MORE": "اكتشف أكتر",
  "SIMILAR ITEMS TO CONSIDER": "منتجات مشابهة ممكن تعجبك",
  "AUTHENTIC PRODUCTS": "منتجات أصلية",
  "Carefully selected for Vi2.": "مختارة بعناية لـVi2.",
  "SECURE PACKAGING": "تغليف آمن",
  "Prepared carefully for delivery.": "مجهزة بعناية للتوصيل.",
  "ACROSS EGYPT": "في كل مصر",
  "Simple local delivery experience.": "تجربة توصيل محلية سهلة.",
  "LIVE FULLY": "عيش حياتك",
  "Wellness made easier.": "العناية بصحتك بقت أسهل.",
  "VERIFIED-BUYER REVIEWS": "تقييمات المشترين الموثّقة",
  "Review profiles can include age group, health goal and product images so shoppers can understand who a product worked for.":
    "التقييمات ممكن تتضمن الفئة العمرية والهدف الصحي وصور المنتج علشان تساعدك تختار.",
  "Verified-purchase tagging is prepared for the final customer-order system.":
    "توثيق الشراء جاهز للربط بنظام طلبات العملاء النهائي.",
  "SHARE YOUR EXPERIENCE": "شارك تجربتك",
  "WRITE A REVIEW": "اكتب تقييم",
  "REVIEW FORM COMPLETED": "تم استكمال نموذج التقييم",
  "Review moderation and verified-purchase checks will connect to customer accounts in the final platform.":
    "مراجعة التقييمات والتحقق من الشراء هيتم ربطهم بحسابات العملاء في المنصة النهائية.",
  "YOUR RATING": "تقييمك",
  "AGE GROUP": "الفئة العمرية",
  "Select age group": "اختار الفئة العمرية",
  "Select health goal": "اختار الهدف الصحي",
  "YOUR REVIEW": "رأيك",
  "Tell other shoppers about your experience...": "احكي للمتسوقين عن تجربتك...",
  "ADD PRODUCT IMAGE": "أضف صورة للمنتج",
  "JPG or PNG · optional": "JPG أو PNG · اختياري",
  "SUBMIT REVIEW": "إرسال التقييم",
  "STACKABLE VALUE SET": "باقة توفير متكاملة",
  COMPLETE: "كمّل",
  "THE ROUTINE.": "روتينك.",
  "Add products sharing the same health goal in one step. Final promotion rules can be connected to the commerce backend later.":
    "أضف منتجات لنفس هدفك الصحي في خطوة واحدة. قواعد العروض النهائية ممكن تتربط بنظام المتجر لاحقًا.",
  "SET TOTAL": "إجمالي الباقة",
  "ADD ROUTINE": "أضف الروتين",
  Powder: "مسحوق",
  Tablets: "أقراص",
  Capsules: "كبسولات",
  Softgels: "كبسولات هلامية",
  "Vi2 Pick": "اختيار Vi2",
  "Everyday Essential": "أساسي كل يوم",
  "Top Rated": "الأعلى تقييمًا",
  Premium: "مميز",
  Sports: "رياضي",
  "Premium Protein": "بروتين مميز",
  "New at Vi2": "جديد في Vi2",
  Chocolate: "شوكولاتة",
  "Chocolate Malt": "شوكولاتة ومالت",
  Unflavored: "بدون نكهة",
  "For Him Multivitamins": "فيتامينات متعددة للرجال",
  "For Him Multivitamin": "فيتامينات متعددة للرجال",
  "Nutri-Nations Creatine": "كرياتين Nutri-Nations",
  "Nutri-Nations Glutamine": "جلوتامين Nutri-Nations",
  "High Absorption Magnesium": "ماغنيسيوم عالي الامتصاص",
  "Omega-3 Fish Oil 1,000 mg": "زيت سمك أوميجا 3 بتركيز ١٬٠٠٠ مجم",
  "Omega-3 Fish Oil": "زيت سمك أوميجا 3",
  "Vitamin D3 5,000 IU": "فيتامين D3 بتركيز ٥٬٠٠٠ وحدة دولية",
  "Ultra Omega-3": "ألترا أوميجا 3",
  "CollagenUP Marine Collagen Peptides with Hyaluronic Acid and Vitamin C":
    "CollagenUP كولاجين بحري مع حمض الهيالورونيك وفيتامين C",
  "Gold C USP Grade Vitamin C 1,000 mg":
    "Gold C فيتامين C بدرجة USP بتركيز ١٬٠٠٠ مجم",
  "Gold C Vitamin C": "Gold C فيتامين C",
  "Zinc Picolinate 50 mg": "بيكولينات الزنك بتركيز ٥٠ مجم",
  "Zinc Picolinate": "بيكولينات الزنك",
  "Sports Creatine Monohydrate 750 mg":
    "كرياتين مونوهيدرات رياضي بتركيز ٧٥٠ مجم",
  "Ashwagandha Standardized Extract 450 mg":
    "مستخلص أشواجندا معياري بتركيز ٤٥٠ مجم",
  "LactoBif 30 Probiotics, 30 Billion CFU":
    "LactoBif 30 بروبيوتيك، ٣٠ مليار وحدة تكوين مستعمرة",
  "CoQ10 100 mg": "CoQ10 بتركيز ١٠٠ مجم",
  "Gold Standard 100% Whey Protein, Chocolate Malt":
    "Gold Standard واي بروتين 100%، شوكولاتة ومالت",
  "Gold Standard Whey": "Gold Standard واي بروتين",
  "RED REX Creatine 5000MG Unflavored": "RED REX كرياتين ٥٬٠٠٠ مجم بدون نكهة",
  "Red Rex Creatine 5000MG": "Red Rex كرياتين ٥٬٠٠٠ مجم",
  "Whole-body daily support for men in a simple daily multivitamin format.":
    "دعم يومي شامل للرجال بتركيبة فيتامينات متعددة سهلة الاستخدام.",
  "Micronized creatine for strength, performance and muscle-focused training routines.":
    "كرياتين ميكرونايزد لدعم القوة والأداء وروتين تمارين العضلات.",
  "Glutamine powder formulated for recovery-focused sports nutrition routines.":
    "مسحوق جلوتامين لروتين تغذية رياضية يركز على الاستشفاء.",
  "An omega supplement created for a simple everyday wellness routine.":
    "مكمل أوميجا لروتين صحي يومي بسيط.",
  "Whey protein created for convenient everyday sports nutrition.":
    "واي بروتين لتغذية رياضية يومية سهلة.",
  "Doctor's Best High Absorption Magnesium, 120 tablets, 100 mg per tablet.":
    "ماغنيسيوم عالي الامتصاص من Doctor's Best، ١٢٠ قرص، ١٠٠ مجم لكل قرص.",
  "NOW Foods Omega-3 fish oil in a 200-softgel bottle.":
    "زيت سمك أوميجا 3 من NOW Foods في عبوة ٢٠٠ كبسولة هلامية.",
  "California Gold Nutrition Vitamin D3, 125 mcg (5,000 IU), 90 fish gelatin softgels.":
    "فيتامين D3 من California Gold Nutrition، ١٢٥ ميكروجرام (٥٬٠٠٠ وحدة دولية)، ٩٠ كبسولة هلامية من جيلاتين السمك.",
  "NOW Foods Ultra Omega-3 fish oil in a convenient softgel format.":
    "زيت سمك ألترا أوميجا 3 من NOW Foods في كبسولات هلامية سهلة الاستخدام.",
  "Marine-sourced hydrolyzed collagen peptides with hyaluronic acid and vitamin C, unflavored.":
    "ببتيدات كولاجين بحري متحللة مع حمض الهيالورونيك وفيتامين C، بدون نكهة.",
  "USP-grade vitamin C, 1,000 mg per veggie capsule, in a 60-capsule bottle.":
    "فيتامين C بدرجة USP، ١٬٠٠٠ مجم لكل كبسولة نباتية، في عبوة ٦٠ كبسولة.",
  "NOW Foods Zinc Picolinate, 50 mg, in a 120 veggie-capsule bottle.":
    "بيكولينات الزنك من NOW Foods، ٥٠ مجم، في عبوة ١٢٠ كبسولة نباتية.",
  "NOW Foods Sports creatine monohydrate, 0.75 g per capsule, 120 veggie capsules.":
    "كرياتين مونوهيدرات رياضي من NOW Foods، ٠٫٧٥ جم لكل كبسولة، ١٢٠ كبسولة نباتية.",
  "NOW Foods standardized ashwagandha extract, 450 mg, 90 veggie capsules.":
    "مستخلص أشواجندا معياري من NOW Foods، ٤٥٠ مجم، ٩٠ كبسولة نباتية.",
  "California Gold Nutrition LactoBif 30 probiotics with 30 billion CFU per veggie capsule.":
    "بروبيوتيك LactoBif 30 من California Gold Nutrition، ٣٠ مليار وحدة تكوين مستعمرة لكل كبسولة نباتية.",
  "California Gold Nutrition CoQ10, 100 mg, in tapioca-based veggie softgels.":
    "CoQ10 من California Gold Nutrition، ١٠٠ مجم، في كبسولات هلامية نباتية من التابيوكا.",
  "Optimum Nutrition Gold Standard 100% Whey Protein, Chocolate Malt, 2 lb (907 g).":
    "واي بروتين Gold Standard 100% من Optimum Nutrition، شوكولاتة ومالت، ٢ رطل (٩٠٧ جم).",
  "Unflavored creatine monohydrate delivering 5,000 mg (5 g) per serving for strength, power and high-intensity training performance.":
    "كرياتين مونوهيدرات بدون نكهة، يوفر ٥٬٠٠٠ مجم (٥ جم) لكل حصة لدعم القوة والأداء في التمارين عالية الشدة.",
  "Close cart": "إغلاق السلة",
  "YOUR BAG": "سلة مشترياتك",
  "Your bag is empty.": "سلتك فاضية.",
  "Discover sports nutrition, wellness essentials and everyday supplements.":
    "اكتشف التغذية الرياضية وأساسيات العافية والمكملات اليومية.",
  "SHOP PRODUCTS": "تسوق المنتجات",
  Subtotal: "المجموع الفرعي",
  "Delivery is calculated at checkout.":
    "تكلفة التوصيل بتتحسب عند إتمام الطلب.",
  CHECKOUT: "إتمام الطلب",
  "DAILY ROTATION": "اختيارات بتتجدد يوميًا",
  FLASH: "عروض",
  "DEALS.": "محدودة.",
  "REFRESHES DAILY": "بتتجدد كل يوم",
  "Previous deals": "العروض السابقة",
  "Next deals": "العروض التالية",
  "FLASH PICK": "اختيار اليوم",
  "A rotating edit of popular products without adding another oversized hero carousel.":
    "مجموعة متجددة من المنتجات الرائجة في عرض بسيط وسهل التصفح.",
  "EGYPT MARKET": "السوق المصري",
  "Egyptian regulatory status and any applicable EDA registration or approval information should be displayed from the verified product record supplied to Vi2.":
    "الحالة التنظيمية في مصر وأي بيانات تسجيل أو موافقة من هيئة الدواء المصرية لازم تُعرض من سجل المنتج الموثق المقدم لـVi2.",
  "U.S. MARKET": "السوق الأمريكي",
  "Where a U.S. market notice is required, the product record can provide the applicable FDA dietary-supplement wording and labeling information.":
    "عند الحاجة لتنويه خاص بالسوق الأمريكي، سجل المنتج يوضح صياغة التنويه وبيانات الملصق الخاصة بالمكملات الغذائية وفق متطلبات FDA المنطبقة.",
  "EU MARKET": "سوق الاتحاد الأوروبي",
  "Where an EU market notice is required, the product record can provide the applicable EFSA-authorized claim or regulatory wording.":
    "عند الحاجة لتنويه خاص بالاتحاد الأوروبي، سجل المنتج يوضح الادعاء الصحي المصرح به من EFSA أو الصياغة التنظيمية المنطبقة.",
  "MARKET REGULATORY INFORMATION": "المعلومات التنظيمية حسب السوق",
  "Dynamic compliance presentation": "عرض بيانات الامتثال حسب السوق",
  "Regulatory market": "السوق التنظيمي",
  "Vi2 does not infer regulatory approval. Final status must come from verified catalog data for":
    "Vi2 لا يفترض وجود موافقة تنظيمية. الحالة النهائية لازم تيجي من بيانات كتالوج موثقة لمنتج",
  "VI2 REWARDS": "مكافآت Vi2",
  POINTS: "نقاط",
  "Earn points on eligible purchases and unlock member benefits over time.":
    "اجمع نقاط على المشتريات المؤهلة واستفد من مزايا العضوية مع الوقت.",
  "VIEW ACCOUNT": "عرض الحساب",
  "WELCOME BACK": "أهلًا برجوعك",
  "WELCOME TO VI2": "أهلًا بيك في Vi2",
  "My Account": "حسابي",
  "Buy It Again": "اشتريه تاني",
  "My Favourites": "المفضلة",
  "SIGN IN / CREATE ACCOUNT": "تسجيل الدخول / إنشاء حساب",
  "SIGN OUT": "تسجيل الخروج",
  Cairo: "القاهرة",
  Giza: "الجيزة",
  Alexandria: "الإسكندرية",
  Qalyubia: "القليوبية",
  Sharqia: "الشرقية",
  Dakahlia: "الدقهلية",
  Gharbia: "الغربية",
  Monufia: "المنوفية",
  Beheira: "البحيرة",
  Fayoum: "الفيوم",
  "Beni Suef": "بني سويف",
  Minya: "المنيا",
  Assiut: "أسيوط",
  Sohag: "سوهاج",
  Qena: "قنا",
  Luxor: "الأقصر",
  Aswan: "أسوان",
  "Red Sea": "البحر الأحمر",
  Suez: "السويس",
  Ismailia: "الإسماعيلية",
  "Port Said": "بورسعيد",
  "InstaPay / Bank Transfer": "إنستاباي / تحويل بنكي",
  "Debit / Credit Card": "بطاقة خصم / ائتمان",
  "Cash on Delivery": "الدفع عند الاستلام",
  "Your order is empty. Add a product before continuing.":
    "طلبك فاضي. أضف منتج قبل ما تكمل.",
  "Please complete all required fields.": "من فضلك كمّل كل البيانات المطلوبة.",
  "Enter a valid Egyptian mobile number, for example 01012345678.":
    "اكتب رقم موبايل مصري صحيح، مثل 01012345678.",
  "The order service is temporarily unavailable. Please try again.":
    "خدمة الطلبات مش متاحة مؤقتًا. حاول تاني.",
  "Could not place your order. Please try again.":
    "مقدرناش نسجل طلبك. حاول تاني.",
  DETAILS: "البيانات",
  "SECURE CHECKOUT": "إتمام الطلب بأمان",
  "Checkout progress": "خطوات إتمام الطلب",
  CONFIRM: "تأكيد",
  "ORDER SUMMARY": "ملخص الطلب",
  ITEM: "منتج",
  ITEMS: "منتجات",
  DELIVERY: "التوصيل",
  FREE: "مجاني",
  TOTAL: "الإجمالي",
  "FAST.": "بسرعة.",
  "SIMPLE.": "وبسهولة.",
  "Add your delivery details, review your order, and place it in the next step.":
    "أضف بيانات التوصيل، راجع طلبك، وأكده في الخطوة الجاية.",
  "STEP 01": "الخطوة ١",
  "CONTACT INFORMATION": "بيانات التواصل",
  "WHO ARE WE DELIVERING TO?": "هنوصّل الطلب لمين؟",
  "FULL NAME *": "الاسم بالكامل *",
  "Your full name": "اسمك بالكامل",
  "PHONE NUMBER *": "رقم الموبايل *",
  EMAIL: "البريد الإلكتروني",
  "STEP 02": "الخطوة ٢",
  "DELIVERY ADDRESS": "عنوان التوصيل",
  "WHERE SHOULD IT GO?": "هنوصّل فين؟",
  "GOVERNORATE *": "المحافظة *",
  "Select Governorate": "اختار المحافظة",
  "AREA / DISTRICT *": "المنطقة / الحي *",
  "Area / district": "المنطقة / الحي",
  "DETAILED ADDRESS *": "العنوان بالتفصيل *",
  "Building, street, floor and apartment": "رقم المبنى والشارع والدور والشقة",
  "DELIVERY NOTES": "ملاحظات التوصيل",
  "Optional delivery instructions": "تعليمات إضافية للتوصيل (اختياري)",
  "STANDARD DELIVERY": "التوصيل العادي",
  "Delivery across Egypt": "توصيل لكل مصر",
  "CONTINUE TO CONFIRMATION": "متابعة لتأكيد الطلب",
  "REVIEW & PLACE ORDER": "مراجعة وتأكيد الطلب",
  "CONFIRM YOUR ORDER": "أكد طلبك",
  "Check the details below, choose your payment method, then place your order.":
    "راجع البيانات، اختار طريقة الدفع، وبعدها أكد طلبك.",
  "PAYMENT METHOD": "طريقة الدفع",
  "CHOOSE ONE": "اختار طريقة",
  "Pay when your order arrives": "ادفع لما طلبك يوصلك",
  "INSTAPAY / BANK": "إنستاباي / تحويل بنكي",
  "Transfer after checkout": "التحويل بعد إتمام الطلب",
  "Card payment": "الدفع بالبطاقة",
  "This order will be created with payment status pending until the payment flow is connected.":
    "الطلب هيتسجل بحالة دفع معلّقة لحد ما نظام الدفع يتربط.",
  "ORDER REVIEW": "مراجعة الطلب",
  "VERIFY DETAILS": "تأكد من البيانات",
  EDIT: "تعديل",
  "Free delivery": "توصيل مجاني",
  PAYMENT: "الدفع",
  "Pay on arrival": "الدفع عند الاستلام",
  "Payment pending": "في انتظار الدفع",
  "PLACING ORDER...": "جاري تسجيل الطلب...",
  "Secure checkout. No account required.":
    "إتمام الطلب بأمان، من غير ما تحتاج حساب.",
  ORDER: "الطلب",
  SUMMARY: "الملخص",
  "Your order is empty.": "طلبك فاضي.",
  "RETURN TO SHOP": "الرجوع للمتجر",
  "EGP TO GO": "ج.م متبقية للشحن المجاني",
  "EGP / serving": "ج.م / الحصة",
  "Delivery across Egypt.": "توصيل لكل مصر.",
  "PLACING...": "جاري التسجيل...",
  CONTINUE: "متابعة",
  "PLACE ORDER": "تأكيد الطلب",
  "PREPARING CHECKOUT": "جاري تجهيز صفحة إتمام الطلب",
  "01 DETAILS": "١ البيانات",
  "02 CONFIRM": "٢ التأكيد",
  "03 COMPLETE": "٣ تم الطلب",
  "ORDER COMPLETE": "تم الطلب",
  "ORDER RECEIVED": "تم استلام الطلب",
  "STAGE 03 / COMPLETE": "الخطوة ٣ / تم الطلب",
  "RECEIVED.": "تم استلامه.",
  "THANK YOU": "شكرًا ليك",
  "ORDER REFERENCE": "رقم الطلب",
  "ORDER REGISTERED": "تم تسجيل الطلب",
  "Your order has been saved and is ready for the next fulfillment step.":
    "تم حفظ طلبك وهو جاهز للخطوة الجاية من التجهيز.",
  "We’ll use the delivery details you entered at checkout.":
    "هنستخدم بيانات التوصيل اللي سجلتها وقت الطلب.",
  DESTINATION: "وجهة التوصيل",
  Customer: "العميل",
  "We’ll use this number for order updates.": "هنستخدم الرقم ده لتحديثات طلبك.",
  "Payment due according to selected method": "الدفع حسب الطريقة اللي اخترتها",
  "CONTINUE SHOPPING": "كمّل تسوق",
  "BACK HOME": "الرجوع للرئيسية",
  "Keep your order reference for your records.": "احتفظ برقم طلبك للرجوع ليه.",
  "RECEIPT SUMMARY": "ملخص الإيصال",
  "PREPARING ORDER CONFIRMATION": "جاري تجهيز تأكيد الطلب",
  "VI2 ACCOUNT": "حساب Vi2",
  YOUR: "صحتك",
  "WELLNESS.": "أولًا.",
  "Accounts can add points, order history, faster reordering and personalized benefits — while guest checkout stays available.":
    "الحساب ممكن يوفر نقاط وسجل طلبات وإعادة شراء أسرع ومزايا شخصية، مع استمرار إمكانية الشراء من غير حساب.",
  "VI2 POINTS": "نقاط Vi2",
  "Points preview based on eligible orders stored in this browser.":
    "معاينة للنقاط حسب الطلبات المؤهلة المحفوظة على المتصفح ده.",
  "ACCOUNT BENEFITS": "مزايا الحساب",
  "Saved details, points and a faster return visit.":
    "بيانات محفوظة ونقاط وتجربة أسرع في زيارتك الجاية.",
  "ORDER HISTORY": "سجل الطلبات",
  "Keep purchases organized in one place.": "كل مشترياتك منظمة في مكان واحد.",
  "Reorder routine products with fewer steps.":
    "اطلب منتجات روتينك تاني بخطوات أقل.",
  "QUICK REPLENISH": "جدّد احتياجاتك بسرعة",
  "LAST QTY:": "آخر كمية:",
  "ADD AGAIN": "أضف تاني",
  "NO LOCAL ORDER YET": "مفيش طلب محفوظ هنا لسه",
  "YOUR NEXT ROUTINE STARTS HERE.": "روتينك الجاي بيبدأ هنا.",
  "Once an order is placed, its products can appear here for quick reordering.":
    "بعد تسجيل الطلب، منتجاته ممكن تظهر هنا علشان تطلبها تاني بسهولة.",
  "Enter your email and password.": "اكتب بريدك الإلكتروني وكلمة المرور.",
  "Could not sign in.": "مقدرناش نسجل دخولك.",
  "Signed in. Opening your account...": "تم تسجيل الدخول. جاري فتح حسابك...",
  WELCOME: "أهلًا",
  "BACK.": "برجوعك.",
  "Sign in to return to your Vi2 account experience, keep your shopping journey organized and make your next visit faster.":
    "سجّل دخولك لحساب Vi2، ونظّم مشترياتك وخلّي زيارتك الجاية أسرع.",
  "EMAIL ADDRESS": "البريد الإلكتروني",
  PASSWORD: "كلمة المرور",
  "Your password": "كلمة المرور الخاصة بيك",
  "Hide password": "إخفاء كلمة المرور",
  "Show password": "إظهار كلمة المرور",
  "SIGNING IN...": "جاري تسجيل الدخول...",
  "New to Vi2?": "أول مرة في Vi2؟",
  "CREATE ACCOUNT": "إنشاء حساب",
  "ONE ACCOUNT.": "حساب واحد.",
  "LESS FRICTION.": "خطوات أقل.",
  "A cleaner account experience designed around faster return visits, saved preferences and a simpler Vi2 journey.":
    "حساب بتجربة أبسط، وتفضيلات محفوظة، وزيارات أسرع مع Vi2.",
  "Keep purchases together.": "خلي مشترياتك في مكان واحد.",
  "Member benefits ready for later.": "مزايا العضوية جاهزة للتفعيل لاحقًا.",
  "FASTER RETURN": "رجوع أسرع",
  "Get back to your routine quickly.": "ارجع لروتينك بسرعة.",
  "VI2 ACCOUNT EXPERIENCE": "تجربة حساب Vi2",
  "Complete all required fields.": "كمّل كل البيانات المطلوبة.",
  "Enter a valid Egyptian mobile number.": "اكتب رقم موبايل مصري صحيح.",
  "Your password must be at least 8 characters.":
    "كلمة المرور لازم تكون ٨ أحرف على الأقل.",
  "The passwords do not match.": "كلمتا المرور مش متطابقتين.",
  "Accept the account terms to continue.": "وافق على شروط الحساب علشان تكمل.",
  "Your Vi2 account is ready.": "حسابك على Vi2 جاهز.",
  "JOIN VI2": "انضم لـVi2",
  CREATE: "أنشئ",
  "ACCOUNT.": "حسابك.",
  "Create your Vi2 account experience for a faster return, saved details and future member features.":
    "أنشئ حسابك على Vi2 لزيارات أسرع وبيانات محفوظة ومزايا عضوية مستقبلية.",
  "FIRST NAME *": "الاسم الأول *",
  "First name": "الاسم الأول",
  "LAST NAME *": "اسم العائلة *",
  "Last name": "اسم العائلة",
  "MOBILE NUMBER *": "رقم الموبايل *",
  "EMAIL ADDRESS *": "البريد الإلكتروني *",
  "PASSWORD *": "كلمة المرور *",
  "Create password": "أنشئ كلمة مرور",
  "8+ CHARACTERS": "٨ أحرف أو أكثر",
  "KEEP IT UNIQUE": "خليها مميزة",
  "CONFIRM PASSWORD *": "تأكيد كلمة المرور *",
  "Repeat password": "أعد كتابة كلمة المرور",
  "I agree to create a Vi2 account experience using these details on this browser.":
    "أوافق على إنشاء حساب Vi2 بالبيانات دي على المتصفح ده.",
  "CREATING ACCOUNT...": "جاري إنشاء الحساب...",
  "Already have an account?": "عندك حساب بالفعل؟",
  "JOIN THE": "ابدأ",
  "VI2 ROUTINE.": "روتين Vi2.",
  "A simple member experience built around your routine, without connecting any backend yet.":
    "تجربة عضوية بسيطة مناسبة لروتينك، من غير ربط بنظام خلفي لسه.",
  "MEMBER BENEFITS": "مزايا العضوية",
  "Ready for rewards later.": "جاهز للمكافآت لاحقًا.",
  "Ready for backend connection later.": "جاهز للربط بالنظام الخلفي لاحقًا.",
  "YOUR ROUTINE": "روتينك",
  "Make repeat shopping simpler.": "خلّي تكرار الشراء أسهل.",
  "VI2 IDENTITY": "هويتك على Vi2",
  "One clean account journey.": "تجربة حساب واحدة وبسيطة.",
  "FRONTEND ACCOUNT FLOW": "واجهة الحساب التجريبية",
  "VI2 COMPLETE CATALOG": "كتالوج Vi2 الكامل",
  "FIND YOUR": "اكتشف",
  "Explore products by supplement type, body system, health goal or life stage.":
    "اكتشف المنتجات حسب نوع المكمل أو أجهزة الجسم أو الهدف الصحي أو المرحلة العمرية.",
  "Search categories and health goals...": "ابحث في الأقسام والأهداف الصحية...",
  "SHOP BY PRODUCT TYPE": "تسوق حسب نوع المنتج",
  "PRODUCT CATEGORIES": "أقسام المنتجات",
  "SHOP BY HEALTH CONDITION": "تسوق حسب احتياجك الصحي",
  "THE VI2 BRAND EDIT": "اختيارات Vi2 من العلامات التجارية",
  "BRANDS A–Z": "العلامات التجارية من A إلى Z",
  "Browse the supplement and wellness brands curated for Vi2.":
    "اكتشف العلامات التجارية المختارة للمكملات والصحة في Vi2.",
  CURATED: "مختارة بعناية",
  "Omega & Fish Oils": "أوميجا وزيوت السمك",
  "MOST-LOVED AT VI2": "المفضلة عند عملاء Vi2",
  BEST: "الأكثر",
  "SELLERS.": "مبيعًا.",
  "The products customers keep coming back to — ranked by popularity, ratings and demand across the Vi2 catalog.":
    "منتجات بيرجع لها العملاء باستمرار، مرتبة حسب الرواج والتقييمات والطلب في كتالوج Vi2.",
  "Best seller categories": "أقسام الأكثر مبيعًا",
  "NO PRODUCTS IN THIS CATEGORY YET.": "مفيش منتجات في القسم ده لسه.",
  "VIEW ALL BEST SELLERS": "عرض كل الأكثر مبيعًا",
  "LOADING VI2": "جاري تحميل Vi2",
  "Daily micronutrients, minerals and foundational wellness.":
    "فيتامينات ومعادن يومية وأساسيات العافية.",
  "Kids Multivitamins": "فيتامينات متعددة للأطفال",
  "Prenatal Multivitamins": "فيتامينات متعددة للحمل",
  "Vitamin A": "فيتامين A",
  "Vitamin D": "فيتامين D",
  "Vitamin K": "فيتامين K",
  "Magnesium Glycinate": "ماغنيسيوم جليسينات",
  "Magnesium Citrate": "سترات الماغنيسيوم",
  "Protein, performance, hydration and training support.":
    "بروتين ودعم للأداء والترطيب والتمرين.",
  "Whey Concentrate": "واي بروتين مركز",
  "Casein Protein": "بروتين الكازين",
  "Egg White Protein": "بروتين بياض البيض",
  "Collagen Protein": "بروتين الكولاجين",
  "Nitric Oxide Boosters": "معززات أكسيد النيتريك",
  "Post-Workout / BCAAs": "ما بعد التمرين / أحماض BCAA",
  "BCAAs / EAAs": "أحماض أمينية BCAA / EAA",
  "Electrolyte Powders": "مساحيق أملاح ومعادن الترطيب",
  "Hydration Drinks": "مشروبات الترطيب",
  "Energy Bars": "ألواح الطاقة",
  "Meal Replacements": "بدائل الوجبات",
  "Omegas, specialty supplements, herbs and digestive support.":
    "أوميجا ومكملات متخصصة وأعشاب ودعم للهضم.",
  "Omega 3-6-9": "أوميجا 3-6-9",
  "Krill Oil": "زيت الكريل",
  "Algae Oil": "زيت الطحالب",
  "Curcumin / Turmeric": "كركمين / كركم",
  Elderberry: "البيلسان",
  "Beauty-from-within support for skin, hair and nails.":
    "دعم الجمال من الداخل للبشرة والشعر والأظافر.",
  "Hair / Skin / Nails Blends": "تركيبات الشعر / البشرة / الأظافر",
  "Age-specific nutrition and everyday support for children.":
    "تغذية مناسبة للعمر ودعم يومي للأطفال.",
  "Infant Vitamin D3 Drops": "نقط فيتامين D3 للرضع",
  "Infant Probiotics": "بروبيوتيك للرضع",
  "Kids Probiotics": "بروبيوتيك للأطفال",
  "Kids Omega-3": "أوميجا 3 للأطفال",
  "Cold & Cough Support": "دعم أثناء البرد والكحة",
  "Organic Puffs": "وجبات خفيفة عضوية منفوشة",
  Purees: "أطعمة مهروسة",
  "Teething Biscuits": "بسكويت التسنين",
  "Daily support, vitality, longevity and foundational routines.":
    "دعم يومي وحيوية وعافية طويلة المدى وروتين أساسي.",
  "Anti-Aging & Longevity": "العناية مع التقدم في العمر والعافية طويلة المدى",
  "Energy & Vitality": "الطاقة والحيوية",
  "Multivitamins & Daily Support": "فيتامينات متعددة ودعم يومي",
  "Stress & Fatigue": "التوتر والإجهاد",
  "Immune, respiratory and seasonal-support routines.":
    "روتين لدعم المناعة والجهاز التنفسي والعناية الموسمية.",
  "Common Cold & Flu": "نزلات البرد والإنفلونزا",
  "Seasonal Allergies": "الحساسية الموسمية",
  "Respiratory & Lung Health": "صحة الجهاز التنفسي والرئتين",
  "Gut, digestive, metabolic and liver-focused support.":
    "دعم الأمعاء والهضم والتمثيل الغذائي والكبد.",
  "Digestive Support & Gut Health": "دعم الهضم وصحة الأمعاء",
  "Detox & Cleanse": "التنقية وإزالة السموم",
  "Blood Sugar Support": "دعم سكر الدم",
  "Liver Support": "دعم الكبد",
  "Cardiovascular, cognitive and circulation-focused wellness.":
    "العناية بصحة القلب والقدرات الذهنية والدورة الدموية.",
  "Brain & Cognitive Support": "دعم المخ والقدرات الذهنية",
  "Memory & Focus": "الذاكرة والتركيز",
  "Heart & Cardiovascular Health": "صحة القلب والأوعية الدموية",
  "Blood Pressure Support": "دعم ضغط الدم",
  "Circulation & Vein Support": "دعم الدورة الدموية والأوردة",
  "Cholesterol Support": "دعم الكوليسترول",
  "Joint, muscle, bone and inflammation-support routines.":
    "روتين لدعم المفاصل والعضلات والعظام والعناية بالالتهابات.",
  "Bone & Joint Support": "دعم العظام والمفاصل",
  "Inflammation & Pain Relief": "الالتهابات وتخفيف الألم",
  "Muscle, Cramp & Recovery Support":
    "دعم العضلات والاستشفاء والعناية بالتقلصات",
  "Cartilage Support": "دعم الغضاريف",
  "Sleep, mood, relaxation and stress-relief support.":
    "دعم النوم والمزاج والاسترخاء وتقليل التوتر.",
  "Mood & Anxiety Support": "دعم المزاج والعناية بالقلق",
  "Stress Relief & Relaxation": "تقليل التوتر والاسترخاء",
  "LIFE STAGES": "مراحل الحياة",
  "Wellness organized around age, gender and stage of life.":
    "العافية حسب العمر والنوع ومرحلة الحياة.",
  "Women's Health": "صحة المرأة",
  "Men's Health": "صحة الرجل",
  "Children's Health": "صحة الأطفال",
  "Senior Health": "صحة كبار السن",
  "Pregnancy & Maternity Support": "دعم الحمل والأمومة",
  "BODY SYSTEMS & AESTHETICS": "أجهزة الجسم والعناية بالمظهر",
  "Targeted support for body systems and appearance goals.":
    "دعم متخصص لأجهزة الجسم وأهداف العناية بالمظهر.",
  "Eye & Vision Support": "دعم العين والبصر",
  "Urinary Tract & Kidney Health": "صحة المسالك البولية والكلى",
  "Prostate Health": "صحة البروستاتا",
  "Thyroid Support": "دعم الغدة الدرقية",
  "Oral & Dental Care": "العناية بالفم والأسنان",
  "No account with this email exists on this browser yet.":
    "مفيش حساب بالبريد ده على المتصفح ده لسه.",
  "Please complete all required delivery details.":
    "كمّل كل بيانات التوصيل المطلوبة.",
  "Please select a valid payment method.": "اختار طريقة دفع صحيحة.",
  "The order totals are invalid.": "إجمالي الطلب غير صحيح.",
  "One or more order items are invalid.": "في منتج أو أكثر غير صحيح في الطلب.",
  "Could not create your order. Please try again.":
    "مقدرناش ننشئ طلبك. حاول تاني.",
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function translateString(value: string) {
  const text = normalizeText(value);

  if (!text) {
    return value;
  }

  let result =
    dictionary[text] ??
    dictionary[value] ??
    dictionary[text.toUpperCase()] ??
    dictionary[text.toLowerCase()];

  if (!result && /^EGP\s*[\d,.]+$/.test(text)) {
    result = text.replace("EGP", "ج.م");
  }

  if (!result && /^[\d,.]+\s*EGP$/.test(text)) {
    result = text.replace("EGP", "ج.م");
  }

  if (!result && /^[\d,.]+ EGP \/ serving$/.test(text)) {
    result = text.replace("EGP / serving", "ج.م / الحصة");
  }

  if (!result && /^SAVE [\d,.]+ EGP$/.test(text)) {
    result = text.replace("SAVE", "وفّر").replace("EGP", "ج.م");
  }

  if (!result && /^ADD .+ TO CART$/.test(text)) {
    result = text.replace(/^ADD /, "أضف ").replace(/ TO CART$/, " للسلة");
  }

  if (!result && /^View .+/.test(text)) {
    result = text.replace(/^View /, "عرض ");
  }

  if (!result && /^Shop .+/.test(text)) {
    result = text.replace(/^Shop /, "تسوق ");
  }

  if (!result && /^Show slide [\d]+$/.test(text)) {
    result = text.replace("Show slide", "عرض الصورة");
  }

  if (!result && /^Remove .+/.test(text)) {
    result = text.replace(/^Remove /, "إزالة ");
  }

  return result ?? value;
}

function translate<T>(value: T, language: Language): T {
  if (language !== "ar") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  return translateString(value) as T;
}

const originalText = new WeakMap<Text, string>();

function shouldSkipDomNode(node: Node) {
  const parent = node.parentElement;

  if (!parent) {
    return true;
  }

  return Boolean(
    parent.closest(
      "script, style, noscript, textarea, input, select, option, code, pre, [data-no-translate]",
    ),
  );
}

function translateDomText(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    if (shouldSkipDomNode(node)) {
      continue;
    }

    if (!originalText.has(node)) {
      originalText.set(node, node.nodeValue ?? "");
    }

    const original = originalText.get(node) ?? "";

    if (language === "ar") {
      node.nodeValue = translateString(original);
    } else {
      node.nodeValue = original;
    }
  }
}

function getLanguage(): Language {
  if (currentLanguage) {
    return currentLanguage;
  }

  try {
    return localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

function getServerLanguage(): Language {
  return "en";
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      currentLanguage = null;
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function updateLanguage(language: Language) {
  currentLanguage = language;

  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The current browser session still updates through memory.
  }

  listeners.forEach((listener) => listener());
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribe,
    getLanguage,
    getServerLanguage,
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.body.dataset.locale = language;

    const observerOptions: MutationObserverInit = {
      childList: true,
      subtree: true,
    };

    const observer = new MutationObserver(() => {
      // Disconnect before translating so the DOM writes we are about to make
      // don't re-trigger this callback and cause an infinite loop.
      observer.disconnect();

      window.requestAnimationFrame(() => {
        translateDomText(document.body, language);
        // Reconnect after the translation paint so future dynamic content
        // (e.g. lazy-loaded components) still gets translated.
        observer.observe(document.body, observerOptions);
      });
    });

    // Initial translation pass on language change.
    window.requestAnimationFrame(() => {
      translateDomText(document.body, language);
      observer.observe(document.body, observerOptions);
      // Reveal page after translation — removes the opacity:0 set by the
      // beforeInteractive script so there is no English→Arabic flash on load.
      if (document.documentElement.style.opacity === "0") {
        document.documentElement.style.transition = "opacity 0.15s ease";
        document.documentElement.style.opacity = "1";
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [language]);

  const t = useCallback(
    <T,>(value: T): T => translate(value, language),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      isArabic: language === "ar",
      setLanguage: updateLanguage,
      t,
    }),
    [language, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
