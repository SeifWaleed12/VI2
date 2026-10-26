"use client";
import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent } from "react";
import { Star } from "lucide-react";
import type { OwnReview, ReviewDraft } from "@/types/review";
import type { ReviewCopy } from "./copy";
import styles from "./Reviews.module.css";

type Props = { review: OwnReview | null; draft?: ReviewDraft | null; copy: ReviewCopy; busy: boolean; error?: string; feedback?: ReactNode; recovered?: boolean; onEdit?: () => void; onSave: (draft: ReviewDraft) => Promise<void>; onCancel: () => void };
export default function ReviewForm({ review, draft, copy, busy, error, feedback, recovered, onEdit, onSave, onCancel }: Props) {
  const id = useId();
  const firstRating = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRating.current?.focus(); }, []);
  const [rating, setRating] = useState(draft?.rating ?? review?.rating ?? 0);
  const [title, setTitle] = useState(draft?.title ?? review?.title ?? "");
  const [content, setContent] = useState(draft?.content ?? review?.content ?? "");
  const [invalid, setInvalid] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLTextAreaElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const ratingInvalid = invalid && !rating;
  const titleInvalid = invalid && title.trim().length > 120;
  const contentInvalid = invalid && (content.trim().length < 20 || content.trim().length > 3000);
  useEffect(() => { if (!busy && error) errorMessage.current?.focus(); }, [busy, error]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!rating || content.trim().length < 20 || content.trim().length > 3000 || title.trim().length > 120) {
      setInvalid(true);
      (!rating ? firstRating : title.trim().length > 120 ? titleInput : contentInput).current?.focus();
      return;
    }
    setInvalid(false);
    await onSave({ rating, title: title.trim(), content: content.trim(), ...(review ? { version: review.version } : {}) });
  };
  return <form noValidate className={styles.form} onSubmit={submit} aria-labelledby={`${id}-heading`} aria-busy={busy}>
    <h3 id={`${id}-heading`}>{review && review.status !== "withdrawn" ? copy.edit : copy.write}</h3>
    <p>{copy.help}</p>
    <fieldset disabled={busy} className={styles.ratingInput} aria-invalid={ratingInvalid || undefined} aria-describedby={ratingInvalid ? `${id}-error` : undefined}>
      <legend>{copy.rating}</legend>
      <div className={styles.ratingOptions}>
        {[1, 2, 3, 4, 5].map(value => <label key={value} className={styles.ratingChoice}>
          <input ref={value === 1 ? firstRating : undefined} type="radio" name={`${id}-rating`} value={value} required checked={rating === value} onChange={() => { setRating(value); onEdit?.(); }} />
          <Star size={24} fill={value <= rating ? "currentColor" : "none"} strokeWidth={1.5} aria-hidden="true" />
          <span className={styles.srOnly}>{copy.starLabel(value)}</span>
        </label>)}
      </div>
    </fieldset>
    <label className={styles.field} htmlFor={`${id}-title`}>{copy.title}
      <input ref={titleInput} aria-invalid={titleInvalid || undefined} aria-describedby={titleInvalid ? `${id}-error` : undefined} id={`${id}-title`} dir="auto" value={title} onChange={event => { setTitle(event.target.value); onEdit?.(); }} maxLength={120} disabled={busy} />
    </label>
    <label className={styles.field} htmlFor={`${id}-content`}>{copy.feedback}
      <textarea ref={contentInput} id={`${id}-content`} dir="auto" value={content} onChange={event => { setContent(event.target.value); onEdit?.(); }} minLength={20} maxLength={3000} required rows={5} disabled={busy} aria-invalid={contentInvalid || undefined} aria-describedby={`${id}-help${contentInvalid ? ` ${id}-error` : ""}`} />
    </label>
    <p id={`${id}-help`} className={styles.muted}>{copy.feedbackHelp}</p>
    {invalid && <p id={`${id}-error`} role="alert">{copy.invalid}</p>}
    {recovered && <p role="status">{copy.recovered}</p>}
    {error && <p ref={errorMessage} tabIndex={-1} role="alert">{error}</p>}
    {feedback}
    <div className={styles.actions}>
      <button className={styles.primary} type="submit" disabled={busy}>{busy ? copy.submitting : review ? copy.save : copy.submit}</button>
      <button className={styles.secondary} type="button" disabled={busy} onClick={onCancel}>{copy.cancel}</button>
    </div>
  </form>;
}
