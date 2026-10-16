'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type GothicButtonProps = HTMLMotionProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

const VARIANTS = {
  primary: 'border-[#cfb06f] text-[#cfb06f] hover:bg-[#cfb06f] hover:text-black',
  secondary: 'border-[#7f95a1] text-[#7f95a1] hover:bg-[#7f95a1] hover:text-black',
  danger: 'border-[#b64f43] text-[#b64f43] hover:bg-[#b64f43] hover:text-black',
};

export default function GothicButton({ className, variant = 'primary', disabled, type = 'button', ...props }: GothicButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className={cn(
        'px-6 py-2 bg-[#00000066] border-2 font-bold rounded-lg transition-colors duration-200 shadow-lg backdrop-blur-sm tracking-widest font-changa',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
