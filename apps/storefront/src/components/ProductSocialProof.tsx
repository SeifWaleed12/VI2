import type { Product } from "@/types/product";
import styles from "./ProductSocialProof.module.css";
export default function ProductSocialProof({ product }: { product: Product }) {
  return <section className={styles.section}><div className={styles.summary}>
    <h2>Customer reviews</h2><p>Verified reviews for {product.name} are not available yet.</p>
  </div></section>;
}
