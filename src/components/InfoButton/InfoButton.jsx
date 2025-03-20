/**
 * @module components/InfoButton
 * @description A floating help button that triggers the tutorial modal when clicked.
 * Positioned in the bottom corner of the viewport.
 * @see module:components/Modal
 */
import React from 'react';
import './InfoButton.css';

/**
 * Renders an information/help button
 * 
 * @function InfoButton
 * @memberof module:components/InfoButton
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Click handler to show help/tutorial
 * @param {boolean} props.isVisible - Controls button visibility
 * @returns {JSX.Element|null} The info button or null when not visible
 * @example
 * // Basic info button
 * <InfoButton
 *   onClick={handleOpenHelp}
 *   isVisible={showHelpButton}
 * />
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
