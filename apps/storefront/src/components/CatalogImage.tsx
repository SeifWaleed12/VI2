"use client";

import { useState, type ImgHTMLAttributes } from "react";

import styles from "./CatalogImage.module.css";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src?: string;
  alt: string;
  // Extra class for the letter shown instead of the photo (for example a larger size).
  placeholderClassName?: string;
};

// The failure belongs to the URL that failed, so a new photo URL on the same
// image is tried again.
export const showsPhoto = (src: string | undefined, failedSrc: string | undefined): src is string =>
  !!src && src !== failedSrc;

// A product photo, or the product's first letter when it has no photo or the
// photo fails to load. An empty src would make the browser fetch the page again.
export default function CatalogImage({ src, alt, className, placeholderClassName, ...img }: Props) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (!showsPhoto(src, failedSrc)) {
    return (
      <div className={[styles.placeholder, className, placeholderClassName].filter(Boolean).join(" ")} role="img" aria-label={alt}>
        {alt.trim().charAt(0) || "V"}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- catalog images come from any configured host
  return <img {...img} src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />;
}
