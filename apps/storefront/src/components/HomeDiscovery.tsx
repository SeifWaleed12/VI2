"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
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

import { useLanguage } from "@/context/LanguageContext";
import { goalLabelKey, type HealthGoal } from "@/lib/health-goals";
import type { MessageKey } from "@/lib/i18n";
import styles from "./HomeDiscovery.module.css";

const goals = [
  {
    name: "IMMUNE SUPPORT",
    handle: "immune-support" as HealthGoal,
    description:
      "home.goal.everydayDefense" as MessageKey,
    detail:
      "home.goal.vitaminCD" as MessageKey,
    icon: ShieldCheck,
  },
  {
    name: "GUT HEALTH",
    handle: "gut-health" as HealthGoal,
    description:
      "home.goal.feelBetterDaily" as MessageKey,
    detail:
      "home.goal.probioticsAndDigestive" as MessageKey,
    icon: Activity,
  },
  {
    name: "ENERGY & FITNESS",
    handle: "energy-fitness" as HealthGoal,
    description:
      "home.goal.fuelYourDay" as MessageKey,
    detail:
      "home.goal.performanceFocusedNutrition" as MessageKey,
    icon: Zap,
  },
  {
    name: "MUSCLE & RECOVERY",
    handle: "muscle-recovery" as HealthGoal,
    description:
      "home.goal.buildRepairPerform" as MessageKey,
    detail:
      "home.goal.proteinCreatineAnd" as MessageKey,
    icon: Dumbbell,
  },
  {
    name: "HEART HEALTH",
    handle: "heart-health" as HealthGoal,
    description:
      "home.goal.forAHealthier" as MessageKey,
    detail:
      "home.goal.omegaSupportAnd" as MessageKey,
    icon: Heart,
  },
  {
    name: "STRESS & SLEEP",
    handle: "stress-sleep" as HealthGoal,
    description:
      "home.goal.aCalmerBetter" as MessageKey,
    detail:
      "home.goal.sleepAndStress" as MessageKey,
    icon: Moon,
  },
];

export default function HomeDiscovery() {
  const { msg } = useLanguage();
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
            <span>{msg("home.shopByHealthGoal")}</span>

            <div
              className={
                styles.headingLine
              }
            >
              <h2>{msg("home.startWith")}<br />{msg("home.whatYouNeed")}</h2>

              <div
                className={
                  styles.promise
                }
              >
                <i />

                <p>
                  <span>{msg("home.realHealth")}<br />{msg("home.realProgress")}<br />{msg("home.aStrongerYou")}</span>
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/shop"
            className={
              styles.viewAll
            }
          >{msg("home.viewAll")}<ArrowRight
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
                      msg(goalLabelKey(goal.handle)).toUpperCase()
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
                         
                        >{msg("home.stronger")}<br />{msg("home.everyday")}</span>
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
                      {msg(goalLabelKey(goal.handle)).toUpperCase()}
                    </strong>

                    <span
                      className={
                        styles.short
                      }
                    >
                      {
                        msg(goal.description)
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

              <span>{msg("home.vi2GoalPick")}</span>
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
                  msg(activeGoal.detail)
                }
              </p>
            </div>

            <Link
              href={`/shop?goal=${activeGoal.handle}`}
              className={
                styles.shopNow
              }
            >
              {msg("home.shopGoal").replace("{goal}", msg(goalLabelKey(activeGoal.handle)))}
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
