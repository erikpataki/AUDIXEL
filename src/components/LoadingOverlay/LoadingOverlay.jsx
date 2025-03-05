import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ progress, isProcessing, message }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner"></div>
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
