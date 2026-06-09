"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111] disabled:cursor-not-allowed disabled:opacity-50 bg-[#0B0B0C] data-[state=checked]:border-sky-400 data-[state=checked]:shadow-[0_0_10px_rgba(56,189,248,0.5),inset_0_0_4px_rgba(56,189,248,0.3)] data-[state=unchecked]:border-[#333]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[18px] w-[18px] rounded-full shadow-lg ring-0 transition-all duration-300 ease-in-out data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-sky-400 data-[state=unchecked]:translate-x-[0px] data-[state=unchecked]:bg-[#555]",
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
