import type { ReactNode } from "react";
import { accountMessage, type AccountKey } from "@/lib/account-copy";
import type { Locale } from "@/lib/i18n";
import styles from "./Account.module.css";

// One labelled form field with its rule (hint) and its error right under it.
// The input gets aria-invalid and is described by both, so screen readers
// announce the problem when the field is focused.
export function AccountField({
  name, label, locale, error, hint, optional, children,
}: {
  name: string;
  label: AccountKey;
  locale: Locale;
  error?: AccountKey;
  hint?: AccountKey;
  optional?: boolean;
  children: (props: { id: string; name: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = `field-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {accountMessage(locale, label)}
        {optional && <span className={styles.optional}> ({accountMessage(locale, "optional")})</span>}
      </label>
      {children({ id, name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && <p id={`${id}-hint`} className={styles.fieldHint}>{accountMessage(locale, hint)}</p>}
      {error && <p id={`${id}-error`} className={styles.fieldError}>{accountMessage(locale, error)}</p>}
    </div>
  );
}

// After a failed submit, move the cursor to the first field with an error.
export function focusFirstError(form: HTMLFormElement, errors: Partial<Record<string, unknown>>, order: readonly string[]) {
  const first = order.find((name) => errors[name]);
  if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
}
