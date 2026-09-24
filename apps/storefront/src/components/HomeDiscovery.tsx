"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Dumbbell,
  Heart,
  Moon,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  useState,
} from "react";

import styles from "./HomeDiscovery.module.css";

const goals = [
  {
    name: "IMMUNE SUPPORT",
    query: "Immune Support",
    description:
      "Everyday defense",
    detail:
      "Vitamin C, D3, zinc and daily immune-support essentials.",
    icon: ShieldCheck,
  },
  {
    name: "GUT HEALTH",
    query: "Gut Health",
    description:
      "Feel better daily",
    detail:
      "Probiotics and digestive-support routines for everyday balance.",
    icon: Activity,
  },
  {
    name: "ENERGY & FITNESS",
    query: "Energy & Fitness",
    description:
      "Fuel your day",
    detail:
      "Performance-focused nutrition for energy, movement and daily drive.",
    icon: Zap,
  },
  {
    name: "MUSCLE & RECOVERY",
    query: "Muscle & Recovery",
    description:
      "Build. Repair. Perform.",
    detail:
      "Protein, creatine and recovery support for stronger training days.",
    icon: Dumbbell,
  },
  {
    name: "HEART HEALTH",
    query: "Heart Health",
    description:
      "For a healthier tomorrow",
    detail:
      "Omega support and cardiovascular wellness essentials.",
    icon: Heart,
  },
  {
    name: "STRESS & SLEEP",
    query: "Stress & Sleep",
    description:
      "A calmer, better you",
    detail:
      "Sleep and stress-support routines built around better recovery.",
    icon: Moon,
  },
];

export default function HomeDiscovery() {
  const [
    activeIndex,
    setActiveIndex,
  ] = useState(3);

  const activeGoal =
    goals[activeIndex];

  const ActiveIcon =
    activeGoal.icon;

  return (
    <section
      id="health-goals"
      className={
        styles.section
      }
    >
      <div
        className={
          styles.shell
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div
            className={
              styles.heading
            }
          >
            <span>
              SHOP BY HEALTH GOAL
            </span>

            <div
              className={
                styles.headingLine
              }
            >
              <h2 data-arabic-text="ابدأ بما تحتاجه.">
                START WITH
                <br />
                WHAT YOU NEED.
              </h2>

              <div
                className={
                  styles.promise
                }
              >
                <i />

                <p>
                  <span data-arabic-text="صحة حقيقية. تقدم حقيقي. نسخة أقوى منك.">
                  Real health.
                  <br />
                  Real progress.
                  <br />
                  A stronger you.
                  </span>
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/shop"
            className={
              styles.viewAll
            }
          >
            VIEW ALL
            <ArrowRight
              size={17}
              strokeWidth={
                1.45
              }
            />
          </Link>
        </header>

        <div
          className={
            styles.orbit
          }
        >
          <div
            className={
              styles.orbitLine
            }
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>

          <div
            className={
              styles.goalRail
            }
          >
            {goals.map(
              (
                goal,
                index,
              ) => {
                const Icon =
                  goal.icon;

                const active =
                  index ===
                  activeIndex;

                return (
                  <button
                    key={
                      goal.name
                    }
                    type="button"
                    className={`${styles.goal} ${
                      active
                        ? styles.activeGoal
                        : ""
                    }`}
                    onMouseEnter={() =>
                      setActiveIndex(
                        index,
                      )
                    }
                    onFocus={() =>
                      setActiveIndex(
                        index,
                      )
                    }
                    onClick={() =>
                      setActiveIndex(
                        index,
                      )
                    }
                    aria-pressed={
                      active
                    }
                  >
                    {active && (
                      <div
                        className={
                          styles.activeBackdrop
                        }
                      >
                        <span
                          className={
                            styles.ringOne
                          }
                        />

                        <span
                          className={
                            styles.ringTwo
                          }
                        />

                        <div
                          className={
                            styles.athlete
                          }
                        >
                          <Image
                            src="/health-goals/vi2-athlete.png"
                            alt=""
                            fill
                            sizes="210px"
                            className={
                              styles.athleteImage
                            }
                          />
                        </div>

                        <span
                          className={
                            styles.stronger
                          }
                          data-arabic-text="أقوى كل يوم"
                        >
                          STRONGER
                          <br />
                          EVERYDAY
                        </span>
                      </div>
                    )}

                    <div
                      className={
                        styles.iconCircle
                      }
                    >
                      <Icon
                        size={
                          active
                            ? 34
                            : 29
                        }
                        strokeWidth={
                          1.45
                        }
                      />
                    </div>

                    <strong>
                      {goal.name}
                    </strong>

                    <span
                      className={
                        styles.short
                      }
                    >
                      {
                        goal.description
                      }
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div
            className={
              styles.activeSummary
            }
          >
            <div
              className={
                styles.activeMeta
              }
            >
              <Sparkles
                size={13}
                strokeWidth={
                  1.45
                }
              />

              <span>
                VI2 GOAL PICK
              </span>
            </div>

            <div
              className={
                styles.activeCopy
              }
            >
              <ActiveIcon
                size={19}
                strokeWidth={
                  1.45
                }
              />

              <p>
                {
                  activeGoal.detail
                }
              </p>
            </div>

            <Link
              href={`/shop?goal=${encodeURIComponent(
                activeGoal.query,
              )}`}
              className={
                styles.shopNow
              }
            >
              SHOP NOW
              <ArrowRight
                size={16}
                strokeWidth={
                  1.5
                }
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
