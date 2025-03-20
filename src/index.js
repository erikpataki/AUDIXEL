/**
 * @fileoverview AUDIXEL - Audio-reactive visualization application
 * @module AUDIXEL
 */

/**
 * @namespace Components
 * @description React components used in the application for rendering UI elements and visualizations
 */

/**
 * @namespace Pages
 * @description Page components that define the different views in the application
 */

/**
 * @namespace Utils
 * @description Utility functions used across the application for audio processing, image manipulation, etc.
 */

import ReactDOM from "react-dom/client";
import React from "react";
import App from "./App";

/**
 * Main application entry point
 * @function
 * @name renderApp
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);