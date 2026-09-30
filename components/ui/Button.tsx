import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "accent" | "outline" | "danger" | "ghost";
export type ButtonSize = "md" | "lg" | "xl";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "btn",
  accent: "btn-accent",
  outline: "btn-outline",
  danger: "btn-danger",
  ghost: "btn-ghost",
};

const SIZE: Record<ButtonSize, string> = {
  md: "",
  lg: "min-h-14 text-xl",
  xl: "min-h-16 text-2xl",
};

/** Class string for a button look. Use it on <a>, <Link> or <button>. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", block = false, className = ""): string {
  return cx(VARIANT[variant], SIZE[size], block && "w-full", className);
}

type Look = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

export function Button({ variant, size, block, className, type = "button", ...rest }: ComponentProps<"button"> & Look) {
  return <button type={type} className={buttonClass(variant, size, block, className)} {...rest} />;
}

export function ButtonLink({ variant, size, block, className, ...rest }: ComponentProps<typeof Link> & Look) {
  return <Link className={buttonClass(variant, size, block, className)} {...rest} />;
}
