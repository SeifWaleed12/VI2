import Image from "next/image";
import Link from "next/link";
import { categoryHref, type Category } from "@/lib/category-tree";
import { localizedHref, message, type Locale } from "@/lib/i18n";
import {
  informationPages,
  informationPreviewEnabled,
  informationSlugs,
} from "@/lib/information-pages";
import styles from "./Footer.module.css";

export default function Footer({
  categories = [],
  locale = "en",
}: {
  categories?: Category[];
  locale?: Locale;
}) {
  const msg = (key: Parameters<typeof message>[1]) => message(locale, key);
  const href = (value: string) => localizedHref(value, locale);
  const preview = informationPreviewEnabled();
  return (
    <footer className={styles.footer} data-no-translate>
      <div className={styles.shell}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Link
              href={href("/")}
              aria-label={msg("footer.home")}
              className={styles.logo}
            >
              <Image
                src="/brand/vi2-logo-mark-black.png"
                alt="Vi2"
                width={48}
                height={76}
              />
            </Link>
            <h2>{msg("footer.statement")}</h2>
            <p>{msg("footer.description")}</p>
          </div>
          <nav className={styles.column} aria-labelledby="footer-shop-title">
            <h2 id="footer-shop-title">{msg("footer.shop")}</h2>
            <ul>
              <li>
                <Link href={href("/shop")}>{msg("catalog.all")}</Link>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={href(categoryHref(category.id, category.handle))}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {preview && (
            <nav
              className={styles.column}
              aria-labelledby="footer-information-title"
            >
              <h2 id="footer-information-title">{msg("footer.information")}</h2>
              <ul>
                {informationSlugs.map((slug) => (
                  <li key={slug}>
                    <Link href={href("/" + slug)}>
                      {informationPages[locale][slug].title}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className={styles.preview}>{msg("footer.preview")}</p>
            </nav>
          )}
        </div>
        <div className={styles.bottom}>
          <span>
            © {new Date().getFullYear()} <bdi>Vi2</bdi>
          </span>
          <span>
            {msg("footer.category")} <span aria-hidden="true">/</span>{" "}
            {msg("footer.country")}
          </span>
        </div>
      </div>
    </footer>
  );
}
