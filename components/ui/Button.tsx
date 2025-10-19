// components/ui/Button.tsx
'use client'

import React from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-usaBlue text-white hover:opacity-90 focus:ring-2 focus:ring-usaBlue/30 disabled:opacity-60',
  secondary:
    'bg-usaRed text-white hover:opacity-90 focus:ring-2 focus:ring-usaRed/30 disabled:opacity-60',
  outline:
    'border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-60',
  ghost:
    'text-gray-800 hover:bg-gray-50 disabled:opacity-60',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-600/30 disabled:opacity-60',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-sm rounded-lg',
  md: 'px-3 py-2 text-sm rounded-lg',
  lg: 'px-4 py-2.5 text-base rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 transition',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
      )}
      {!loading && leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  )
}