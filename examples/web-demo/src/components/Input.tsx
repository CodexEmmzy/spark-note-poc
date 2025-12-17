import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;
  const errorId = hasError ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className={`input-group ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div className={`input-wrapper ${hasError ? 'input-wrapper--error' : ''}`}>
        {leftIcon && <span className="input-icon input-icon--left">{leftIcon}</span>}
        <input
          id={inputId}
          className="input"
          aria-invalid={hasError}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        {rightIcon && <span className="input-icon input-icon--right">{rightIcon}</span>}
      </div>
      {hint && !error && (
        <div id={hintId} className="input-hint">
          {hint}
        </div>
      )}
      {error && (
        <div id={errorId} className="input-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

