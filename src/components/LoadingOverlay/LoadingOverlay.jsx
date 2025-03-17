/**
 * LoadingOverlay Component
 * 
 * Displays a loading overlay with progress information.
 * Used for longer operations where progress tracking improves user experience.
 * 
 * @component
 */
import React from 'react';
import './LoadingOverlay.css';

/**
 * Renders a loading overlay with optional progress indicator
 * 
 * @param {Object} props - Component props
 * @param {number|null} props.progress - Current progress percentage (0-100)
 * @param {boolean} [props.isProcessing] - Whether processing is active
 * @param {string} [props.message] - Loading message to display
 * @returns {JSX.Element} Loading overlay with progress bar
 */
const LoadingOverlay = ({ progress, isProcessing, message }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        {/* <div className="loading-spinner"></div> */}
        <div className="loading-message">
          {message || 'Processing...'}
        </div>
        {progress !== null && (
          <div className="loading-progress-container">
            <div className="loading-progress-bar">
              <div 
                className="loading-progress-fill" 
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              ></div>
            </div>
            <div className="loading-progress-text">{Math.round(progress)}%</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
