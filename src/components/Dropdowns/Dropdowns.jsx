/**
 * Dropdowns Component
 * 
 * Collapsible control section for app settings.
 * Contains sliders and selectors in an expandable panel.
 * 
 * @component
 */
import React, { useState, useRef, useEffect } from "react";
import "./Dropdowns.css";
import Slider from "./Slider/Slider";
import Selector from "./Selector/Selector";

/**
 * Renders a collapsible section containing controls
 * 
 * @param {Object} props - Component props
 * @param {string} props.dropdownName - Title text for the dropdown
 * @param {boolean} props.hasDropdown - Whether section can be collapsed
 * @param {Array} [props.sliders=[]] - Slider control configurations
 * @param {Array} [props.selectors=[]] - Selector control configurations
 * @returns {JSX.Element} Collapsible control section
 */
function Dropdowns({
    dropdownName,
    hasDropdown,
    sliders = [], // Accept an array of slider objects
    selectors = [], // Accept an array of selector objects
}) 
{ 
    // Track collapsed state
    const [isCollapsed, setIsCollapsed] = useState(true);
    const dropDownRef = useRef(null);

    /**
     * Toggle the collapsed state of the dropdown
     */
    const toggleCollapse = () => {
        {hasDropdown !== false &&
            setIsCollapsed(!isCollapsed);
        }
    };

    // Animate dropdown height changes
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
                            maxValue={slider.maxValue}
                            tooltip={slider.tooltip}
                        />
                    ))}
                    {selectors.map((selector, index) => (
                        <Selector
                            key={index}
                            label={selector.label}
                            value={selector.value}
                            onChange={selector.setValue}
                            options={selector.options}
                            tooltip={selector.tooltip}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Dropdowns;