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
    primary: 'bg-usaBlue text-white hover:opacity-90 focus:ring-usaBlue/40',
    secondary: 'bg-gray-900 text-white hover:opacity-90 focus:ring-gray-900/40',
    outline: 'border text-gray-800 hover:bg-gray-50 focus:ring-gray-300',
  }
  const sizes: Record<Size, string> = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
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