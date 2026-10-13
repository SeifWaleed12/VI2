"use client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
export default function CategoryStatus({
  error,
  loading,
  retry,
}: {
  error: boolean;
  loading?: boolean;
  retry?: () => void;
}) {
  const { msg } = useLanguage();
  const router = useRouter();
  const retryAction = retry ?? (() => router.refresh());
  return (
    <div role="status">
      <p>
        {msg(
          loading
            ? "catalog.loading"
            : error
              ? "catalog.error"
              : "catalog.empty",
        )}
      </p>
      {error && (
        <button type="button" onClick={retryAction} disabled={loading}>
          {msg("catalog.retry")}
        </button>
      )}
    </div>
  );
}
