"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import styles from "./Button.module.css";

export type ButtonVariant = "dark" | "olive" | "light" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  disabled?: boolean;
}

export type ButtonProps = BaseButtonProps &
  (
    | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
    | ({ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
  );

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(
  {
    children,
    variant = "dark",
    size = "md",
    fullWidth = false,
    className = "",
    icon,
    iconPosition = "left",
    disabled,
    ...props
  },
  ref
) {
  const combinedClassName = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && iconPosition === "left" && (
        <span className={styles.icon}>{icon}</span>
      )}
      <span>{children}</span>
      {icon && iconPosition === "right" && (
        <span className={styles.icon}>{icon}</span>
      )}
    </>
  );

  if ("href" in props && props.href) {
    const { href, onClick, ...rest } = props;
    return (
      <Link
        href={href}
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={combinedClassName}
        onClick={onClick}
        aria-disabled={disabled}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  const { type = "button", onClick, ...rest } =
    props as React.ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={combinedClassName}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {content}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
