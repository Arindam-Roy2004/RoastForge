import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-[pulse_1s_ease-in-out_infinite] border-2 border-border bg-muted/50 shadow-[var(--shadow-2xs)] rounded-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
