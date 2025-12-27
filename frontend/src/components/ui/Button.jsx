import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  disabled,
  type = 'button',
  ...props
}) {
  const baseStyles = 'font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background'
  
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
    outline: 'border border-border bg-transparent hover:bg-accent focus:ring-accent',
    ghost: 'hover:bg-accent focus:ring-accent'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}

