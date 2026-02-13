import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 ease-in-out hover:opacity-90 active:scale-[0.97] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus-visible:ring-indigo-500',
        danger:
          'bg-red-600 text-white rounded-md hover:bg-red-700 focus-visible:ring-red-500',
        success:
          'bg-green-600 text-white rounded-md hover:bg-green-700 focus-visible:ring-green-500',
        warning:
          'bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus-visible:ring-yellow-500',
        secondary:
          'border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 focus-visible:ring-gray-400',
        ghost:
          'text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md focus-visible:ring-gray-400',
        purple:
          'bg-purple-600 text-white rounded-md hover:bg-purple-700 focus-visible:ring-purple-500',
        cyan:
          'bg-cyan-600 text-white rounded-md hover:bg-cyan-700 focus-visible:ring-cyan-500',
        orange:
          'bg-orange-600 text-white rounded-md hover:bg-orange-700 focus-visible:ring-orange-500',
      },
      size: {
        xs: 'px-3 py-1.5 text-sm rounded',
        sm: 'px-3.5 py-2 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-5 py-2.5 text-[0.9rem] font-medium',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };
