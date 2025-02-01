import React from 'react';
import './Slider.css';

const Slider = ({ label, value, setValue, maxValue }) => {
    return (
        <div className="slider-parent">
            <label className="slider-label">{label}</label>
            <div className="threshold-control">
                <input
                    type="range"
                    min="0"
                    max= {maxValue ? maxValue : "255"}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className='slider-range'
                />
                <input
                    type="number"
                    min="0"
                    max="255"
                    value={value}
                    onChange={(e) => {
                        const value = Math.min(255, Math.max(0, Number(e.target.value)));
                        setValue(value);
                    }}
                    className="slider-number"
                />
            </div>
        </div>
    );
};

export default Slider;