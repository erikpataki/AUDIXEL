import React from 'react';
import "./Modal.css";

const Modal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-buttons">
          <button className="modal-button cancel-button" onClick={onClose}>Cancel</button>
          <button className="modal-button confirm-button" onClick={onConfirm}>Continue</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
