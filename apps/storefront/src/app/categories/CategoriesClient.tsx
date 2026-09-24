"use client";

import Link from "next/link";
import {
  ArrowRight,
  Search,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import {
  healthTopicGroups,
  primaryCatalogGroups,
} from "@/data/catalogArchitecture";

import styles from "./Categories.module.css";

function filterGroups(
  groups: typeof primaryCatalogGroups,
  normalized: string,
) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !normalized ||
          item.toLowerCase().includes(normalized) ||
          group.title.toLowerCase().includes(normalized),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export default function CategoriesClient() {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();

  const productGroups = useMemo(
    () => filterGroups(primaryCatalogGroups, normalized),
    [normalized],
  );

  const healthGroups = useMemo(
    () => filterGroups(healthTopicGroups, normalized),
    [normalized],
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span>VI2 COMPLETE CATALOG</span>

        <h1>
          FIND YOUR
          <br />
          ROUTINE.
        </h1>

        <p>
          Explore products by supplement type, body
          system, health goal or life stage.
        </p>

        <label className={styles.search}>
          <Search size={18} strokeWidth={1.4} />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search categories and health goals..."
          />
        </label>
      </section>

      <Directory
        number="01"
        eyebrow="SHOP BY PRODUCT TYPE"
        title="PRODUCT CATEGORIES"
        groups={productGroups}
      />

      <Directory
        number="02"
        eyebrow="SHOP BY HEALTH CONDITION"
        title="HEALTH GOALS"
        groups={healthGroups}
        dark
        id="health-goals"
      />
    </main>
  );
}

function Directory({
  number,
  eyebrow,
  title,
  groups,
  dark = false,
  id,
}: {
  number: string;
  eyebrow: string;
  title: string;
  groups: typeof primaryCatalogGroups;
  dark?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`${styles.directory} ${
        dark ? styles.dark : ""
      }`}
    >
      <header className={styles.sectionHead}>
        <span>{number}</span>

        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
        </div>
      </header>

      <div className={styles.groupGrid}>
        {groups.map((group) => (
          <article
            key={group.id}
            id={group.id}
            className={styles.group}
          >
            <div className={styles.groupIntro}>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
            </div>

            <div className={styles.items}>
              {group.items.map((item) => (
                <Link
                  key={item}
                  href={`/shop?q=${encodeURIComponent(
                    item,
                  )}`}
                >
                  <span>{item}</span>
                  <ArrowRight
                    size={14}
                    strokeWidth={1.4}
                  />
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
