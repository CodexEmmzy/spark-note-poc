import React from 'react';
import './Badge.css';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseClass = 'badge';
  const variantClass = `badge--${variant}`;
  const sizeClass = `badge--${size}`;
  const dotClass = dot ? 'badge--dot' : '';
  const classes = `${baseClass} ${variantClass} ${sizeClass} ${dotClass} ${className}`.trim();

  return (
    <span className={classes} {...props}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      <span className="badge__text">{children}</span>
    </span>
  );
};

