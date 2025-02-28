import React, { useState, useEffect, useRef } from 'react';
import './Slider.css';

const Slider = ({ label, value, setValue, maxValue }) => {
    const max = maxValue ? maxValue : 255;
    const [localValue, setLocalValue] = useState(value);
    const debounceTimeoutRef = useRef(null);
    
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
    
    return (
        <div className="slider-parent">
            <label className="slider-label">{label}</label>
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