import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Multi-line text field. Shares its border, focus ring and invalid state with
 * `ui/input` so the two read as one family inside a form.
 *
 * Fixed height with internal scrolling, deliberately. An auto-growing box
 * resizes the card around it on every new line, which shifts the rest of the
 * layout while you type. Pass a height class to change it for one field.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "h-32 w-full min-w-0 resize-none overflow-y-auto rounded-md border-2 border-input bg-background px-3 py-2 text-base font-medium leading-relaxed transition-[box-shadow,border-color,background-color,color] outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.2)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_hsl(var(--destructive)/0.18)] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
