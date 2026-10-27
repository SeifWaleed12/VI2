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
import { initialSelection, isPurchasableVariant, matchesSelection } from "@/lib/product-variants";
import { useCart } from "@/context/CartContext";
import { listProducts } from "@/lib/medusa/services/products";
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
    soldOutNow: "Sorry, this just sold out.",
    allInCart: (count: number) => count === 1 ? "You already have the last one in your cart." : `You already have all ${count} available in your cart.`,
    onlyMore: (count: number) => `Only ${count} more available.`,
    viewCart: "View cart",
    buyNow: "Buy now",
    share: "Share product",
    photo: "Show photo",
    linkCopied: "Link copied",
    delivery: "Delivery across Egypt",
    deliveryFee: "The delivery fee is shown at checkout, before you place the order.",
    details: "Product details",
    brand: "Brand",
    categories: "Categories",
    invalidSelection: "This combination is not available. Choose another option.",
    optionUnavailable: "Unavailable",
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
    soldOutNow: "للأسف الكمية خلصت دلوقتي.",
    allInCart: (count: number) => count === 1 ? "آخر قطعة موجودة في سلتك بالفعل." : `كل الـ${count} المتاحين موجودين في سلتك بالفعل.`,
    onlyMore: (count: number) => `متاح ${count} كمان بس.`,
    viewCart: "عرض السلة",
    buyNow: "اشتري دلوقتي",
    share: "مشاركة المنتج",
    photo: "عرض الصورة",
    linkCopied: "تم نسخ الرابط",
    delivery: "توصيل لكل مصر",
    deliveryFee: "رسوم التوصيل بتظهر في صفحة الدفع قبل تأكيد الطلب.",
    details: "تفاصيل المنتج",
    brand: "البراند",
    categories: "الأقسام",
    invalidSelection: "هذه التركيبة غير متاحة. اختر خيارات أخرى.",
    optionUnavailable: "غير متاح",
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
  reviewContent,
  reviewSummary,
}: {
  product: Product;
  similar: Product[];
  reviewContent?: ReactNode;
  reviewSummary?: ReactNode;
}) {
  const router = useLocaleRouter();
  const { addItem, items, openCart } = useCart();
  const { language } = useLanguage();
  const copy = COPY[language === "ar" ? "ar" : "en"];

  const [picked, setQuantity] = useState(1);
  // A variant's limit read fresh after Medusa refused an add.
  const [fresh, setFresh] = useState<{ variantId?: string; limit?: number }>();
  const [cartState, setCartState] = useState<"idle" | "pending" | "added" | "failed">("idle");
  const [shareCopied, setShareCopied] = useState(false);
  // The first photo slot shows the chosen flavor's own photo when it has one.
  const photos = product.images ?? [product.image];
  const [photo, setPhoto] = useState(0);
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
    initialSelection(options, variants),
  );

  const selectedVariant = useMemo(
    () => options.length === 0
      ? variants.find(isPurchasableVariant) ?? variants[0]
      : variants.find((variant) => matchesSelection(variant, selectedOptions)),
    [options.length, variants, selectedOptions],
  );
  const invalidSelection = variants.length > 0 && !selectedVariant;
  const shownPhoto = (photo === 0 && selectedVariant?.image) || photos[photo] || product.image;
  const price = variants.length ? selectedVariant?.price ?? 0 : product.price;
  const compareAtPrice = variants.length ? selectedVariant?.compareAtPrice : product.compareAtPrice;
  const stock = variants.length ? selectedVariant?.stock ?? 0 : product.stock;
  const inventoryKnown = variants.length ? selectedVariant?.inventoryKnown : product.inventoryKnown;
  const priced = Number.isFinite(price) && price > 0;
  const inStock = !invalidSelection && (selectedVariant ? (selectedVariant.inStock ?? stock > 0) : product.inStock === true);
  const canBuy = priced && inStock;
  // What the cart may still take: Medusa's limit (or the fresh one) less what
  // it already holds of this variant. No limit means up to 10 at a time.
  const variantId = selectedVariant?.id ?? product.variantId;
  const limit = fresh && fresh.variantId === variantId ? fresh.limit : (variants.length ? selectedVariant?.maxQuantity : product.maxQuantity);
  const inCart = items.reduce((sum, item) => (item.product.variantId === variantId ? sum + item.quantity : sum), 0);
  const addable = limit === undefined ? 10 : Math.max(0, limit - inCart);
  const soldOut = limit === 0;
  const allInCart = !soldOut && inCart > 0 && addable === 0;
  const canAdd = canBuy && !soldOut && addable > 0;
  const maxQuantity = Math.max(1, Math.min(addable, 10));
  const quantity = Math.min(picked, maxQuantity);
  const stockNote = !canBuy ? "" : soldOut ? copy.soldOutNow : allInCart ? copy.allInCart(inCart)
    : fresh?.variantId === variantId && addable < picked ? copy.onlyMore(addable) : "";

  const availability = invalidSelection ? copy.invalidSelection : !inStock || soldOut
    ? (inventoryKnown === false ? copy.unconfirmed : copy.outOfStock)
    : stock > 0 && stock <= 8
      ? copy.lowStock(stock)
      : copy.inStock;

  const firstCategory = product.categories?.[0];

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

    // Seif (2026-10-24): only the approval is shown, never the registration number.
    ...(product.eda?.approved
      ? [{
          label: copy.eda,
          value: (
            <span className={styles.edaBadge}>
              <BadgeCheck size={16} strokeWidth={1.6} aria-hidden="true" />
              {copy.edaApproved}
            </span>
          ),
        }]
      : []),
  ];

  function selectOption(title: string, value: string) {
    setSelectedOptions((current) => ({ ...current, [title]: value }));
    setQuantity(1);
    setPhoto(0);
  }

  // Adds the selected variant; Buy now does it quietly and goes to checkout,
  // so the order, its totals and any promo code all use the one cart.
  async function addSelected(buyNow: boolean) {
    if (!canAdd || addInFlight.current) return;
    addInFlight.current = true;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setCartState("pending");
    try {
      const selected = {
        ...product,
        variantId: selectedVariant?.id ?? product.variantId,
        price,
        compareAtPrice,
        size: selectedOptions.Size ?? product.size,
        flavor: selectedOptions.Flavor ?? product.flavor,
        stock,
      };
      const success = buyNow ? await addItem(selected, quantity, { quiet: true }) : await addItem(selected, quantity);
      if (success && buyNow) return router.push("/checkout");
      if (!success && await stockChanged()) return setCartState("idle");
      setCartState(success ? "added" : "failed");
      if (success) resetTimer.current = setTimeout(() => setCartState("idle"), 1400);
    } catch {
      setCartState("failed");
    } finally {
      addInFlight.current = false;
    }
  }

  // After a refusal, reads this variant's stock fresh: when less is left than
  // was asked for, the page says so instead of "try again".
  async function stockChanged() {
    try {
      const { products } = await listProducts({ locale: language === "ar" ? "ar" : "en", id: [product.id], limit: 1, fresh: true });
      const latest = products[0]?.variants?.find((variant) => variant.id === variantId)?.maxQuantity;
      setFresh({ variantId, limit: latest });
      return latest !== undefined && latest - inCart < quantity;
    } catch {
      return false;
    }
  }

  const addToCart = () => addSelected(false);
  const buyNow = () => addSelected(true);

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
  const unavailableLabel = invalidSelection ? copy.unavailable : !priced ? copy.priceUnavailable : availability;

  return (
    <>
      <main className={styles.page} data-no-translate>
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
            <div className={styles.head}>
              {product.brand && <p className={styles.brand}>{copy.by} <strong>{product.brand}</strong></p>}
              <h1 className={styles.title}>{product.name}</h1>
              {reviewSummary}
            </div>

            <div className={styles.gallery}>
              <div className={styles.stage}>
                {product.badge && <span className={styles.badge}>{product.badge}</span>}
                <button type="button" className={styles.shareButton} onClick={share} aria-label={shareCopied ? copy.linkCopied : copy.share}>
                  {shareCopied ? <Check size={18} strokeWidth={1.6} /> : <Share2 size={18} strokeWidth={1.6} />}
                </button>
                <CatalogImage key={shownPhoto} src={shownPhoto} alt={product.name} className={styles.image} placeholderClassName={styles.imagePlaceholder} />
              </div>
              {photos.length > 1 && (
                <div className={styles.thumbs}>
                  {photos.map((src, index) => (
                    <button key={src} type="button" className={styles.thumb} aria-pressed={index === photo}
                      aria-label={`${copy.photo} ${index + 1} / ${photos.length}`} onClick={() => setPhoto(index)}>
                      <CatalogImage src={src} alt="" className={styles.thumbImage} />
                    </button>
                  ))}
                </div>
              )}
              <span className={styles.srOnly} aria-live="polite">{shareCopied ? copy.linkCopied : ""}</span>
            </div>

            <div className={styles.options}>
              {choices.length > 0 && (
                <VariantSelector
                  options={choices}
                  variants={variants}
                  selectedOptions={selectedOptions}
                  onSelectOption={selectOption}
                  outOfStockLabel={copy.optionUnavailable}
                />
              )}
            </div>

            <aside className={styles.buy} aria-label={product.name}>
              <div className={styles.priceRow} role="status" aria-atomic="true">
                <strong className={priced ? styles.price : styles.priceMissing}>{priceText}</strong>
                {priced && compareAtPrice !== undefined && compareAtPrice > price && (
                  <s className={styles.comparePrice}>{formatPrice(compareAtPrice)} {copy.currency}</s>
                )}
              </div>
              <p className={inStock && !soldOut ? styles.stock : styles.stockOut} role="status" aria-atomic="true">
                <span className={styles.stockDot} aria-hidden="true" />
                {availability}
              </p>

              <div className={styles.buyRow}>
                <div className={styles.quantity} role="group" aria-label={copy.quantity}>
                  <button type="button" aria-label={copy.decrease} onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={!canAdd || quantity <= 1}>
                    <Minus size={16} />
                  </button>
                  <output aria-live="polite">{quantity}</output>
                  <button type="button" aria-label={copy.increase} onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} disabled={!canAdd || quantity >= maxQuantity}>
                    <Plus size={16} />
                  </button>
                </div>
                <button type="button" className={styles.addButton} disabled={!canAdd || cartState === "pending"} onClick={addToCart}>
                  {canBuy && (cartState === "added" ? <Check size={18} /> : <ShoppingBag size={18} />)}
                  {!canBuy || soldOut ? unavailableLabel : cartState === "pending" ? copy.adding : cartState === "added" ? copy.added : copy.addToCart}
                </button>
              </div>
              {cartState === "failed" && <p className={styles.error} role="alert">{copy.addFailed}</p>}
              {stockNote && (
                <p className={styles.stockNote} role="status">
                  {stockNote}
                  {inCart > 0 && <button type="button" onClick={openCart}>{copy.viewCart}</button>}
                </p>
              )}
              <button type="button" className={styles.buyNow} disabled={!canAdd || cartState === "pending"} onClick={buyNow}>
                {copy.buyNow}
              </button>

              <p className={styles.delivery}>
                <Truck size={20} strokeWidth={1.5} aria-hidden="true" />
                <span><strong>{copy.delivery}</strong>{copy.deliveryFee}</span>
              </p>
            </aside>

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
                ) : (
                  <p className={styles.prose}>{product.description}</p>
                )}
              </section>
            </div>

          </section>

          {reviewContent}

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
                        <CatalogImage src={item.image} alt={item.name} loading="lazy" decoding="async" placeholderClassName={styles.imagePlaceholder} />
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

      <div className={styles.mobileBar} data-no-translate>
        <div className={styles.mobileSummary}>
          <span>{[...Object.values(selectedOptions), `${copy.quantity}: ${quantity}`].join(" · ")}</span>
          <strong>{priced ? `${formatPrice(price * quantity)} ${copy.currency}` : copy.priceUnavailable}</strong>
          {invalidSelection && <span>{copy.unavailable}</span>}
        </div>
        <button type="button" disabled={!canAdd || cartState === "pending"} onClick={addToCart}>
          {!canBuy || soldOut ? unavailableLabel : cartState === "pending" ? copy.adding : cartState === "added" ? copy.added : copy.addToCart}
        </button>
        {cartState === "failed" && <p className={styles.mobileError} role="alert">{copy.addFailed}</p>}
        {stockNote && <p className={styles.mobileError} role="status">{stockNote}</p>}
      </div>
    </>
  );
}
