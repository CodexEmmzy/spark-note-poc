import React, { useState } from 'react';
import './CodeBlock.css';

interface CodeBlockProps {
  value: string;
  label?: string;
  maxLength?: number;
  copyable?: boolean;
  variant?: 'default' | 'commitment' | 'nullifier' | 'secret';
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  value,
  label,
  maxLength = 64,
  copyable = true,
  variant = 'default',
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const shouldTruncate = value.length > maxLength;
  const displayValue = shouldTruncate && !expanded
    ? `${value.slice(0, maxLength / 2)}...${value.slice(-maxLength / 2)}`
    : value;
  
  const formattedValue = formatHex(displayValue);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`code-block code-block--${variant}`}>
      {label && (
        <div className="code-block__label">
          {label}
        </div>
      )}
      <div className="code-block__content">
        <code className="code-block__code" aria-label={label || 'Code value'}>
          {formattedValue}
        </code>
        <div className="code-block__actions">
          {shouldTruncate && (
            <button
              className="code-block__action"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? '−' : '+'}
            </button>
          )}
          {copyable && (
            <button
              className="code-block__action"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy to clipboard'}
              aria-live="polite"
            >
              {copied ? '✓' : '📋'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function formatHex(hex: string): string {
  // Add spacing every 8 characters for readability
  return hex.replace(/(.{8})/g, '$1 ').trim();
}

