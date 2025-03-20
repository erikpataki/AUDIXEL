/**
 * @module components/Dropdowns/Slider
 * @description Interactive slider control with numeric input.
 * Includes tooltips and debounced value updates.
 * @internal This component is only used within the Dropdowns component.
 * @see module:components/Dropdowns
 */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './Slider.css';

/**
 * @internal
 * Slider component - Renders a customizable range slider
 * 
 * @component
 * @memberof module:components/Dropdowns/Slider
 * @param {Object} props - Component props
 * @param {string} props.label - Label text for slider
 * @param {number} props.value - Current value
 * @param {function(number): void} props.setValue - Handler for value changes
 * @param {number} [props.minValue=0] - Minimum value for the slider
 * @param {number} [props.maxValue=255] - Maximum allowed value (defaults to 255)
 * @param {string} [props.tooltip] - Optional tooltip text explaining the control
 * @returns {JSX.Element} Slider control component
 * @example
 * // Example slider with tooltip and maxValue set
 * <Slider
 *   label="Example Slider"
 *   value={value}
 *   setValue={setValue}
 *   maxValue={100}
 *   tooltip="Example tooltip text"
 * />
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

// Add PropTypes definition for the component
Slider.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    setValue: PropTypes.func.isRequired,
    maxValue: PropTypes.number,
    tooltip: PropTypes.string
};

export default Slider;