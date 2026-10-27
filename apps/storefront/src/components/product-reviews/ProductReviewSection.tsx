import type { Locale } from "@/lib/i18n";
import type { ReviewPage } from "@/types/review";
import ProductReviews from "./ProductReviews";
import { REVIEW_COPY } from "./copy";
import { ReviewStars } from "./ReviewStars";
import styles from "./Reviews.module.css";

type Data = Promise<ReviewPage | null>;
export async function ProductReviewSection({ productId, locale, data }: { productId: string; locale: Locale; data: Data }) {
  const initial = await data;
  return <ProductReviews key={`${productId}:${locale}`} productId={productId} locale={locale} initial={initial} />;
}
export async function ProductReviewLink({ locale, data }: { locale: Locale; data: Data }) {
  const page = await data;
  const copy = REVIEW_COPY[locale];
  const average = page?.summary.average;
  const label = typeof average === "number" ? new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", { maximumFractionDigits: 1 }).format(average) : null;
  return <a className={styles.ratingLink} href="#customer-reviews">
    {label && <ReviewStars rating={average!} label={copy.ratingLabel(label)} />}
    <span>{page ? copy.reviewCount(page.summary.count) : copy.heading}</span>
  </a>;
}
export function ProductReviewLoading({ locale }: { locale: Locale }) {
  return <section id="customer-reviews" className={styles.section} aria-labelledby="customer-reviews-heading"><h2 id="customer-reviews-heading">{REVIEW_COPY[locale].heading}</h2><p role="status">{REVIEW_COPY[locale].loading}</p></section>;
}
