import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-[pulse_1s_ease-in-out_infinite] border-2 border-border bg-muted/50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
