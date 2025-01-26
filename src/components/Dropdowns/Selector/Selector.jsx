import './Selector.css';
import React from 'react';
import PropTypes from 'prop-types';

const Selector = ({ label, options, onChange, value }) => {
    return (
        <div className="selector">
            <label className='selector-label'>{label}</label>
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
    value: PropTypes.any.isRequired
};

export default Selector;