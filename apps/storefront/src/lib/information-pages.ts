import type { Locale } from "./i18n";

export const informationSlugs = [
  "about",
  "contact",
  "shipping",
  "returns",
  "terms",
  "privacy",
] as const;
export type InformationSlug = (typeof informationSlugs)[number];
type Section = { id: string; title: string; body: string; missing?: string };
type InformationPage = { title: string; intro: string; sections: Section[] };

// No draft is approved for publication. A query parameter or public flag cannot unlock it.
export function informationPreviewEnabled() {
  return process.env.NODE_ENV === "development";
}
export function isInformationSlug(value: string): value is InformationSlug {
  return informationSlugs.some((slug) => slug === value);
}
export const informationUi = {
  en: {
    home: "Home",
    navigation: "Information",
    contents: "On this page",
    back: "Back to the shop",
    preview: "Draft for review",
    notice:
      "This page is a draft for the store owner to review. It is not a published policy. Business details and proposed terms still need approval.",
    missing: "Owner input required",
    related: "Other information",
    breadcrumb: "Breadcrumb",
  },
  ar: {
    home: "الرئيسية",
    navigation: "معلومات المتجر",
    contents: "في هذه الصفحة",
    back: "العودة إلى المتجر",
    preview: "مسودة للمراجعة",
    notice:
      "هذه الصفحة مسودة لمراجعة صاحب المتجر، وليست سياسة منشورة. لا تزال بيانات النشاط والشروط المقترحة بحاجة إلى الاعتماد.",
    missing: "مطلوب من صاحب المتجر",
    related: "معلومات أخرى",
    breadcrumb: "مسار التصفح",
  },
} satisfies Record<Locale, Record<string, string>>;

export const informationPages: Record<
  Locale,
  Record<InformationSlug, InformationPage>
