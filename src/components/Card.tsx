import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = "",
  hover = false,
  onClick,
}: CardProps) {
  const Component = hover ? motion.button : motion.div;
  return (
    <Component
      {...(hover
        ? {
            whileHover: { y: -2, transition: { duration: 0.15 } },
            whileTap: { scale: 0.98 },
          }
        : {})}
      onClick={onClick}
      className={`bg-white rounded-xl border border-sand-200 ${
        hover
          ? "hover:shadow-md hover:shadow-green-900/5 transition-shadow cursor-pointer text-left"
          : ""
      } ${className}`}
    >
      {children}
    </Component>
  );
}
