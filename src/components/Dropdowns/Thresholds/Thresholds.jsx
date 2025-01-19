import React from 'react';
import UpperThreshold from './UpperThreshold/UpperThreshold';
import LowerThreshold from './LowerThreshold/LowerThreshold'; // Updated import path

const Thresholds = ({ hasDropdown, title, dropdownNumber, type, maxThreshold, setMaxThreshold }) => {
    return (
        <div>
            <h1>Thresholds Component</h1>
            <UpperThreshold  hasDropdown={hasDropdown} title={title} type={type} maxThreshold={maxThreshold} setMaxThreshold={setMaxThreshold} />
            <LowerThreshold />
        </div>
    );
};

export default Thresholds;