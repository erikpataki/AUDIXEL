/**
 * @module components/Dropdowns
 * @description Collapsible control section for app settings.
 * Contains sliders and selectors in an expandable panel.
 * @see module:components/Dropdowns/Slider
 * @see module:components/Dropdowns/Selector
 */
import React, { useState, useRef, useEffect } from "react";
import "./Dropdowns.css";
import Slider from "./Slider/Slider";
import Selector from "./Selector/Selector";

/**
 * Dropdowns component - Renders collapsible dropdown sections
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.dropdownName - Name/title of the dropdown
 * @param {Array} [props.sliders] - Array of slider configurations
 * @param {Array} [props.selectors] - Array of selector configurations
 * @param {boolean} [props.hasDropdown] - Whether this component has dropdown functionality
 * @returns {JSX.Element} Dropdown component
 * @example
 * // With both sliders and selectors
 * <Dropdowns 
 *   dropdownName="Example Dropdown"
 *   hasDropdown={true}
 *   sliders={
 *   {
 *       label: "SLIDER 1",
 *       value: value1,
 *       setValue: handleValue1Change,
 *       tooltip: "example tooltip text 1"
 *   },
 *   {
 *       label: "SLIDER 2",
 *       value: value2,
 *       setValue: handleValue2Change,
 *       tooltip: "example tooltip text 2"
 *   },
 * }
 *   selectors={[
 *     {
 *       label: "SELECTOR 1",
 *       value: value,
 *       setValue: setValue,
 *       options: [
 *         { value: 0, label: 'Example 1' },
 *         { value: 1, label: 'Example 2' }
 *       ],
 *       tooltip: "Example tooltip text"
 *     }
 *   ]}
 * />
 * @example
 * // As a non-collapsible button
 * <Dropdowns 
 *   dropdownName="DROPDOWN COMPONENT BUTTON" 
 *   hasDropdown={false} 
 * />
 */
function Dropdowns({
    dropdownName,
    hasDropdown,
    sliders = [], // Accept an array of slider objects
    selectors = [], // Accept an array of selector objects
    icon
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
                <h3 className="drop-down-name">
                    {dropdownName}
                    <div className="dropdown-icon">                    
                        {icon && icon}
                    </div>
                </h3>
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