/**
 * Slider Component
 * 
 * Interactive slider control with numeric input.
 * Includes tooltips and debounced value updates.
 * 
 * @component
 */
import React, { useState, useEffect, useRef } from 'react';
import './Slider.css';

/**
 * Renders a slider control with numeric input and tooltip
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Label text for slider
 * @param {number} props.value - Current value
 * @param {Function} props.setValue - Handler for value changes
 * @param {number} [props.maxValue] - Maximum allowed value (defaults to 255)
 * @param {string} [props.tooltip] - Tooltip text explaining the control
 * @returns {JSX.Element} Slider control
 */
const Slider = ({ label, value, setValue, maxValue, tooltip }) => {
    // Use provided max or default to 255
    const max = maxValue ? maxValue : 255;
    
    // Local state for immediate UI updates with debounced parent updates
    const [localValue, setLocalValue] = useState(value);
    const debounceTimeoutRef = useRef(null);
    
    // Tooltip visibility state
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipTimeoutRef = useRef(null);
    
    // Update local value when prop value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);
    
    /**
     * Handle slider value changes with debouncing
     * Updates local state immediately while debouncing parent state updates
     * 
     * @param {number} newValue - New slider value
     */
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
    
    /**
     * Show tooltip after delay when mouse enters label
     * 
     * @param {React.MouseEvent} e - Mouse event
     */
    const handleMouseEnter = (e) => {
        tooltipTimeoutRef.current = setTimeout(() => {
            const rect = e.target.getBoundingClientRect();
            const tooltip = e.target.parentElement.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.top = `${rect.bottom + 5}px`;
                tooltip.style.left = `${rect.left}px`;
            }
            setShowTooltip(true);
        }, 500);
    };
    
    /**
     * Hide tooltip when mouse leaves label
     */
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
                    value={Math.round(localValue)}
                    onChange={(e) => handleChange(parseInt(e.target.value))}
                    className='slider-range'
                />
                <input
                    type="number"
                    min="0"
                    max={max}
                    value={Math.round(localValue)}
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