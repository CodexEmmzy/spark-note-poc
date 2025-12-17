import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const loadingClass = isLoading ? 'btn--loading' : '';
  const classes = `${baseClass} ${variantClass} ${sizeClass} ${loadingClass} ${className}`.trim();

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : (
        <>
          {leftIcon && <span className="btn__icon btn__icon--left">{leftIcon}</span>}
          <span className="btn__text">{children}</span>
          {rightIcon && <span className="btn__icon btn__icon--right">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

