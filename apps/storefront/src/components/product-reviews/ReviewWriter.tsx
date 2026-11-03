"use client";
import { useEffect, useRef, useState } from "react";
import type { ReviewDraft } from "@/types/review";
import type { ReviewCopy } from "./copy";
import type { useOwnReview } from "./use-own-review";
import ReviewForm from "./ReviewForm";
import styles from "./Reviews.module.css";

type Props = { own: ReturnType<typeof useOwnReview>; copy: ReviewCopy; open: boolean; draft: ReviewDraft | null; onDraft: (draft: ReviewDraft) => void; onClose: () => void; onSaved: () => void; onSignIn: () => void };
export default function ReviewWriter({ own, copy, open, draft, onDraft, onClose, onSaved, onSignIn }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [latest, setLatest] = useState(false);
  const [recovered, setRecovered] = useState(() => !!draft);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const withdrawButton = useRef<HTMLButtonElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const hadConfirmation = useRef(false);
  useEffect(() => {
    if (confirm) { hadConfirmation.current = true; confirmButton.current?.focus(); }
    else if (hadConfirmation.current && !own.busy) { hadConfirmation.current = false; withdrawButton.current?.focus(); }
  }, [confirm, own.busy]);
  useEffect(() => { if (!open && !own.busy && own.error) errorMessage.current?.focus(); }, [open, own.busy, own.error]);
  if (!own.loaded) return <p role="status">{copy.accountLoading}</p>;
  const review = own.review;
  const error = own.error === 409 ? copy.conflict : own.error === 429 ? copy.limited : own.error === 401 ? copy.session : own.error === 400 ? copy.invalid : copy.failed;
  // A failed initial read cannot safely be treated as a new review.
  if (!review && own.readError) return <div className={styles.own}>
    <p role="alert">{own.error === 401 ? copy.session : copy.ownUnavailable}</p>
    <button className={styles.secondary} onClick={own.error === 401 ? onSignIn : () => void own.reload()}>{own.error === 401 ? copy.signIn : copy.retry}</button>
  </div>;
  const feedback = <>
    {own.error === 401 && <button type="button" className={styles.secondary} onClick={onSignIn}>{copy.signIn}</button>}
    {own.error === 409 && <button type="button" className={styles.secondary} disabled={own.busy} onClick={async () => { if (await own.reload()) setLatest(true); }}>{copy.loadLatest}</button>}
    {latest && <p role="status">{copy.latest}</p>}
  </>;
  return <>
    {(review || own.error) && <div className={styles.own}>
      <h3>{copy.yourReview}</h3>
      {review && <p role="status">{copy[review.status]}</p>}
      {review?.moderation_reason && <p dir="auto">{review.moderation_reason}</p>}
      {review && <details><summary>{copy.current}</summary><p dir="auto">{review.title}</p><p dir="auto">{review.content}</p></details>}
      {!open && own.error && <p ref={errorMessage} tabIndex={-1} role="alert">{error}</p>}
      {!open && feedback}
      {review && review.status !== "withdrawn" && <div className={styles.actions}>
        {!confirm ? <button ref={withdrawButton} className={styles.secondary} disabled={own.busy} onClick={() => setConfirm(true)}>{copy.withdraw}</button> : <>
          <p>{copy.confirmWithdraw}</p>
          <button ref={confirmButton} className={styles.secondary} disabled={own.busy} onClick={async () => {
            if (await own.withdraw(review.version)) { setConfirm(false); onSaved(); }
          }}>{own.busy ? copy.withdrawing : copy.confirm}</button>
          <button className={styles.secondary} disabled={own.busy} onClick={() => setConfirm(false)}>{copy.cancel}</button>
        </>}
      </div>}
    </div>}
    {open && <ReviewForm recovered={recovered} onEdit={() => setRecovered(false)} error={own.error ? error : undefined} feedback={feedback} draft={draft} copy={copy} review={review} busy={own.busy} onCancel={onClose} onSave={async draft => { onDraft(draft); if (await own.save(draft)) { setLatest(false); onSaved(); } }} />}
  </>;
}
