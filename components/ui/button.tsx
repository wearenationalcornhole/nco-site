import * as React from 'react';

type Variant =
  | 'primary'   // brand action
  | 'accent'    // gold CTA
  | 'danger'    // destructive
  | 'outline'   // bordered brand
  | 'subtle'    // soft bg
  | 'ghost'     // text button
  | 'link';     // inline link look

type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/** tiny utility so we don't pull in a classnames lib */
function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand',
  accent:  'bg-accent text-black hover:bg-accent-hover focus-visible:ring-accent',
  danger:  'bg-danger text-white hover:bg-danger-hover focus-visible:ring-danger',
  outline: 'border border-brand text-brand hover:bg-brand-light focus-visible:ring-brand',
  subtle:  'bg-neutral-light text-neutral hover:bg-white/60 border border-usaLight focus-visible:ring-neutral',
  ghost:   'text-brand hover:bg-brand-light focus-visible:ring-brand',
  link:    'text-brand hover:underline p-0 h-auto leading-normal',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-11 px-5 text-base rounded-2xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium transition select-none focus:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed';

  // link-style buttons shouldn’t have padding/height unless explicitly set
  const sizing = variant === 'link' ? '' : SIZE[size];

  return (
    <button
      className={cx(base, VARIANT[variant], sizing, className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent"
        />
      )}
      {!isLoading && leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span>{children}</span>
      {!isLoading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  );
}