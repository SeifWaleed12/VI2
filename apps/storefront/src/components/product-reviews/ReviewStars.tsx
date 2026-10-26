import { Star } from "lucide-react";
import styles from "./Reviews.module.css";
export function ReviewStars({ rating, label }: { rating: number; label: string }) {
  return <span className={styles.stars} role="img" aria-label={label}>
    {[0, 1, 2, 3, 4].map(index => <span key={index} className={styles.starCell} aria-hidden="true">
      <Star size={18} strokeWidth={1.5} />
      <span className={styles.starFill} style={{ width: `${Math.max(0, Math.min(1, rating - index)) * 100}%` }}><Star size={18} fill="currentColor" strokeWidth={1.5} /></span>
    </span>)}
  </span>;
}
