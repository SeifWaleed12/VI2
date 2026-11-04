"use client";

import Image from "next/image";
import {
  useCallback,
  useRef,
  useState,
} from "react";

import type { MessageKey } from "@/lib/i18n";
import styles from "./HomeHeroSlider.module.css";
import { useLanguage } from "@/context/LanguageContext";

const slides = [
  {
    desktopImage:
      "/hero/desktop-v1/performance.webp",
    mobileImage:
      "/hero/slider-v9/performance.webp",
    alt:
      "home.slide.performance" as MessageKey,
  },
  {
    desktopImage:
      "/hero/desktop-v1/wellness.webp",
    mobileImage:
      "/hero/slider-v9/daily-wellness.webp",
    alt:
      "home.slide.daily" as MessageKey,
  },
  {
    desktopImage:
      "/hero/desktop-v1/daily.webp",
    mobileImage:
      "/hero/slider-v9/sports.webp",
    alt:
      "home.slide.sports" as MessageKey,
  },
  {
    desktopImage:
      "/hero/desktop-v1/mediterranean.webp",
    mobileImage:
      "/hero/slider-v9/wellness.webp",
    alt:
      "home.slide.everyday" as MessageKey,
  },
];

export default function HomeHeroSlider() {
  const { msg } = useLanguage();
  const [
    active,
    setActive,
  ] = useState(0);


  const touchStartX =
    useRef<number | null>(
      null,
    );

  const touchCurrentX =
    useRef<number | null>(
      null,
    );

  const next =
    useCallback(() => {
      setActive(
        (current) =>
          (current + 1) %
          slides.length,
      );
    }, []);

  const previous =
    useCallback(() => {
      setActive(
        (current) =>
          (current -
            1 +
            slides.length) %
          slides.length,
      );
    }, []);


  function handleTouchStart(
    event:
      React.TouchEvent<HTMLElement>,
  ) {
    const x =
      event.touches[0]
        ?.clientX ??
      null;

    touchStartX.current =
      x;

    touchCurrentX.current =
      x;

  }

  function handleTouchMove(
    event:
      React.TouchEvent<HTMLElement>,
  ) {
    touchCurrentX.current =
      event.touches[0]
        ?.clientX ??
      touchCurrentX.current;
  }

  function handleTouchEnd() {
    if (
      touchStartX.current ===
        null ||
      touchCurrentX.current ===
        null
    ) {
      return;
    }

    const distance =
      touchCurrentX.current -
      touchStartX.current;

    const swipeThreshold =
      45;

    if (
      distance <=
      -swipeThreshold
    ) {
      next();
    } else if (
      distance >=
      swipeThreshold
    ) {
      previous();
    }

    touchStartX.current =
      null;

    touchCurrentX.current =
      null;

  }

  return (
    <section
      className={
        styles.hero
      }
      aria-label={msg("home.vi2FeaturedCollections")}
      aria-roledescription="carousel"
      onTouchStart={
        handleTouchStart
      }
      onTouchMove={
        handleTouchMove
      }
      onTouchEnd={
        handleTouchEnd
      }
      onTouchCancel={
        handleTouchEnd
      }
    >
      <div
        className={
          styles.identity
        }
      >
        <div
          className={
            styles.identityInner
          }
        >
          <div
            className={
              styles.identityLockup
            }
          >
            <h1>
              <span>{msg("home.liveWell")}</span>

              <strong>{msg("home.liveFully")}</strong>
            </h1>

            <div
              className={
                styles.supportCopy
              }
            >
              <p
                className={
                  styles.statement
                }
                data-no-translate
                data-preserve-language
              >
                {msg("hero.statement")}
              </p>

              <div
                className={
                  styles.footerLine
                }
              >
                <span />

                <small>{msg("home.supplementsForABrighterYou")}</small>

                <span />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          styles.visual
        }
      >
        {slides.map(
          (
            slide,
            index,
          ) => (
            <div
              key={
                slide.desktopImage
              }
              className={
                index === active
                  ? `${styles.slide} ${styles.slideActive}`
                  : styles.slide
              }
              aria-hidden={
                index !==
                active
              }
            >
              {/*
                IMPORTANT:
                Do NOT use `fill` here.

                The generated desktop
                assets are 1916 × 600
                and mobile assets are
                1000 × 600.

                Giving Next.js their
                real dimensions removes
                the invalid-parent
                warning while CSS still
                makes each image fill
                the exact slide frame.
              */}
              <Image
                src={
                  slide.desktopImage
                }
                alt={
                  index === active
                    ? msg(slide.alt)
                    : ""
                }
                width={1916}
                height={600}
                priority={
                  index === 0
                }
                quality={100}
                sizes="100vw"
                className={
                  styles.desktopSlideImage
                }
              />

              <Image
                src={
                  slide.mobileImage
                }
                alt={
                  index === active
                    ? msg(slide.alt)
                    : ""
                }
                width={1000}
                height={600}
                priority={
                  index === 0
                }
                quality={100}
                sizes="100vw"
                className={
                  styles.mobileSlideImage
                }
              />
            </div>
          ),
        )}

        <div
          className={
            styles.dots
          }
          aria-label={msg("home.chooseHeroSlide")}
        >
          {slides.map(
            (
              _,
              index,
            ) => (
              <button
                key={index}
                type="button"
                className={
                  index === active
                    ? styles.dotActive
                    : styles.dot
                }
                onClick={() =>
                  setActive(
                    index,
                  )
                }
                aria-label={`Show slide ${
                  index + 1
                }`}
                aria-current={
                  index === active
                    ? "true"
                    : undefined
                }
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
