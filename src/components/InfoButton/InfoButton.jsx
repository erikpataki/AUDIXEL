/**
 * InfoButton Component
 * 
 * A floating help button that triggers the tutorial modal when clicked.
 * Positioned in the bottom corner of the viewport.
 * 
 * @component
 */
import React from 'react';
import './InfoButton.css';

/**
 * Renders an information/help button
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Click handler to show help/tutorial
 * @param {boolean} props.isVisible - Controls button visibility
 * @returns {JSX.Element|null} The info button or null when not visible
 */
const InfoButton = ({ onClick, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <button 
      className="info-button" 
      onClick={onClick} 
      aria-label="Help"
    >
      ?
    </button>
  );
};

export default InfoButton;
