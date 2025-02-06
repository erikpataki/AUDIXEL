import React from 'react';
import './Slider.css';

const Slider = ({ label, value, setValue, maxValue }) => {
    let max = maxValue ? maxValue : 255
    return (
        <div className="slider-parent">
            <label className="slider-label">{label}</label>
            <div className="threshold-control">
                <input
                    type="range"
                    min="0"
                    max= {max}
                    value={value}
                    onChange={(e) => setValue(parseInt(e.target.value))}
                    className='slider-range'
                />
                <input
                    type="number"
                    min="0"
                    max={max}
                    value={value}
                    onChange={(e) => {
                        const value = Math.min(max, Math.max(0, parseInt(e.target.value)));
                        setValue(value);
                    }}
                    className="slider-number"
                />
            </div>
        </div>
    );
};

export default Slider;