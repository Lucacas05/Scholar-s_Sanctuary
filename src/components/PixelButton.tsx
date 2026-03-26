import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { ICONS } from '../constants';

interface PixelButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  icon?: keyof typeof ICONS;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const PixelButton: React.FC<PixelButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  ...props 
}) => {
  const Icon = icon ? ICONS[icon] : null;

  const variants = {
    primary: 'bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant',
    secondary: 'bg-tertiary text-on-tertiary border-b-[3px] border-on-tertiary-fixed-variant',
    tertiary: 'bg-surface-container-highest text-on-surface border-2 border-outline-variant/50',
    ghost: 'bg-transparent text-outline hover:text-primary'
  };

  const sizes = {
    sm: 'px-3 py-1 text-[10px]',
    md: 'px-6 py-2 text-xs',
    lg: 'px-8 py-3 text-sm'
  };

  return (
    <motion.button
      type={type}
      whileTap={{ y: 2 }}
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''}
        font-headline font-bold uppercase tracking-widest steps-bezel
        flex items-center justify-center gap-2
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </motion.button>
  );
};
