import { cn } from '@/utils/cn'
import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95',
  ghost: 'text-slate-300 hover:bg-white/10 hover:text-white',
  danger: 'bg-red-600 text-white hover:bg-red-500 active:scale-95',
  outline: 'border border-slate-700 text-slate-300 hover:bg-white/5 hover:border-slate-600',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-3 text-base rounded-xl',
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, className, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  )
}
