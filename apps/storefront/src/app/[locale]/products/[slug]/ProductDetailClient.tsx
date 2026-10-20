"use client";
import { categoryHref } from "@/lib/category-tree";

import {
  BadgeCheck,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import Link from "@/components/LocaleLink";
import VariantSelector from "@/components/VariantSelector";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import type { Product, ProductOption, ProductVariant } from "@/types/product";

import styles from "./ProductDetail.module.css";
import CatalogImage from "@/components/CatalogImage";

// Product-page copy lives here so the shared dictionary stays with its owner.
const COPY = {
  en: {
    breadcrumb: "Breadcrumb",
    home: "Home",
    shop: "Shop",
    by: "By",
    currency: "EGP",
    priceUnavailable: "Price unavailable",
    unavailable: "Not available",
    inStock: "In stock",
    lowStock: (left: number) => `Only ${left} left`,
    outOfStock: "Out of stock",
    unconfirmed: "Availability unconfirmed",
    quantity: "Quantity",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    addToCart: "Add to cart",
    adding: "Adding…",
    added: "Added to cart",
    addFailed: "Could not add to cart. Please try again.",
    buyNow: "Buy now",
    share: "Share product",
    linkCopied: "Link copied",
    delivery: "Delivery across Egypt",
    deliveryFee: "The delivery fee is shown at checkout, before you place the order.",
    details: "Product details",
    brand: "Brand",
    categories: "Categories",
    sku: "SKU",
    eda: "EDA registration",
    edaApproved: "EDA approved",
    description: "Description",
    noDescription: "No description yet.",
    similar: "Similar products",
    viewAll: "View all",
  },
  ar: {
    breadcrumb: "مسار التصفح",
    home: "الرئيسية",
    shop: "المتجر",
    by: "من",
    currency: "ج.م",
    priceUnavailable: "السعر غير متاح",
    unavailable: "غير متاح",
    inStock: "متوفر",
    lowStock: (left: number) => `متبقي ${left} بس`,
    outOfStock: "غير متوفر",
    unconfirmed: "التوفر غير مؤكد",
    quantity: "الكمية",
    decrease: "تقليل الكمية",
    increase: "زيادة الكمية",
    addToCart: "أضف للسلة",
    adding: "جاري الإضافة…",
    added: "اتضاف للسلة",
    addFailed: "مقدرناش نضيف المنتج للسلة. حاول تاني.",
    buyNow: "اشتري دلوقتي",
    share: "مشاركة المنتج",
    linkCopied: "تم نسخ الرابط",
    delivery: "توصيل لكل مصر",
    deliveryFee: "رسوم التوصيل بتظهر في صفحة الدفع قبل تأكيد الطلب.",
    details: "تفاصيل المنتج",
    brand: "البراند",
    categories: "الأقسام",
    sku: "رمز المنتج",
    eda: "تسجيل هيئة الدواء المصرية",
    edaApproved: "معتمد من هيئة الدواء",
    description: "الوصف",
    noDescription: "مفيش وصف لسه.",
    similar: "منتجات مشابهة",
    viewAll: "عرض الكل",
  },
};

// Medusa gives products without real options one placeholder option.
const isPlaceholderOption = (option: ProductOption) =>
  option.title === "Default option" || option.values.every((value) => value === "Default option value");

const formatPrice = (value: number) => new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(value);
const shopHref = (category?: { id: string; handle: string }) => category ? categoryHref(category.id, category.handle) : "/shop";

export default function ProductDetailClient({
  product,
  similar,
}: {
  product: Product;
  similar: Product[];
}) {
  const router = useLocaleRouter();
  const { addItem } = useCart();
  const { language } = useLanguage();
  const copy = COPY[language === "ar" ? "ar" : "en"];

  const [quantity, setQuantity] = useState(1);
  const [cartState, setCartState] = useState<"idle" | "pending" | "added" | "failed">("idle");
  const [shareCopied, setShareCopied] = useState(false);
  const addInFlight = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const options = useMemo(
    () => (product.options ?? []).filter((option) => !isPlaceholderOption(option)),
    [product.options],
  );
  const choices = options.filter((option) => option.values.length > 1);
  const fixedOptions = options.filter((option) => option.values.length === 1);
  const variants: ProductVariant[] = useMemo(() => product.variants ?? [], [product.variants]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(options.map((option) => [option.title, option.values[0] ?? ""])),
  );

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    return (
      variants.find((variant) =>
        Object.entries(variant.options ?? {}).every(([title, value]) => {
          const chosen = Object.entries(selectedOptions).find(([key]) => same(key, title))?.[1];
          return !chosen || same(chosen, value);
        }),
      ) ?? variants[0]
    );
  }, [variants, selectedOptions]);

  const price = selectedVariant?.price ?? product.price;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const stock = selectedVariant?.stock ?? product.stock;
  const inventoryKnown = selectedVariant?.inventoryKnown ?? product.inventoryKnown;
  const priced = price > 0;
  const inStock = selectedVariant ? (selectedVariant.inStock ?? stock > 0) : product.inStock === true;
  const canBuy = priced && inStock;
  const maxQuantity = Math.max(1, Math.min(stock > 0 ? stock : 10, 10));

  const availability = !inStock
    ? (inventoryKnown === false ? copy.unconfirmed : copy.outOfStock)
    : stock > 0 && stock <= 8
      ? copy.lowStock(stock)
      : copy.inStock;

  const firstCategory = product.categories?.[0];
  const sku = selectedVariant?.sku;
  const facts: { label: string; value: ReactNode }[] = [
    ...(product.brand ? [{ label: copy.brand, value: product.brand }] : []),
    ...(product.categories?.length
      ? [{
          label: copy.categories,
          value: (
            <span className={styles.chips}>
              {product.categories.map((category) => (
                <Link key={category.id} href={shopHref(category)} className={styles.chip}>
                  {category.name}
                </Link>
              ))}
            </span>
          ),
        }]
      : []),
    ...fixedOptions.map((option) => ({ label: option.title, value: option.values[0] })),
    ...(sku ? [{ label: copy.sku, value: <span dir="ltr">{sku}</span> }] : []),
    ...(product.eda
      ? [{
          label: copy.eda,
          value: (
            <span className={styles.eda}>
              <span dir="ltr">{product.eda.registrationNumber}</span>
              {product.eda.approved && (
                <span className={styles.edaBadge}>
                  <BadgeCheck size={16} strokeWidth={1.6} aria-hidden="true" />
                  {copy.edaApproved}
                </span>
              )}
            </span>
          ),
        }]
      : []),
  ];

  function selectOption(title: string, value: string) {
    setSelectedOptions((current) => ({ ...current, [title]: value }));
    setQuantity(1);
  }

  async function addToCart() {
    if (!canBuy || addInFlight.current) return;
    addInFlight.current = true;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setCartState("pending");
    try {
      const success = await addItem(
        {
          ...product,
          variantId: selectedVariant?.id ?? product.variantId,
          price,
          compareAtPrice,
          size: selectedOptions.Size ?? product.size,
          flavor: selectedOptions.Flavor ?? product.flavor,
          stock,
        },
        quantity,
      );
      setCartState(success ? "added" : "failed");
      if (success) resetTimer.current = setTimeout(() => setCartState("idle"), 1400);
    } catch {
      setCartState("failed");
    } finally {
      addInFlight.current = false;
    }
  }

  function buyNow() {
    if (!canBuy) return;
    const variant = selectedVariant?.id ? `&variantId=${encodeURIComponent(selectedVariant.id)}` : "";
    router.push(`/checkout?buyNow=${encodeURIComponent(product.slug)}&quantity=${quantity}${variant}`);
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1600);
    } catch {
      // The shopper cancelled sharing.
    }
  }

  const priceText = priced ? `${formatPrice(price)} ${copy.currency}` : copy.priceUnavailable;
  const descriptionIsHtml = /<[a-z][\s\S]*>/i.test(product.description);

  return (
    <>
      <main className={styles.page}>
        <div className={styles.shell}>
          <nav className={styles.breadcrumbs} aria-label={copy.breadcrumb}>
            <ol>
              <li><Link href="/">{copy.home}</Link></li>
              <li><ChevronRight size={14} strokeWidth={1.6} aria-hidden="true" /><Link href="/shop">{copy.shop}</Link></li>
              {firstCategory && (
                <li><ChevronRight size={14} strokeWidth={1.6} aria-hidden="true" /><Link href={shopHref(firstCategory)}>{firstCategory.name}</Link></li>
              )}
              <li><ChevronRight size={14} strokeWidth={1.6} aria-hidden="true" /><span aria-current="page">{product.name}</span></li>
            </ol>
          </nav>

          <section className={styles.product}>
            <div className={styles.gallery}>
              <div className={styles.stage}>
                {product.badge && <span className={styles.badge}>{product.badge}</span>}
                <button type="button" className={styles.shareButton} onClick={share} aria-label={shareCopied ? copy.linkCopied : copy.share}>
                  {shareCopied ? <Check size={18} strokeWidth={1.6} /> : <Share2 size={18} strokeWidth={1.6} />}
                </button>
                <CatalogImage key={selectedVariant?.image || product.image} src={selectedVariant?.image || product.image} alt={product.name} className={styles.image} placeholderClassName={styles.imagePlaceholder} />
              </div>
              <span className={styles.srOnly} aria-live="polite">{shareCopied ? copy.linkCopied : ""}</span>
            </div>

            <div className={styles.head}>
              {product.brand && <p className={styles.brand}>{copy.by} <strong>{product.brand}</strong></p>}
              <h1 className={styles.title}>{product.name}</h1>
              {choices.length > 0 && (
                <VariantSelector
                  options={choices}
                  variants={variants}
                  selectedOptions={selectedOptions}
                  onSelectOption={selectOption}
                  outOfStockLabel={copy.outOfStock}
                />
              )}
            </div>

            <div className={styles.info}>
              {facts.length > 0 && (
                <section className={styles.block} aria-labelledby="product-details">
                  <h2 id="product-details" className={styles.blockTitle}>{copy.details}</h2>
                  <dl className={styles.facts}>
                    {facts.map((fact) => (
                      <div key={fact.label}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <section className={styles.block} aria-labelledby="product-description">
                <h2 id="product-description" className={styles.blockTitle}>{copy.description}</h2>
                {!product.description ? (
                  <p className={styles.muted}>{copy.noDescription}</p>
                ) : descriptionIsHtml ? (
                  <div className={styles.prose} dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <p className={styles.prose}>{product.description}</p>
                )}
              </section>
            </div>

            <aside className={styles.buy} aria-label={product.name}>
              <div className={styles.priceRow}>
                <strong className={priced ? styles.price : styles.priceMissing}>{priceText}</strong>
                {priced && compareAtPrice !== undefined && compareAtPrice > price && (
                  <s className={styles.comparePrice}>{formatPrice(compareAtPrice)} {copy.currency}</s>
                )}
              </div>
              <p className={inStock ? styles.stock : styles.stockOut}>
                <span className={styles.stockDot} aria-hidden="true" />
                {availability}
              </p>

              <div className={styles.buyRow}>
                <div className={styles.quantity} role="group" aria-label={copy.quantity}>
                  <button type="button" aria-label={copy.decrease} onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={!canBuy || quantity <= 1}>
                    <Minus size={16} />
                  </button>
                  <output aria-live="polite">{quantity}</output>
                  <button type="button" aria-label={copy.increase} onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))} disabled={!canBuy || quantity >= maxQuantity}>
                    <Plus size={16} />
                  </button>
                </div>
                <button type="button" className={styles.addButton} disabled={!canBuy || cartState === "pending"} onClick={addToCart}>
                  {canBuy && (cartState === "added" ? <Check size={18} /> : <ShoppingBag size={18} />)}
                  {!canBuy ? (priced ? copy.outOfStock : copy.unavailable) : cartState === "pending" ? copy.adding : cartState === "added" ? copy.added : copy.addToCart}
                </button>
              </div>
              {cartState === "failed" && <p className={styles.error} role="alert">{copy.addFailed}</p>}
              <button type="button" className={styles.buyNow} disabled={!canBuy} onClick={buyNow}>
                {copy.buyNow}
              </button>

              <p className={styles.delivery}>
                <Truck size={20} strokeWidth={1.5} aria-hidden="true" />
                <span><strong>{copy.delivery}</strong>{copy.deliveryFee}</span>
              </p>
            </aside>
          </section>

          {similar.length > 0 && (
            <section className={styles.similar} aria-labelledby="similar-products">
              <div className={styles.similarHead}>
                <h2 id="similar-products">{copy.similar}</h2>
                <Link href={shopHref(firstCategory)} className={styles.viewAll}>
                  {copy.viewAll}
                  <ChevronRight size={16} strokeWidth={1.6} aria-hidden="true" />
                </Link>
              </div>
              <ul className={styles.similarGrid}>
                {similar.map((item) => (
                  <li key={item.id}>
                    <Link href={`/products/${item.slug}`} className={styles.similarCard}>
                      <div className={styles.similarStage}>
                        <CatalogImage src={item.image} alt={item.name} placeholderClassName={styles.imagePlaceholder} />
                      </div>
                      {item.brand && <span className={styles.similarBrand}>{item.brand}</span>}
                      <span className={styles.similarName}>{item.name}</span>
                      <span className={styles.similarPrice}>
                        {item.price > 0 ? `${formatPrice(item.price)} ${copy.currency}` : copy.priceUnavailable}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <div className={styles.mobileBar}>
        <div>
          <span>{product.name}</span>
          <strong>{priced ? `${formatPrice(price * quantity)} ${copy.currency}` : copy.priceUnavailable}</strong>
        </div>
        <button type="button" disabled={!canBuy} onClick={buyNow}>
          {canBuy ? copy.buyNow : priced ? copy.outOfStock : copy.unavailable}
        </button>
      </div>
    </>
  );
}
