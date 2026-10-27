"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { localizedHref, type Locale } from "@/lib/i18n";
import type { ReviewPage, ReviewSort } from "@/types/review";
import { REVIEW_COPY } from "./copy";
import { ReviewStars } from "./ReviewStars";
import ReviewWriter from "./ReviewWriter";
import { useProductReviews } from "./use-product-reviews";
import { useOwnReview } from "./use-own-review";
import { clearReviewDraft, keepReviewDraft, readReviewDraft } from "./review-draft";
import styles from "./Reviews.module.css";

type Props = { productId: string; locale: Locale; initial: ReviewPage | null };
export default function ProductReviews({ productId, locale, initial }: Props) {
  const copy = REVIEW_COPY[locale];
  const router = useRouter();
  const { customer, isLoading: authLoading, refreshCustomer } = useAuth();
  const customerId = customer?.id ?? null;
  const [account, setAccount] = useState({ id: customerId, changed: false });
  if (account.id !== customerId) {
    setAccount({ id: customerId, changed: !!account.id && !!customerId });
  }
  const reviews = useProductReviews(productId, locale, initial);
  const own = useOwnReview(productId, locale, customer?.id ?? null);
  useEffect(() => { if (own.error === 401) void refreshCustomer(); }, [own.error, refreshCustomer]);
  const [writing, setWriting] = useState<"auto" | "open" | "closed">("auto");
  const recovery = customer ? readReviewDraft(productId, customer.id) : null;
  const writeButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const restoreWriteFocus = useRef(false);
  const accountNotice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    // Wait for the replacement form's initial focus before revealing the account change.
    if (account.changed && own.loaded) {
      accountNotice.current?.focus({ preventScroll: true });
      accountNotice.current?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [account.changed, account.id, own.loaded]);
  useEffect(() => {
    if (restoreWriteFocus.current && !own.busy && !authLoading) {
      restoreWriteFocus.current = false;
      writeButton.current?.focus();
    }
  }, [writing, own.busy, authLoading]);
  const number = (value: number) => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", { maximumFractionDigits: 1 }).format(value);
  const summary = reviews.page?.summary;
  const page = Math.floor(reviews.query.offset / 10) + 1;
  const pageCount = Math.max(1, Math.ceil((reviews.page?.count ?? 0) / 10));
  const signIn = () => {
    const destination = window.location.pathname + window.location.search + "#customer-reviews";
    router.push(localizedHref(`/account/sign-in?next=${encodeURIComponent(destination)}`, locale));
  };
  const close = () => { if (customer) clearReviewDraft(productId, customer.id); restoreWriteFocus.current = true; setWriting("closed"); };
  const saved = () => { close(); void reviews.refresh(); router.refresh(); };
  const changePage = (offset: number) => {
    void reviews.load({ ...reviews.query, offset });
    heading.current?.focus();
  };
  return <section id="customer-reviews" className={styles.section} aria-labelledby="customer-reviews-heading" data-no-translate>
    <header className={styles.header}>
      <h2 id="customer-reviews-heading" ref={heading} tabIndex={-1}>{copy.heading}</h2>
      <button ref={writeButton} className={styles.primary} disabled={authLoading || own.busy} onClick={() => customer ? setWriting("open") : signIn()}>
        {authLoading ? copy.accountLoading : !customer ? copy.signIn : own.review && own.review.status !== "withdrawn" ? copy.edit : copy.write}
      </button>
    </header>
    {account.changed && customer && <p ref={accountNotice} tabIndex={-1} className={styles.accountNotice} role="status">{copy.accountChanged}</p>}
    {!customer && own.sessionExpired && <p role="alert">{copy.session}</p>}
    {customer && <ReviewWriter key={customer.id} own={own} copy={copy} open={writing === "open" || (writing === "auto" && !!recovery)} draft={recovery} onDraft={draft => keepReviewDraft(productId, customer.id, draft)} onClose={close} onSaved={saved} onSignIn={signIn} />}
    <div className={styles.grid}>
      <aside className={styles.summary} aria-label={copy.heading}>
        {summary && summary.count > 0 && summary.average !== null ? <>
          <p className={styles.score}>{number(summary.average)} <small>{copy.outOfFive}</small></p>
          <ReviewStars rating={summary.average} label={copy.ratingLabel(number(summary.average))} />
          <p className={styles.muted}>{copy.reviewCount(summary.count)}</p>
          <div className={styles.breakdown}>
            {[5, 4, 3, 2, 1].map(rating => {
              const count = summary.distribution[rating] ?? 0;
              const percent = Math.round(count * 100 / summary.count);
              return <div className={styles.barRow} key={rating}>
                <span>{number(rating)} {copy.stars}</span>
                <progress className={styles.bar} max={summary.count} value={count} aria-label={`${copy.starLabel(rating)}: ${copy.reviewCount(count)}`} />
                <span>{number(percent)}%</span>
              </div>;
            })}
          </div>
        </> : !reviews.error && !reviews.loading ? <><h3>{copy.empty}</h3><p className={styles.muted}>{copy.emptyHint}</p></> : <p className={styles.muted}>{reviews.loading ? copy.loading : copy.unavailable}</p>}
      </aside>
      <div className={styles.listColumn}>
        <div className={styles.controls}>
          <label className={styles.control}>{copy.ratingFilter}
            <select value={reviews.query.rating ?? ""} onChange={event => void reviews.load({ ...reviews.query, rating: event.target.value ? Number(event.target.value) : undefined, offset: 0 })}>
              <option value="">{copy.allRatings}</option>
              {[5, 4, 3, 2, 1].map(value => <option value={value} key={value}>{copy.starLabel(value)}</option>)}
            </select>
          </label>
          <label className={styles.control}>{copy.sort}
            <select value={reviews.query.sort} onChange={event => void reviews.load({ ...reviews.query, sort: event.target.value as ReviewSort, offset: 0 })}>
              <option value="newest">{copy.newest}</option><option value="highest">{copy.highest}</option><option value="lowest">{copy.lowest}</option>
            </select>
          </label>
        </div>
        {reviews.loading ? <p role="status" className={styles.message}>{copy.loading}</p> : reviews.error ? <div className={styles.message}>
          <p role="alert">{copy.unavailable}</p><button className={styles.secondary} onClick={() => void reviews.refresh()}>{copy.retry}</button>
        </div> : <>
          <p role="status" className={styles.srOnly}>{copy.reviewCount(reviews.page?.count ?? 0)}</p>
          {reviews.page?.reviews.length ? <ul className={styles.list}>
            {reviews.page.reviews.map(review => <li key={review.id} className={styles.review}>
              <article>
                <div className={styles.reviewHead}><strong dir="auto">{review.first_name || copy.member}</strong><time className={styles.date} dateTime={review.created_at}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(new Date(review.created_at))}</time></div>
                <ReviewStars rating={review.rating} label={copy.starLabel(review.rating)} />
                {review.title && <h3 dir="auto">{review.title}</h3>}
                <p dir="auto">{review.content}</p>
              </article>
            </li>)}
          </ul> : <p className={styles.message}>{reviews.query.rating ? copy.noMatch : copy.emptyHint}</p>}
          {reviews.page && reviews.page.count > 10 && <nav className={styles.pagination} aria-label={copy.heading}>
            <button className={styles.secondary} disabled={reviews.query.offset === 0} onClick={() => changePage(reviews.query.offset - 10)}>{copy.previous}</button>
            <span>{copy.page} {number(page)} {copy.of} {number(pageCount)}</span>
            <button className={styles.secondary} disabled={reviews.query.offset + 10 >= reviews.page.count} onClick={() => changePage(reviews.query.offset + 10)}>{copy.next}</button>
          </nav>}
        </>}
      </div>
    </div>
  </section>;
}
