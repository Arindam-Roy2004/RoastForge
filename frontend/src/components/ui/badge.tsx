import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/45 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary/12 text-primary-strong ring-primary/30 [a]:hover:bg-primary/20",
        secondary:
          "bg-secondary text-secondary-foreground ring-border [a]:hover:bg-foreground/8",
        destructive:
          "bg-destructive/10 text-destructive ring-destructive/25 [a]:hover:bg-destructive/15",
        outline:
          "bg-card text-foreground ring-border shadow-[var(--shadow-2xs)] [a]:hover:bg-muted",
        ghost:
          "ring-transparent hover:bg-muted hover:text-muted-foreground dark:hover:bg-secondary dark:hover:text-secondary-foreground",
        link: "ring-transparent text-primary-strong underline-offset-4 hover:underline hover:decoration-2 hover:decoration-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
