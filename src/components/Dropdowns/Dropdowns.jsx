import React from "react";
import "./Dropdowns.css";
import Thresholds from "./Thresholds/Thresholds";

function Dropdowns({ hasDropdown, title, dropdownNumber, type, maxThreshold, setMaxThreshold }) { // Destructure props correctly
    return (
        <div>
            <Thresholds hasDropdown={hasDropdown} title={title} dropdownNumber={dropdownNumber} type={type} maxThreshold={maxThreshold} setMaxThreshold={setMaxThreshold} />
        </div>
    );
}

export default Dropdowns;

// ...existing code...