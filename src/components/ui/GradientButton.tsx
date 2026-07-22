import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'gold'
  | 'rose'
  | 'outline'
  | 'ghost'
  | 'glass';
type Size = 'sm' | 'md' | 'lg';

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
  fullWidth?: boolean;
  glow?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-grad-primary text-white shadow-glow hover:shadow-glow-lg hover:brightness-[1.07]',
  secondary:
    'bg-grad-secondary text-white shadow-[0_10px_26px_-6px_rgba(37,99,235,0.45)] hover:brightness-[1.07]',
  success:
    'bg-grad-success text-white shadow-[0_10px_26px_-6px_rgba(16,185,129,0.45)] hover:brightness-[1.07]',
  danger:
    'bg-grad-warning text-white shadow-[0_10px_26px_-6px_rgba(239,68,68,0.45)] hover:brightness-[1.07]',
  gold: 'bg-grad-gold text-white shadow-[0_10px_26px_-6px_rgba(245,158,11,0.45)] hover:brightness-[1.07]',
  rose: 'bg-grad-rose text-white shadow-[0_10px_26px_-6px_rgba(244,63,94,0.45)] hover:brightness-[1.07]',
  outline: 'border border-slate-300 text-ink-primary hover:bg-slate-100/70 hover:border-brand-300',
  ghost: 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100/70',
  glass: 'glass text-ink-primary hover:bg-white/10 hover:shadow-card',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-2xl py-3.5',
};

export const GradientButton = forwardRef<HTMLButtonElement, Props>(function GradientButton(
  { variant = 'primary', size = 'md', icon, iconRight, children, className, fullWidth, glow, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none focus-ring disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        glow && 'hover:shadow-glow-lg',
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled}
      {...rest}
    >
      {icon && <span className="shrink-0 grid place-items-center">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0 grid place-items-center">{iconRight}</span>}
    </motion.button>
  );
});
