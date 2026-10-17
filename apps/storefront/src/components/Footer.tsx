"use client";
import Link from "@/components/LocaleLink";

import { LegacyTranslations, useLanguage } from "@/context/LanguageContext";
import { categoryHref, type Category } from "@/lib/category-tree";
export default function Footer({ categories = [] }: { categories?: Category[] }) {
  const { msg } = useLanguage();
  return (
    <LegacyTranslations><footer className="footer">
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
            {msg("catalog.all")}
          </Link>

          {categories.map(category => <Link key={category.id} href={categoryHref(category.id, category.handle)} data-no-translate>{category.name}</Link>)}
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
    </footer></LegacyTranslations>
  );
}
