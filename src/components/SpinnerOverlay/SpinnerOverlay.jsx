/**
 * SpinnerOverlay Component
 * 
 * Displays a loading spinner overlay when content is being processed.
 * Used during operation states that require user to wait but don't need progress tracking.
 * 
 * @component
 */
import React from 'react';
import './SpinnerOverlay.css';

/**
 * Renders a spinner overlay for loading states
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Controls visibility of the spinner overlay
 * @returns {JSX.Element|null} Spinner overlay or null when not visible
 */
const SpinnerOverlay = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="spinner-overlay">
      <div className="spinner"></div>
    </div>
  );
};

export default SpinnerOverlay;
