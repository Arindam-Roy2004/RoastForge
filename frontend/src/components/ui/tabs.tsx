"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-6", className)}
      {...props}
    />
  )
}

/**
 * Muted track with the active tab raised as a key. The raised part is one
 * indicator that slides between tabs (driven by base-ui's `--active-tab-*`
 * variables) and wears the same `t-surface` treatment as the outline button,
 * so it reads as part of the button family rather than a flat chip.
 */
function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex h-10 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 ring-1 ring-foreground/8 [scrollbar-width:none]",
        className
      )}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className="t-surface t-surface-outline absolute top-(--active-tab-top) left-(--active-tab-left) z-0 h-(--active-tab-height) w-(--active-tab-width) rounded-md transition-[left,width] duration-200 ease-out"
      />
    </TabsPrimitive.List>
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "relative z-10 inline-flex h-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-50 data-active:text-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("min-w-0 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTab, TabsPanel }
