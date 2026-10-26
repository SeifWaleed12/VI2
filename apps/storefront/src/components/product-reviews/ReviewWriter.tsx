"use client";
import { useState } from "react";
import type { ReviewDraft } from "@/types/review";
import type { ReviewCopy } from "./copy";
import type { useOwnReview } from "./use-own-review";
import ReviewForm from "./ReviewForm";
import styles from "./Reviews.module.css";

type Props = { own: ReturnType<typeof useOwnReview>; copy: ReviewCopy; open: boolean; draft: ReviewDraft | null; onDraft: (draft: ReviewDraft) => void; onClose: () => void; onSaved: () => void; onSignIn: () => void };
export default function ReviewWriter({ own, copy, open, draft, onDraft, onClose, onSaved, onSignIn }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [latest, setLatest] = useState(false);
  if (!own.loaded) return <p role="status">{copy.accountLoading}</p>;
  const review = own.review;
  const error = own.error === 409 ? copy.conflict : own.error === 429 ? copy.limited : own.error === 401 ? copy.session : own.error === 400 ? copy.invalid : copy.failed;
  // A failed initial read cannot safely be treated as a new review.
  if (!review && own.readError) return <div className={styles.own}>
    <p role="alert">{own.error === 401 ? copy.session : copy.ownUnavailable}</p>
    <button className={styles.secondary} onClick={own.error === 401 ? onSignIn : () => void own.reload()}>{own.error === 401 ? copy.signIn : copy.retry}</button>
  </div>;
  return <>
    {(review || own.error) && <div className={styles.own}>
      <h3>{copy.yourReview}</h3>
      {review && <p role="status">{copy[review.status]}</p>}
      {review?.moderation_reason && <p dir="auto">{review.moderation_reason}</p>}
      {review && <details><summary>{copy.current}</summary><p dir="auto">{review.title}</p><p dir="auto">{review.content}</p></details>}
      {own.error && <p role="alert">{error}</p>}
      {own.error === 401 && <button className={styles.secondary} onClick={onSignIn}>{copy.signIn}</button>}
      {own.error === 409 && <button className={styles.secondary} disabled={own.busy} onClick={async () => { if (await own.reload()) setLatest(true); }}>{copy.loadLatest}</button>}
      {latest && <p role="status">{copy.latest}</p>}
      {review && review.status !== "withdrawn" && <div className={styles.actions}>
        {!confirm ? <button className={styles.secondary} disabled={own.busy} onClick={() => setConfirm(true)}>{copy.withdraw}</button> : <>
          <p>{copy.confirmWithdraw}</p>
          <button className={styles.secondary} disabled={own.busy} onClick={async () => {
            if (await own.withdraw(review.version)) { setConfirm(false); onSaved(); }
          }}>{own.busy ? copy.withdrawing : copy.confirm}</button>
          <button className={styles.secondary} disabled={own.busy} onClick={() => setConfirm(false)}>{copy.cancel}</button>
        </>}
      </div>}
    </div>}
    {open && draft && <p role="status">{copy.recovered}</p>}
    {open && <ReviewForm draft={draft} copy={copy} review={review} busy={own.busy} onCancel={onClose} onSave={async draft => { onDraft(draft); if (await own.save(draft)) { setLatest(false); onSaved(); } }} />}
  </>;
}
