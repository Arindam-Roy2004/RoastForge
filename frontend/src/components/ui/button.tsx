import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button label-mono inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-xs whitespace-nowrap shadow-[var(--shadow-2xs)] transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out hover:-translate-y-px hover:shadow-[var(--shadow-xs)] active:translate-y-0 active:shadow-none outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "bg-background text-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "border-transparent bg-transparent shadow-none text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-y-0 hover:shadow-[var(--shadow-sm)] active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/90",
        link: "border-transparent bg-transparent shadow-none text-primary-strong underline-offset-4 hover:underline hover:decoration-2 hover:decoration-primary hover:translate-y-0 hover:shadow-[var(--shadow-sm)] active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 gap-1.5 px-2 text-[0.6875rem] [&>svg]:size-3.5",
        sm: "h-9 gap-1.5 px-3 text-[0.6875rem] [&>svg]:size-3.5",
        lg: "h-11 px-6 text-[0.8125rem] [&>svg]:size-[1.125rem]",
        icon: "h-10 w-10 px-0",
        "icon-xs": "h-7 w-7 px-0 [&>svg]:size-3.5",
        "icon-sm": "h-9 w-9 px-0 [&>svg]:size-4",
        "icon-lg": "h-12 w-12 px-0 [&>svg]:size-[1.125rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
