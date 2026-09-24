"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./HomeHeroSlider.module.css";

const slides = [
  {
    desktopImage:
      "/hero/desktop-v1/performance.webp",
    mobileImage:
      "/hero/slider-v9/performance.webp",
    alt:
      "Vi2 performance supplement collection",
  },
  {
    desktopImage:
      "/hero/desktop-v1/wellness.webp",
    mobileImage:
      "/hero/slider-v9/daily-wellness.webp",
    alt:
      "Vi2 daily wellness supplement collection",
  },
  {
    desktopImage:
      "/hero/desktop-v1/daily.webp",
    mobileImage:
      "/hero/slider-v9/sports.webp",
    alt:
      "Vi2 sports nutrition supplement collection",
  },
  {
    desktopImage:
      "/hero/desktop-v1/mediterranean.webp",
    mobileImage:
      "/hero/slider-v9/wellness.webp",
    alt:
      "Vi2 everyday wellness supplement collection",
  },
];

export default function HomeHeroSlider() {
  const [
    active,
    setActive,
  ] = useState(0);

  const [
    paused,
    setPaused,
  ] = useState(false);

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

  useEffect(() => {
    if (paused) {
      return;
    }

    const reduceMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

    if (reduceMotion) {
      return;
    }

    const timer =
      window.setInterval(
        next,
        2000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    next,
    paused,
  ]);

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

    setPaused(true);
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
      setPaused(false);
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

    window.setTimeout(
      () =>
        setPaused(false),
      220,
    );
  }

  return (
    <section
      className={
        styles.hero
      }
      aria-label="Vi2 featured collections"
      aria-roledescription="carousel"
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
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
            <div
              className={
                styles.brandCluster
              }
            >
              <Image
                src="/brand/vi2-wordmark-packaging.png"
                alt="Vi2"
                width={164}
                height={66}
                priority
                className={
                  styles.wordmarkImage
                }
              />

              <div
                className={
                  styles.brandMeta
                }
              >
                <span
                  className={
                    styles.brandDivider
                  }
                />

                <span
                  className={
                    styles.brandDescriptor
                  }
                >
                  MORE THAN
                  <br />
                  SUPPLEMENTS
                </span>

                <span
                  className={
                    styles.brandRule
                  }
                />
              </div>
            </div>

            <h1>
              <span>
                LIVE WELL,
              </span>

              <strong>
                LIVE FULLY.
              </strong>
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
                data-arabic-text="مكملات متميزة لحياة أقوى وأكثر صحة."
              >
                PREMIUM SUPPLEMENTS
                <br />
                FOR A STRONGER,
                HEALTHIER YOU.
              </p>

              <div
                className={
                  styles.footerLine
                }
              >
                <span />

                <small>
                  SUPPLEMENTS FOR
                  A BRIGHTER YOU
                </small>

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
                    ? slide.alt
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
                    ? slide.alt
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
          aria-label="Choose hero slide"
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
