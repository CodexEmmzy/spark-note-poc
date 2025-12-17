import React from 'react';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseClass = 'card';
  const variantClass = `card--${variant}`;
  const paddingClass = `card--padding-${padding}`;
  const classes = `${baseClass} ${variantClass} ${paddingClass} ${className}`.trim();

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`card-header ${className}`.trim()} {...props}>
      {(icon || title) && (
        <div className="card-header__content">
          {icon && <span className="card-header__icon">{icon}</span>}
          {(title || subtitle) && (
            <div className="card-header__text">
              {title && <h3 className="card-header__title">{title}</h3>}
              {subtitle && <p className="card-header__subtitle">{subtitle}</p>}
            </div>
          )}
        </div>
      )}
      {action && <div className="card-header__action">{action}</div>}
      {children}
    </div>
  );
};

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card-body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

