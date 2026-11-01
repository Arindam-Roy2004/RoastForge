import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-[color,box-shadow] duration-150 ease-out outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/45 active:before:scale-[0.99] motion-reduce:active:before:scale-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "t-surface t-surface-primary text-primary-foreground",
        outline: "t-surface t-surface-outline text-foreground",
        secondary: "t-surface t-surface-secondary text-secondary-foreground",
        ghost: "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
        destructive: "t-surface t-surface-destructive text-white",
        link: "text-primary-strong underline-offset-4 hover:underline hover:decoration-2 hover:decoration-primary",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 rounded-md px-2 text-xs [&>svg]:size-3.5",
        sm: "h-9 gap-1.5 rounded-md px-2.5 text-[0.8125rem] [&>svg]:size-3.5",
        lg: "h-11 px-5 text-[0.9375rem] [&>svg]:size-[1.125rem]",
        icon: "size-10 px-0",
        "icon-xs": "size-7 rounded-md px-0 [&>svg]:size-3.5",
        "icon-sm": "size-9 rounded-md px-0 [&>svg]:size-4",
        "icon-lg": "size-12 px-0 [&>svg]:size-[1.125rem]",
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
