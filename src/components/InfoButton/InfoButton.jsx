import React from 'react';
import './InfoButton.css';

const InfoButton = ({ onClick, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <button className="info-button" onClick={onClick} aria-label="Help">
      ?
    </button>
  );
};

export default InfoButton;