> = {
  en: {
    about: {
      title: "About Vi2",
      intro:
        "Vi2 is a health and wellness storefront for customers in Egypt, bringing supplements, wellness products and sports nutrition into one place.",
      sections: [
        {
          id: "collection",
          title: "What you can explore",
          body: "Browse the collection by category, brand or product name. Product pages show the available options and information supplied for each product.",
        },
        {
          id: "details",
          title: "Information that helps you choose",
          body: "Review the product label and available details before choosing a supplement. Product information does not establish a medical recommendation or a guaranteed outcome.",
        },
        {
          id: "business",
          title: "The business behind Vi2",
          body: "This section will identify the business responsible for the store.",
          missing:
            "Registered business name, legal form, registered address, registration and tax details where applicable, and an approved brand introduction.",
        },
      ],
    },
    contact: {
      title: "Contact us",
      intro:
        "Questions about a product, an order or your account? This page will bring the store’s approved support details together.",
      sections: [
        {
          id: "support",
          title: "Customer support",
          body: "A verified support channel will be listed here before this page is published.",
          missing:
            "Support email, customer-service phone or WhatsApp number, opening hours, time zone and expected response times. Confirm which channels are actually staffed.",
        },
        {
          id: "order",
          title: "Help with an order",
          body: "When contacting support, include your order reference and a short description of the issue. Do not send your password, payment verification codes or full card details.",
          missing:
            "Confirm the process for order changes, cancellations, complaints and escalation.",
        },
        {
          id: "address",
          title: "Business and returns addresses",
          body: "The registered business address and any approved returns address will appear here. A warehouse address should not be presented as a public collection point without confirmation.",
          missing:
            "Registered address, returns address and whether customer visits or collection are offered.",
        },
      ],
    },
    shipping: {
      title: "Shipping & delivery",
      intro:
        "This draft covers delivery within Egypt. Delivery coverage, charges and times must be confirmed before publication.",
      sections: [
        {
          id: "coverage",
          title: "Where we deliver",
          body: "The storefront is intended for customers in Egypt. The final policy will list the areas served and any restrictions.",
          missing:
            "Governorates and districts served, excluded locations and any delivery restrictions.",
        },
        {
          id: "charges",
          title: "Delivery charges",
          body: "Where checkout is available, review the delivery option and charge shown before placing an order. This draft does not set a delivery price or a free-delivery threshold.",
          missing:
            "Approve the delivery-charge policy, any thresholds or surcharges, and consistency with the configured checkout options.",
        },
        {
          id: "timing",
          title: "Dispatch, tracking and delays",
          body: "The final policy will explain dispatch times, delivery estimates and how customers receive updates or report a delayed or missing delivery.",
          missing:
            "Processing times, working days and cut-off times, courier arrangements, tracking channel, failed-delivery process and delay/loss resolution.",
        },
      ],
    },
    returns: {
      title: "Returns & refunds",
      intro:
        "This draft separates a change of mind from a faulty, damaged or incorrect item. Eligibility and procedures need approval before publication.",
      sections: [
        {
          id: "request",
          title: "Requesting a return",
          body: "The published policy will explain how to contact support, identify the order and arrange a return. It must preserve applicable consumer rights.",
          missing:
            "Approved support channel, return-request process and address. Obtain legal review of applicable rights, time limits and any product-specific exceptions.",
        },
        {
          id: "condition",
          title: "Product condition and problems",
          body: "The final wording will distinguish unopened items, opened or unsealed products, and items that are faulty, damaged or supplied incorrectly. This draft does not impose a blanket exclusion for supplements.",
          missing:
            "Confirm lawful eligibility for each situation, evidence needed, return transport and responsibility for costs. Do not replace statutory rights with an arbitrary store rule.",
        },
        {
          id: "refund",
          title: "Refunds and exchanges",
          body: "The final policy will explain the refund method, the timing and treatment of delivery charges, and whether exchanges are offered.",
          missing:
            "Refund timing and methods, delivery-charge treatment, exchange process and cancellation handling, checked against applicable law and actual payment capabilities.",
        },
      ],
    },
    terms: {
      title: "Terms of service",
      intro:
        "Proposed terms for using Vi2 and ordering through the storefront. This draft is not an agreement and has not been approved for customer use.",
      sections: [
        {
          id: "identity",
          title: "Who operates the store",
          body: "The published terms will identify the legal business and how customers can contact it.",
          missing:
            "Legal entity name, registered address, registration and tax details where applicable, support contacts and effective date.",
        },
        {
          id: "orders",
          title: "Products, prices and orders",
          body: "Review the product options, displayed price and available delivery details before submitting an order. The final terms will explain when an order is accepted and what happens if an item or payment is unavailable.",
          missing:
            "Approve order acceptance, cancellation, pricing-error and stock-unavailability processes; payment methods and tax wording. Do not promise unreleased payment or delivery integrations.",
        },
        {
          id: "account",
          title: "Accounts and use of the store",
          body: "Proposed wording: keep account details accurate and protect your sign-in credentials. Report suspected unauthorized access through the approved support channel.",
          missing:
            "Approve account-use conditions, complaints handling, applicable law and dispute provisions. Confirm that all terms preserve mandatory consumer rights and agree with Shipping, Returns and Privacy.",
        },
      ],
    },
    privacy: {
      title: "Privacy notice",
      intro:
        "This draft explains the areas the store’s privacy notice must cover. The business must verify its data handling and approve the notice before publication.",
      sections: [
        {
          id: "data",
          title: "Information used by the store",
          body: "The storefront includes account, cart and checkout features that can handle contact, address and order details. The final notice must describe the information actually collected and why it is used.",
          missing:
            "Data controller identity and contact, complete data inventory, purposes and lawful grounds, including hosting/server logs and customer support. Confirm what is collected in the deployed service.",
        },
        {
          id: "storage",
          title: "Cookies and browser storage",
          body: "The current storefront uses browser storage for cart continuity and language preference, and cookies for language and sign-in state. This draft does not claim that analytics, advertising or marketing tracking is absent from every deployment.",
          missing:
            "Audit deployed cookies and storage, purposes and durations, consent requirements and all analytics or third-party scripts. Document retention periods and deletion processes.",
        },
        {
          id: "sharing",
          title: "Sharing, retention and your requests",
          body: "The final notice will identify relevant service-provider categories, retention practices and the process for privacy requests. It must describe actual arrangements rather than planned integrations.",
          missing:
            "Processors and recipients, hosting locations and transfers, retention schedules, security measures, rights and request procedures, privacy contact and applicable regulatory requirements. Obtain legal review.",
        },
      ],
    },
  },
  ar: {
    about: {
      title: "عن Vi2",
      intro:
        "Vi2 متجر للصحة والعافية يخدم العملاء في مصر، ويجمع المكملات الغذائية ومنتجات العافية والتغذية الرياضية في مكان واحد.",
      sections: [
        {
          id: "collection",
          title: "ماذا يمكنك أن تستكشف؟",
          body: "تصفّح المنتجات حسب القسم أو العلامة التجارية أو اسم المنتج. تعرض صفحات المنتجات الخيارات المتاحة والمعلومات المقدمة لكل منتج.",
        },
        {
          id: "details",
          title: "معلومات تساعدك على الاختيار",
          body: "راجع ملصق المنتج والمعلومات المتاحة قبل اختيار أي مكمل. لا تُعد معلومات المنتج توصية طبية أو ضماناً لنتيجة معينة.",
        },
        {
          id: "business",
          title: "النشاط المسؤول عن Vi2",
          body: "سيعرّف هذا القسم بالنشاط التجاري المسؤول عن المتجر.",
          missing:
            "الاسم القانوني للنشاط وشكله القانوني وعنوانه المسجل وبيانات السجل والضرائب بحسب انطباقها، ونبذة معتمدة عن العلامة.",
        },
      ],
    },
    contact: {
      title: "تواصل معنا",
      intro:
        "لديك سؤال عن منتج أو طلب أو حسابك؟ ستجمع هذه الصفحة بيانات الدعم المعتمدة للمتجر.",
      sections: [
        {
          id: "support",
          title: "خدمة العملاء",
          body: "ستُضاف قناة دعم موثّقة هنا قبل نشر الصفحة.",
          missing:
            "بريد الدعم ورقم خدمة العملاء أو واتساب وساعات العمل والمنطقة الزمنية ومدة الرد المتوقعة. تأكيد القنوات التي يتوفر لها فريق دعم فعلي.",
        },
        {
          id: "order",
          title: "المساعدة بشأن طلب",
          body: "عند التواصل مع الدعم، أرفق رقم الطلب ووصفاً مختصراً للمشكلة. لا ترسل كلمة مرورك أو رموز التحقق الخاصة بالدفع أو بيانات بطاقتك الكاملة.",
          missing: "تأكيد إجراءات تعديل الطلبات وإلغائها والشكاوى وتصعيدها.",
        },
        {
          id: "address",
          title: "عنوان النشاط وعنوان الاسترجاع",
          body: "سيظهر هنا العنوان المسجل للنشاط وأي عنوان معتمد للاسترجاع. لا ينبغي عرض عنوان المخزن كنقطة لاستلام العملاء دون تأكيد.",
          missing:
            "العنوان المسجل وعنوان الاسترجاع، وما إذا كانت زيارات العملاء أو الاستلام متاحة.",
        },
      ],
    },
    shipping: {
      title: "الشحن والتوصيل",
      intro:
        "تتناول هذه المسودة التوصيل داخل مصر. يجب تأكيد نطاق التغطية والرسوم والمدد قبل النشر.",
      sections: [
        {
          id: "coverage",
          title: "مناطق التوصيل",
          body: "المتجر مخصص للعملاء داخل مصر. ستوضح السياسة النهائية المناطق التي يشملها التوصيل وأي قيود.",
          missing:
            "المحافظات والمناطق المخدومة والمناطق المستثناة وأي قيود على التوصيل.",
        },
        {
          id: "charges",
          title: "رسوم التوصيل",
          body: "عندما يكون إتمام الطلب متاحاً، راجع خيار التوصيل ورسومه المعروضة قبل تأكيد طلبك. لا تحدد هذه المسودة سعراً للتوصيل أو حداً للشحن المجاني.",
          missing:
            "اعتماد سياسة رسوم التوصيل وأي حدود أو رسوم إضافية، ومطابقتها لخيارات الدفع والتوصيل المضبوطة فعلياً.",
        },
        {
          id: "timing",
          title: "تجهيز الطلب والتتبع والتأخير",
          body: "ستوضح السياسة النهائية مدد تجهيز الطلب والتوصيل وكيفية تلقي التحديثات أو الإبلاغ عن طلب متأخر أو مفقود.",
          missing:
            "مدد التجهيز وأيام العمل والمواعيد النهائية للطلبات وترتيبات شركة الشحن وقناة التتبع وإجراءات تعذر التسليم ومعالجة التأخير أو الفقد.",
        },
      ],
    },
    returns: {
      title: "الاسترجاع واسترداد المبالغ",
      intro:
        "تميّز هذه المسودة بين العدول عن الشراء والمنتج المعيب أو التالف أو غير المطابق للطلب. تتطلب الأهلية والإجراءات الاعتماد قبل النشر.",
      sections: [
        {
          id: "request",
          title: "طلب الاسترجاع",
          body: "ستوضح السياسة المنشورة كيفية التواصل مع الدعم وتحديد الطلب وترتيب الاسترجاع، مع الحفاظ على حقوق المستهلك المقررة قانوناً.",
          missing:
            "قناة الدعم وإجراءات طلب الاسترجاع وعنوانه. مراجعة قانونية للحقوق والمدد والاستثناءات التي قد تنطبق على منتجات معينة.",
        },
        {
          id: "condition",
          title: "حالة المنتج والمشكلات",
          body: "ستميز الصياغة النهائية بين المنتجات غير المفتوحة والمنتجات المفتوحة أو التي أزيل ختمها، والمنتجات المعيبة أو التالفة أو المرسلة بالخطأ. لا تفرض هذه المسودة استثناءً شاملاً على المكملات.",
          missing:
            "تأكيد الأهلية القانونية لكل حالة والمستندات المطلوبة ونقل المرتجع وتحمّل تكلفته. عدم استبدال الحقوق القانونية بقاعدة متجر اعتباطية.",
        },
        {
          id: "refund",
          title: "رد المبالغ والاستبدال",
          body: "ستوضح السياسة النهائية طريقة رد المبالغ ومدته وكيفية التعامل مع رسوم التوصيل، وما إذا كان الاستبدال متاحاً.",
          missing:
            "مدد ووسائل رد المبالغ ومعالجة رسوم التوصيل والاستبدال والإلغاء، وفق القانون المنطبق وإمكانات الدفع الفعلية.",
        },
      ],
    },
    terms: {
      title: "شروط الاستخدام",
      intro:
        "شروط مقترحة لاستخدام Vi2 والطلب عبر المتجر. هذه المسودة ليست اتفاقية ولم تُعتمد لاستخدام العملاء.",
      sections: [
        {
          id: "identity",
          title: "من يدير المتجر؟",
          body: "ستوضح الشروط المنشورة هوية النشاط القانوني وكيف يمكن للعملاء التواصل معه.",
          missing:
            "اسم الكيان القانوني وعنوانه المسجل وبيانات السجل والضرائب بحسب انطباقها وبيانات الدعم وتاريخ السريان.",
        },
        {
          id: "orders",
          title: "المنتجات والأسعار والطلبات",
          body: "راجع خيارات المنتج والسعر المعروض وبيانات التوصيل المتاحة قبل إرسال الطلب. ستوضح الشروط النهائية متى يُقبل الطلب وما يحدث عند عدم توفر المنتج أو وسيلة الدفع.",
          missing:
            "اعتماد إجراءات قبول الطلبات وإلغائها وأخطاء الأسعار ونفاد المخزون ووسائل الدفع والصياغة الضريبية. عدم التعهد بتكاملات دفع أو توصيل لم تُطلق بعد.",
        },
        {
          id: "account",
          title: "الحسابات واستخدام المتجر",
          body: "صياغة مقترحة: حافظ على دقة بيانات حسابك وسرية بيانات الدخول. أبلغ عن أي اشتباه في دخول غير مصرح به عبر قناة الدعم المعتمدة.",
          missing:
            "اعتماد شروط استخدام الحسابات وإجراءات الشكاوى والقانون المنطبق وتسوية المنازعات، مع صون حقوق المستهلك الإلزامية واتساقها مع الشحن والاسترجاع والخصوصية.",
        },
      ],
    },
    privacy: {
      title: "إشعار الخصوصية",
      intro:
        "توضح هذه المسودة الموضوعات التي يجب أن يغطيها إشعار خصوصية المتجر. يجب التحقق من ممارسات البيانات الفعلية واعتماد الإشعار قبل نشره.",
      sections: [
        {
          id: "data",
          title: "المعلومات التي يستخدمها المتجر",
          body: "يتضمن المتجر وظائف الحساب والسلة وإتمام الطلب التي قد تتعامل مع بيانات الاتصال والعنوان والطلبات. يجب أن يصف الإشعار النهائي البيانات التي تُجمع فعلياً وأغراض استخدامها.",
          missing:
            "هوية المتحكم في البيانات ووسيلة التواصل معه وحصر البيانات والأغراض والأسس القانونية، بما يشمل سجلات الاستضافة والخوادم والدعم. التحقق من الجمع الفعلي في الخدمة المنشورة.",
        },
        {
          id: "storage",
          title: "ملفات الارتباط وتخزين المتصفح",
          body: "يستخدم المتجر الحالي تخزين المتصفح لاستمرارية السلة وتفضيل اللغة، وملفات الارتباط للغة وحالة تسجيل الدخول. لا تزعم هذه المسودة غياب التحليلات أو الإعلانات أو التتبع التسويقي عن كل بيئات النشر.",
          missing:
            "تدقيق ملفات الارتباط والتخزين وأغراضها ومددها ومتطلبات الموافقة وأي تحليلات أو شيفرات لأطراف أخرى. توثيق مدد الاحتفاظ وإجراءات الحذف.",
        },
        {
          id: "sharing",
          title: "المشاركة والاحتفاظ وطلباتك",
          body: "سيحدد الإشعار النهائي فئات مقدمي الخدمات المعنيين وممارسات الاحتفاظ بالبيانات وإجراءات طلبات الخصوصية، استناداً إلى ترتيبات فعلية لا تكاملات مخططة.",
          missing:
            "المعالجون والمستلمون ومواقع الاستضافة ونقل البيانات ومدد الاحتفاظ وتدابير الأمان والحقوق وإجراءات الطلبات ووسيلة التواصل للخصوصية والمتطلبات التنظيمية المنطبقة. إجراء مراجعة قانونية.",
        },
      ],
    },
  },
};
