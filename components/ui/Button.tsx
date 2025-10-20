'use client'

import { Slot } from '@radix-ui/react-slot'
import clsx from 'clsx'
import React from 'react'

type Variant = 'primary' | 'secondary' | 'outline'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  asChild?: boolean
  className?: string
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  asChild = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'

  const variants: Record<Variant, string> = {
    primary:
      'bg-usaBlue text-white hover:bg-brand-hover focus:ring-accent focus:ring-offset-[#0A3161]',
    secondary:
      'bg-white text-usaBlue hover:bg-gray-100 focus:ring-usaBlue focus:ring-offset-[#0A3161]',
    outline:
      'border border-white text-white hover:bg-white/10 focus:ring-accent focus:ring-offset-[#0A3161]',
  }

  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <Comp
      className={clsx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading ? 'Loading…' : children}
    </Comp>
  )
}