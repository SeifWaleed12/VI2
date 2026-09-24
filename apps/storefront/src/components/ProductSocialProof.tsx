"use client";

import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ImagePlus,
  Star,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";

import type { Product } from "@/types/product";
import {
  getProductHealthGoals,
} from "@/lib/catalogMeta";

import styles from "./ProductSocialProof.module.css";

type Props = {
  product: Product;
};

const ageGroups = [
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55+",
];

export default function ProductSocialProof({
  product,
}: Props) {
  const [submitted, setSubmitted] =
    useState(false);

  const [rating, setRating] =
    useState(5);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className={styles.section}>
      <div className={styles.summary}>
        <span>VERIFIED-BUYER REVIEWS</span>

        <div className={styles.ratingValue}>
          <strong>{product.rating}</strong>

          <div>
            <div className={styles.stars}>
              {Array.from({ length: 5 }).map(
                (_, index) => (
                  <Star
                    key={index}
                    size={17}
                    fill={
                      index <
                      Math.round(product.rating)
                        ? "currentColor"
                        : "none"
                    }
                    strokeWidth={1.2}
                  />
                ),
              )}
            </div>

            <span>
              {new Intl.NumberFormat(
                "en-EG",
              ).format(product.reviewCount)}{" "}
              ratings
            </span>
          </div>
        </div>

        <p>
          Review profiles can include age group,
          health goal and product images so shoppers
          can understand who a product worked for.
        </p>

        <div className={styles.trustRow}>
          <BadgeCheck
            size={16}
            strokeWidth={1.5}
          />

          <span>
            Verified-purchase tagging is prepared for
            the final customer-order system.
          </span>
        </div>
      </div>

      <div className={styles.formWrap}>
        <div className={styles.formHeading}>
          <div>
            <span>SHARE YOUR EXPERIENCE</span>
            <h2>WRITE A REVIEW</h2>
          </div>

          <Camera
            size={23}
            strokeWidth={1.35}
          />
        </div>

        {submitted ? (
          <div className={styles.success}>
            <CheckCircle2
              size={29}
              strokeWidth={1.35}
            />

            <strong>REVIEW FORM COMPLETED</strong>

            <span>
              Review moderation and verified-purchase
              checks will connect to customer accounts
              in the final platform.
            </span>
          </div>
        ) : (
          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <div className={styles.ratingPicker}>
              <span>YOUR RATING</span>

              <div>
                {Array.from({ length: 5 }).map(
                  (_, index) => {
                    const value =
                      index + 1;

                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${value} stars`}
                        onClick={() =>
                          setRating(value)
                        }
                      >
                        <Star
                          size={20}
                          fill={
                            value <= rating
                              ? "currentColor"
                              : "none"
                          }
                          strokeWidth={1.2}
                        />
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className={styles.fields}>
              <label>
                <span>AGE GROUP</span>

                <select defaultValue="">
                  <option
                    value=""
                    disabled
                  >
                    Select age group
                  </option>

                  {ageGroups.map((age) => (
                    <option key={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>HEALTH GOAL</span>

                <select defaultValue="">
                  <option
                    value=""
                    disabled
                  >
                    Select health goal
                  </option>

                  {getProductHealthGoals(
                    product,
                  ).map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={styles.reviewText}>
              <span>YOUR REVIEW</span>

              <textarea
                rows={5}
                placeholder="Tell other shoppers about your experience..."
                required
              />
            </label>

            <label className={styles.upload}>
              <ImagePlus
                size={19}
                strokeWidth={1.4}
              />

              <div>
                <strong>ADD PRODUCT IMAGE</strong>
                <span>
                  JPG or PNG · optional
                </span>
              </div>

              <input
                type="file"
                accept="image/png,image/jpeg"
              />
            </label>

            <button
              type="submit"
              className={styles.submit}
            >
              SUBMIT REVIEW
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
