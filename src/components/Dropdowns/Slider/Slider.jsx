import React, { useState, useEffect, useRef } from 'react';
import './Slider.css';

const Slider = ({ label, value, setValue, maxValue, tooltip }) => {
    const max = maxValue ? maxValue : 255;
    const [localValue, setLocalValue] = useState(value);
    const debounceTimeoutRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipTimeoutRef = useRef(null);
    
    // Update local value when prop value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);
    
    // Handle local changes with debouncing
    const handleChange = (newValue) => {
        setLocalValue(newValue); // Update local state immediately for UI responsiveness
        
        // Clear any existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        
        // Set a new timeout to update the parent state
        debounceTimeoutRef.current = setTimeout(() => {
            setValue(newValue); // This will trigger the parent component's state update
        }, 300); // 300ms debounce
    };
    
    const handleMouseEnter = () => {
        tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
        }, 500); // 0.5s delay before showing tooltip
    };
    
    const handleMouseLeave = () => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
        }
        setShowTooltip(false);
    };
    
    // Clean up timeouts when component unmounts
    useEffect(() => {
        return () => {
            if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
            }
        };
    }, []);
    
    return (
        <div className="slider-parent">
            <div className="label-tooltip-container">
                <label 
                    className="slider-label"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {label}
                </label>
                {tooltip && (
                    <div className={`tooltip ${showTooltip ? 'tooltip-visible' : ''}`}>
                        {tooltip}
                    </div>
                )}
            </div>
            <div className="threshold-control">
                <input
                    type="range"
                    min="0"
                    max={max}
                    value={localValue}
                    onChange={(e) => handleChange(parseInt(e.target.value))}
                    className='slider-range'
                />
                <input
                    type="number"
                    min="0"
                    max={max}
                    value={localValue}
                    onChange={(e) => {
                        const newValue = Math.min(max, Math.max(0, parseInt(e.target.value) || 0));
                        handleChange(newValue);
                    }}
                    className="slider-number"
                />
            </div>
        </div>
    );
};

export default Slider;