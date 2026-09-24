import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <section className="footer-brand">
          <Link
            href="/"
            className="footer-logo"
          >
            Vi2
          </Link>

          <h2>
            LIVE WELL,
            <br />
            LIVE FULLY.
          </h2>

          <p>
            Dietary, wellness and
            sports nutrition selected
            around quality, simplicity
            and everyday living.
          </p>
        </section>

        <section className="footer-column">
          <span className="footer-heading">
            SHOP
          </span>

          <Link href="/shop">
            All products
          </Link>

          <Link href="/shop?category=Protein">
            <span data-arabic-text="البروتين">Protein</span>
          </Link>

          <Link href="/shop?category=Creatine">
            <span data-arabic-text="الكرياتين">Creatine</span>
          </Link>

          <Link href="/shop?category=Vitamins">
            <span data-arabic-text="الفيتامينات">Vitamins</span>
          </Link>

          <Link href="/shop?category=Wellness">
            <span data-arabic-text="العافية">Wellness</span>
          </Link>
        </section>

        <section className="footer-column">
          <span className="footer-heading">
            VI2
          </span>

          <span>
            About us
          </span>

          <span>
            Authenticity
          </span>

          <span>
            Shipping
          </span>

          <span>
            Returns
          </span>

          <span>
            Contact
          </span>
        </section>

        <section className="footer-column">
          <span className="footer-heading">
            FOLLOW
          </span>

          <span>
            Instagram
          </span>

          <span>
            TikTok
          </span>

          <span>
            Facebook
          </span>
        </section>
      </div>

      <div className="footer-bottom">
        <span>
          © 2026 Vi2
        </span>

        <span>
          Dietary & Wellness
          Supplements
        </span>

        <span>
          Egypt
        </span>
      </div>
    </footer>
  );
}
