import { motion } from 'framer-motion'

export default function Card({ children, className = '', ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border border-border rounded-lg p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}

