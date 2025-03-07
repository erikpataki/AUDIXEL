import React from 'react';
import './SpinnerOverlay.css';

const SpinnerOverlay = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="spinner-overlay">
      <div className="spinner"></div>
    </div>
  );
};

export default SpinnerOverlay;
