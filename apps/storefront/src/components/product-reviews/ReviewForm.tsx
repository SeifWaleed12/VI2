"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import type { OwnReview, ReviewDraft } from "@/types/review";
import type { ReviewCopy } from "./copy";
import styles from "./Reviews.module.css";

type Props = { review: OwnReview | null; draft?: ReviewDraft | null; copy: ReviewCopy; busy: boolean; onSave: (draft: ReviewDraft) => Promise<void>; onCancel: () => void };
export default function ReviewForm({ review, draft, copy, busy, onSave, onCancel }: Props) {
  const id = useId();
  const firstRating = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRating.current?.focus(); }, []);
  const [rating, setRating] = useState(draft?.rating ?? review?.rating ?? 0);
  const [title, setTitle] = useState(draft?.title ?? review?.title ?? "");
  const [content, setContent] = useState(draft?.content ?? review?.content ?? "");
  const [invalid, setInvalid] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rating || content.trim().length < 20 || content.trim().length > 3000 || title.trim().length > 120) { setInvalid(true); return; }
    setInvalid(false);
    await onSave({ rating, title: title.trim(), content: content.trim(), ...(review ? { version: review.version } : {}) });
  };
  return <form className={styles.form} onSubmit={submit} aria-labelledby={`${id}-heading`} aria-busy={busy}>
    <h3 id={`${id}-heading`}>{review && review.status !== "withdrawn" ? copy.edit : copy.write}</h3>
    <p>{copy.help}</p>
    <fieldset disabled={busy} className={styles.ratingInput}>
      <legend>{copy.rating}</legend>
      <div className={styles.ratingOptions}>
        {[1, 2, 3, 4, 5].map(value => <label key={value} className={styles.ratingChoice}>
          <input ref={value === 1 ? firstRating : undefined} type="radio" name={`${id}-rating`} value={value} required checked={rating === value} onChange={() => setRating(value)} />
          <Star size={24} fill={value <= rating ? "currentColor" : "none"} strokeWidth={1.5} aria-hidden="true" />
          <span className={styles.srOnly}>{copy.starLabel(value)}</span>
        </label>)}
      </div>
    </fieldset>
    <label className={styles.field} htmlFor={`${id}-title`}>{copy.title}
      <input id={`${id}-title`} dir="auto" value={title} onChange={event => setTitle(event.target.value)} maxLength={120} disabled={busy} />
    </label>
    <label className={styles.field} htmlFor={`${id}-content`}>{copy.feedback}
      <textarea id={`${id}-content`} dir="auto" value={content} onChange={event => setContent(event.target.value)} minLength={20} maxLength={3000} required rows={5} disabled={busy} aria-invalid={invalid || undefined} aria-describedby={`${id}-help${invalid ? ` ${id}-error` : ""}`} />
    </label>
    <p id={`${id}-help`} className={styles.muted}>{copy.feedbackHelp}</p>
    {invalid && <p id={`${id}-error`} role="alert">{copy.invalid}</p>}
    <div className={styles.actions}>
      <button className={styles.primary} type="submit" disabled={busy}>{busy ? copy.submitting : review ? copy.save : copy.submit}</button>
      <button className={styles.secondary} type="button" disabled={busy} onClick={onCancel}>{copy.cancel}</button>
    </div>
  </form>;
}
