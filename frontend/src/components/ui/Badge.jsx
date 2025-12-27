import { clsx } from 'clsx'

export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    destructive: 'bg-destructive/20 text-destructive border border-destructive/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

