import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, localizedHref } from "@/lib/i18n";
import {
  informationPages,
  informationPreviewEnabled,
  informationSlugs,
  informationUi,
  isInformationSlug,
} from "@/lib/information-pages";
import styles from "./Information.module.css";

type Props = { params: Promise<{ locale: string; information: string }> };
async function pageData({ params }: Props) {
  const { locale, information } = await params;
  if (
    !informationPreviewEnabled() ||
    !isLocale(locale) ||
    !isInformationSlug(information)
  )
    notFound();
  return {
    locale,
    slug: information,
    page: informationPages[locale][information],
  };
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, page } = await pageData(props);
  return {
    title: page.title + " | Vi2",
    description: informationUi[locale].preview,
    robots: { index: false, follow: false },
  };
}
export default async function InformationPage(props: Props) {
  const { locale, slug, page } = await pageData(props);
  const ui = informationUi[locale];
  const href = (path: string) => localizedHref(path, locale);
  return (
    <main className={styles.page} data-no-translate>
      <nav className={styles.breadcrumb} aria-label={ui.breadcrumb}>
        <Link href={href("/")}>{ui.home}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{page.title}</span>
      </nav>
      <div className={styles.layout}>
        <nav className={styles.navigation} aria-label={ui.navigation}>
          <p className={styles.navigationTitle}>{ui.navigation}</p>
          <ul>
            {informationSlugs.map((item) => (
              <li key={item}>
                <Link
                  href={href("/" + item)}
                  aria-current={slug === item ? "page" : undefined}
                >
                  {informationPages[locale][item].title}
                </Link>
              </li>
            ))}
          </ul>
          <Link className={styles.shopLink} href={href("/shop")}>
            {ui.back}
          </Link>
        </nav>
        <article className={styles.article}>
          <header>
            <h1>{page.title}</h1>
            <p className={styles.intro}>{page.intro}</p>
          </header>
          <aside className={styles.notice} aria-labelledby="draft-notice-title">
            <h2 id="draft-notice-title">{ui.preview}</h2>
            <p>{ui.notice}</p>
          </aside>
          <nav className={styles.contents} aria-label={ui.contents}>
            <h2>{ui.contents}</h2>
            <ul>
              {page.sections.map((section) => (
                <li key={section.id}>
                  <a href={"#" + section.id}>{section.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          {page.sections.map((section) => (
            <section
              className={styles.section}
              key={section.id}
              aria-labelledby={section.id}
            >
              <h2 id={section.id} tabIndex={-1}>
                {section.title}
              </h2>
              <p>{section.body}</p>
              {section.missing && (
                <div className={styles.missing}>
                  <h3>{ui.missing}</h3>
                  <p>{section.missing}</p>
                </div>
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
