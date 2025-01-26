import React, { useState, useRef, useEffect } from "react";
import "./Dropdowns.css";
import Slider from "./Slider/Slider";
import Selector from "./Selector/Selector";

function Dropdowns({ dropdownName, hasDropdown,
    slider, 
    firstSliderLabel, firstSliderValue, setFirstSliderValue, 
    secondSliderLabel, secondSliderValue, setSecondSliderValue,
    selector,
    label, value, setValue, options,
}) 
{ 
    const [isCollapsed, setIsCollapsed] = useState(true);
    const dropDownRef = useRef(null);

    const toggleCollapse = () => {
        {hasDropdown !== false &&
            setIsCollapsed(!isCollapsed);
        }
    };

    useEffect(() => {
        if (dropDownRef.current) {
            dropDownRef.current.style.height = isCollapsed ? "38px" : `${dropDownRef.current.scrollHeight}px`;
        }
    }, [isCollapsed]);

    return (
        <div className="drop-down" ref={dropDownRef}>
            <div className="drop-down-header" onClick={toggleCollapse}>
                <h3 className="drop-down-name">{dropdownName}</h3>
                {hasDropdown !== false &&
                    <svg className={`dropdown-arrow ${isCollapsed ? 'flipped' : ''}`} xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                    <path d="M7 0L0.0717964 12H13.9282L7 0Z" fill="#0D1F22"/>
                </svg>}
            </div>
            {!isCollapsed && (
                <div className="drop-down-content">
                    {slider >= 1 && <Slider label={firstSliderLabel} value={firstSliderValue} setValue={setFirstSliderValue} />}
                    {slider >= 2 && <Slider label={secondSliderLabel} value={secondSliderValue} setValue={setSecondSliderValue} />}
                    {selector >= 1 && <Selector label={label} value={value} onChange={setValue} options={options} />}
                </div>
            )}
        </div>
    );
}

export default Dropdowns;