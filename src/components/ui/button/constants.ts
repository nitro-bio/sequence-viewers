import { cn } from "@utils/index";
import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  cn(
    "nsv:inline-flex nsv:items-center nsv:justify-center nsv:gap-2 nsv:whitespace-nowrap nsv:text-[0.875rem]/[1.25rem] nsv:[font-weight:500] nsv:[transition:all_150ms_cubic-bezier(0.4,0,0.2,1)] nsv:disabled:pointer-events-none nsv:disabled:opacity-50 nsv:[&_svg]:pointer-events-none nsv:[&_svg:not([class*='size-'])]:size-4 nsv:shrink-0 nsv:[&_svg]:shrink-0 nsv:[outline-style:none] nsv:aria-invalid:ring-destructive/20 nsv:dark:aria-invalid:ring-destructive/40 nsv:aria-invalid:border-destructive nsv:cursor-pointer",
    "nsv:active:scale-[0.98]", // "pushdown" effect
  ),

  {
    variants: {
      variant: {
        default:
          "nsv:bg-primary nsv:text-primary-foreground nsv:[box-shadow:0_1px_2px_0_rgb(0_0_0/0.05)] nsv:hover:bg-primary/90",
        destructive:
          "nsv:bg-destructive nsv:text-white nsv:[box-shadow:0_1px_2px_0_rgb(0_0_0/0.05)] nsv:hover:bg-destructive/90 nsv:focus-visible:[outline:1px_solid_currentColor] nsv:dark:bg-destructive/60",
        outline:
          "nsv:[border-width:1px] nsv:bg-input nsv:[box-shadow:0_1px_2px_0_rgb(0_0_0/0.05)] nsv:hover:bg-accent nsv:hover:text-accent-foreground nsv:dark:bg-input/30 nsv:dark:border-input nsv:dark:hover:bg-input/50",
        secondary:
          "nsv:bg-secondary nsv:text-secondary-foreground nsv:[box-shadow:0_1px_2px_0_rgb(0_0_0/0.05)] nsv:hover:bg-secondary/80",
        ghost:
          "nsv:hover:bg-accent nsv:hover:text-accent-foreground nsv:dark:hover:bg-accent/50",
        link: "nsv:text-primary nsv:underline-offset-4 nsv:hover:underline",
      },
      size: {
        default: "nsv:h-9 nsv:px-4 nsv:py-2 nsv:has-[>svg]:px-3",
        xs: "nsv:h-4 nsv:px-2 nsv:has-[>svg]:px-2 nsv:text-[0.75rem]/[1rem]",
        sm: "nsv:h-8 nsv:gap-1.5 nsv:px-3 nsv:has-[>svg]:px-2.5",
        lg: "nsv:h-10 nsv:px-6 nsv:has-[>svg]:px-4",
        icon: "nsv:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
