import React from 'react';
import './button.css';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'inverted' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <button
      className={`ui-btn ui-btn--${variant} ui-btn--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};
