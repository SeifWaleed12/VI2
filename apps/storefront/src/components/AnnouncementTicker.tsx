"use client";

import { Pause, Play } from "lucide-react";
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
  const {
    ref,
    repetitions,
    reducedMotion,
    manualPause,
    paused,
    browsing,
    interactions,
    togglePause,
  } = useTickerMotion(messages.length);

  return (
    <section
      ref={ref}
      className={styles.announcementTicker}
      aria-label={msg("announcement.label")}
      data-no-translate
      data-browsing={browsing}
      {...interactions}
    >
      <div
        className={styles.topMarquee}
        role="group"
        aria-label={msg("announcement.label")}
        tabIndex={reducedMotion ? 0 : undefined}
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
      {!reducedMotion && (
        <button
          type="button"
          className={styles.announcementControl}
          onMouseDown={(event) => event.preventDefault()}
          onClick={togglePause}
          aria-label={msg(manualPause ? "ticker.resume" : "ticker.pause")}
        >
          {manualPause ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}
    </section>
  );
}
