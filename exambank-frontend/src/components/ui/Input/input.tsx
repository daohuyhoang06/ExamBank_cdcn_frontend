import React from 'react';
import './input.css';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className={`ui-input-group ${className}`.trim()}>
      {label && <label className="ui-input-label">{label}</label>}
      <input className={`ui-input ${error ? 'is-error' : ''}`.trim()} {...props} />
      {error && <div className="ui-input-error">{error}</div>}
    </div>
  );
};
