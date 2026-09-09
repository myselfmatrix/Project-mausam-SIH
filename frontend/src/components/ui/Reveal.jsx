import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

/** Scroll-triggered entrance. Fires once, so scrolling back up stays calm. */
export default function Reveal({ children, delay = 0, y = 24, className = '', ...rest }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.62, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Parent for staggered children — pair with <RevealItem>. */
export function RevealGroup({ children, className = '', stagger = 0.075, ...rest }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export const revealItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

export function RevealItem({ children, className = '', ...rest }) {
  return (
    <motion.div className={className} variants={revealItem} {...rest}>
      {children}
    </motion.div>
  )
}
