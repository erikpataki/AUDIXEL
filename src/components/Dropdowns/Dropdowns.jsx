import React, { useState, useRef, useEffect } from "react";
import "./Dropdowns.css";
import Slider from "./Slider/Slider";
import Selector from "./Selector/Selector";

function Dropdowns({
    dropdownName,
    hasDropdown,
    sliders = [], // Accept an array of slider objects
    selectors = [], // Accept an array of selector objects
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
                    {sliders.map((slider, index) => (
                        <Slider
                            key={index}
                            label={slider.label}
                            value={slider.value}
                            setValue={slider.setValue}
                        />
                    ))}
                    {selectors.map((selector, index) => (
                        <Selector
                            key={index}
                            label={selector.label}
                            value={selector.value}
                            onChange={selector.setValue}
                            options={selector.options}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Dropdowns;