import React from 'react';
import './UpperThreshold.css'

const UpperThreshold = ({ hasDropdown, title, dropdownNumber, type, maxThreshold, setMaxThreshold }) => {
    return (
        <div className="upper-threshold">
            {hasDropdown ? (
                type === "slider" && maxThreshold && setMaxThreshold && (
                    <div className="dropdown">
                        <h4>{title}</h4>
                        <div className="threshold-control">
                            <input
                                id="max-threshold-slider"
                                type="range"
                                min="0"
                                max="255"
                                value={maxThreshold}
                                onChange={(e) => setMaxThreshold(Number(e.target.value))}
                            />
                            <input
                                type="number"
                                min="0"
                                max="255"
                                value={maxThreshold}
                                onChange={(e) => {
                                    const value = Math.min(255, Math.max(0, Number(e.target.value)));
                                    setMaxThreshold(value);
                                }}
                                className="threshold-number"
                            />
                        </div>
                    </div>
                )
            ) : (
                <p>No dropdown</p>
            )}
        </div>
    );
};

export default UpperThreshold;