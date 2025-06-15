import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  direction?: "left" | "right" | "up" | "down";
}

const pageVariants = {
  initial: (direction: string) => ({
    x: direction === "left" ? "-100%" : direction === "right" ? "100%" : 0,
    y: direction === "up" ? "-100%" : direction === "down" ? "100%" : 0,
    opacity: 0,
  }),
  animate: {
    x: 0,
    y: 0,
    opacity: 1,
  },
  exit: (direction: string) => ({
    x: direction === "left" ? "100%" : direction === "right" ? "-100%" : 0,
    y: direction === "up" ? "100%" : direction === "down" ? "-100%" : 0,
    opacity: 0,
  }),
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3,
};

export default function PageTransition({ children, direction = "right" }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      custom={direction}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}