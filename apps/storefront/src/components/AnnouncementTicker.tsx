"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useTickerMotion } from "@/hooks/use-ticker-motion";
import styles from "./Navbar.module.css";

export default function AnnouncementTicker() {
  const { msg } = useLanguage();
  const messages = [
    msg("announcement.essentials"),
    msg("announcement.range"),
    msg("announcement.collection"),
  ];
  // Seif requested autoplay; hover or keyboard focus pauses this strip.
  const {
    ref,
    repetitions,
    paused,
    interactions,
  } = useTickerMotion(messages.length, false);

  return (
    <section
      ref={ref}
      className={styles.announcementTicker}
      aria-label={msg("announcement.label")}
      data-no-translate
      data-autoplay="true"
      {...interactions}
    >
      <div
        className={styles.topMarquee}
        role="group"
        aria-label={msg("announcement.label")}
        tabIndex={0}
      >
        <div
          className={styles.topMarqueeTrack}
          style={{ animationPlayState: paused ? "paused" : "running" }}
        >
          {[0, 1].map((group) => (
            <div
              key={group}
              className={styles.topMarqueeGroup}
              data-ticker-copy={group > 0 || undefined}
              aria-hidden={group > 0 || undefined}
            >
              {Array.from({ length: repetitions }, (_, repeat) => (
                <div
                  key={repeat}
                  className={styles.topMarqueeGroup}
                  data-ticker-base={(group === 0 && repeat === 0) || undefined}
                  data-ticker-copy={repeat > 0 || undefined}
                  aria-hidden={repeat > 0 || undefined}
                >
                  {messages.map((text) => (
                    <span key={text} className={styles.topMarqueeItem}>
                      {text}
                      <i aria-hidden="true" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
