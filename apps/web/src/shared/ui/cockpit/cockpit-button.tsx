import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cockpitClassNames } from "./cockpit-utils";

type CockpitButtonVariant = "danger" | "icon" | "primary" | "secondary";

interface CockpitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingLabel?: ReactNode;
  variant?: CockpitButtonVariant;
}

export function CockpitButton({
  children,
  className,
  disabled,
  isLoading = false,
  loadingLabel,
  variant = "primary",
  ...props
}: CockpitButtonProps): ReactNode {
  return (
    <button
      className={cockpitClassNames(
        "cockpitButton",
        `cockpitButton--${variant}`,
        className
      )}
      disabled={disabled || isLoading}
      type="button"
      {...props}
    >
      {isLoading ? loadingLabel ?? "Working" : children}
    </button>
  );
}
