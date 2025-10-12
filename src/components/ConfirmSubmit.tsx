"use client";

type Props = {
  label: string;
  confirm: string;
  className?: string;
};

/**
 * Client component that confirms, then submits the nearest form.
 * Use inside a Server Component form that has a server action.
 */
export default function ConfirmSubmit({ label, confirm, className }: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        const form = (e.currentTarget as HTMLButtonElement).form;
        if (!form) return;
        if (window.confirm(confirm)) {
          // requestSubmit triggers the form's submit with default submitter semantics.
          // This is supported in modern browsers.
          // Fallback: form.submit() (won't send the submit button's name/value).
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.submit();
          }
        }
      }}
    >
      {label}
    </button>
  );
}
