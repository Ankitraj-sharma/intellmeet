import { cn } from '@/utils/cn'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
      <div className="relative">
        {leftIcon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{leftIcon}</span>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-[#1e2a4a] border rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500',
            'focus:outline-none transition-colors',
            error ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-indigo-500',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        {rightIcon && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">{rightIcon}</span>}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
)
Input.displayName = 'Input'
