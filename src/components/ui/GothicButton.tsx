'use client';

import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GothicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function GothicButton({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: GothicButtonProps) {
  const variants = {
    primary: 'border-[#cfb06f] text-[#cfb06f] hover:bg-[#cfb06f] hover:text-black',
    secondary: 'border-[#7f95a1] text-[#7f95a1] hover:bg-[#7f95a1] hover:text-black',
    danger: 'border-[#b64f43] text-[#b64f43] hover:bg-[#b64f43] hover:text-black',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "px-6 py-2 bg-[#00000066] border-2 font-bold rounded-lg transition-all duration-200 shadow-lg backdrop-blur-sm uppercase tracking-widest font-changa",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
