"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  className = "buttonPrimary",
  pendingLabel = "Working...",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button type="submit" className={className} disabled={isDisabled} aria-disabled={isDisabled}>
      {pending ? pendingLabel : children}
    </button>
  );
}
