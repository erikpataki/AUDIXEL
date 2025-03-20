/**
 * @module components/LoadingOverlay
 * @description Displays a loading overlay with progress information.
 * Used for longer operations where progress tracking improves user experience.
 */
import React from 'react';
import './LoadingOverlay.css';

/**
 * Renders a loading overlay with optional progress indicator
 * 
 * @function LoadingOverlay
 * @memberof module:components/LoadingOverlay
 * @param {Object} props - Component props
 * @param {number|null} props.progress - Current progress percentage (0-100)
 * @param {boolean} [props.isProcessing] - Whether processing is active
 * @param {string} [props.message] - Loading message to display
 * @returns {JSX.Element} Loading overlay with progress bar
 * @example
 * // Basic loading overlay with progress
 * <LoadingOverlay
 *   progress={75}
 *   message="Processing your file..."
 * />
 * 
 * @example
 * // Indeterminate loading overlay
 * <LoadingOverlay
 *   progress={null}
 *   message="Please wait..."
 * />
 */
const LoadingOverlay = ({ progress, isProcessing, message }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
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
