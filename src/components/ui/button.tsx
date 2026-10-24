import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]",
        secondary: "bg-surface-2 text-ink hover:bg-surface-3 border border-border",
        outline: "border border-border-strong bg-transparent text-ink hover:bg-surface-2",
        ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
        danger: "bg-danger/10 text-danger hover:bg-danger/15 border border-danger/25",
        link: "text-accent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        xs: "h-7 px-2 text-[12px]",
        sm: "h-8 px-2.5 text-[12.5px]",
        md: "h-9 px-3.5 text-[13px]",
        lg: "h-10 px-5 text-sm",
        icon: "h-8 w-8",
        iconSm: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
