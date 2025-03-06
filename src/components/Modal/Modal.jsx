import React from 'react';
import "./Modal.css";

const Modal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  modalType = "standard", 
  hasButtons = true,
  customClass = ""
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    // Only close if clicking directly on the overlay, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={`modal-overlay ${modalType}`} onClick={handleOverlayClick}>
      <div className={`modal-content ${customClass} ${modalType}`}>
        {modalType === "tutorial" && (
          <button className="modal-close-button" onClick={onClose}>
            <svg width="30" height="30" viewBox="0 0 24 24">
                <line x1="4" y1="4" x2="20" y2="20" stroke="#0D1F22" stroke-width="2"/>
                <line x1="20" y1="4" x2="4" y2="20" stroke="#0D1F22" stroke-width="2"/>
            </svg>
          </button>
        )}
        
        {title && <h3 className={`modal-title ${modalType}-title`}>{title}</h3>}
        
        <div className={`modal-message ${modalType}-message`}>
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        
        {hasButtons && (
          <div className="modal-buttons">
            <button className="modal-button cancel-button" onClick={onClose}>Cancel</button>
            <button className="modal-button confirm-button" onClick={onConfirm}>Continue</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
