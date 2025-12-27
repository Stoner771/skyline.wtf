export default function Input({ label, className, error, ...props }) {
  if (label) {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <input
          className={`w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
            error ? 'border-destructive' : ''
          } ${className || ''}`}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <input
      className={`w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${className || ''}`}
      {...props}
    />
  )
}

