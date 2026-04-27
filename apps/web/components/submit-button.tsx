"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

type SubmitButtonProps = {
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  variant = "default",
  size,
  className,
  pendingLabel = "Working...",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={isDisabled}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
