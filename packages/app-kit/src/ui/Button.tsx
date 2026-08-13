"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import classnames from "classnames";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "danger" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function Button({ children, className, variant = "default", size = "default", ...otherProps }: ButtonProps) {
  const baseStyles = "flex items-center justify-center rounded font-medium transition-colors duration-200";

  const variantStyles = {
    default: "bg-black text-white hover:bg-black/80",
    outline:
      "border border-[var(--color-neutral-300)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]",
    danger: "bg-[var(--color-red-600)] text-white hover:bg-[var(--color-red-700)]",
    secondary:
      "bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-300)]",
  };

  const sizeStyles = {
    default: "px-4 py-2",
    sm: "px-2 py-1 text-sm",
    lg: "px-6 py-3 text-lg",
    icon: "p-2",
  };

  return (
    <button className={classnames(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...otherProps}>
      {children}
    </button>
  );
}
