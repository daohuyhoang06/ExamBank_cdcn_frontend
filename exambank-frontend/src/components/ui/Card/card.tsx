import React from 'react';
import './card.css';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  footer?: React.ReactNode;
};

export const Card: React.FC<CardProps> = ({ title, footer, children, className = '', ...props }) => {
  return (
    <div className={`ui-card ${className}`.trim()} {...props}>
      {title && <div className="ui-card-title">{title}</div>}
      <div className="ui-card-content">{children}</div>
      {footer && <div className="ui-card-footer">{footer}</div>}
    </div>
  );
};
