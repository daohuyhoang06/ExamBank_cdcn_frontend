import React from 'react';
import './modal.css';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div className="ui-modal" onClick={e => e.stopPropagation()}>
        {title && <div className="ui-modal-title">{title}</div>}
        <div className="ui-modal-content">{children}</div>
        <button className="ui-modal-close" onClick={onClose}>&times;</button>
      </div>
    </div>
  );
};
