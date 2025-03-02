import './Selector.css';
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const Selector = ({ label, options, onChange, value, tooltip }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipTimeoutRef = useRef(null);
    
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
        <div className="selector">
            <div className="label-tooltip-container">
                <label 
                    className='selector-label'
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
            <select className='selector-control' value={value} onChange={(e) => onChange(Number(e.target.value))}>
                {options.map((option, index) => (
                    <option key={index} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

Selector.propTypes = {
    label: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.any.isRequired,
        label: PropTypes.string.isRequired
    })).isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.any.isRequired,
    tooltip: PropTypes.string
};

export default Selector;