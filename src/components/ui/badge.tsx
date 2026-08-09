import * as React from 'react'
import { Slot as SlotPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'signal-chip inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap border px-2 py-1 text-xs font-medium transition-[color,box-shadow,background-color] [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground [a&]:hover:shadow-[1px_1px_0_var(--signal-magenta),-1px_-1px_0_var(--signal-cyan)]',
        muted:
          'border-border bg-transparent text-foreground [a&]:hover:border-foreground [a&]:hover:bg-muted',
        destructive:
          'border-destructive bg-destructive text-destructive-foreground',
        outline:
          'border-foreground/70 text-foreground [a&]:hover:bg-primary [a&]:hover:text-primary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
