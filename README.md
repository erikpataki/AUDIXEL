# FOR FULL PROPER JSDOC DOCUMENTAION VISIT `docs\global.html`

# AUDIXEL: Audio-Reactive Album Cover Generator

An innovative web application that transforms music into visual art by analyzing audio characteristics and applying advanced pixel sorting techniques.

## Project Overview

AUDIXEL bridges the gap between algorithmic art and music visualization by extracting meaningful audio features and mapping them to visual parameters. The result is album artwork that is fundamentally connected to the sonic properties of the music itself.

## Features

- **Audio Analysis**: Processes audio files using Meyda.js to extract features like Zero Crossing Rate (ZCR), Spectral Kurtosis, and Energy
- **Shape Generation**: Creates abstract polygonal shapes based on audio characteristics
- **Pixel Sorting**: Applies customizable sorting algorithms with parameters derived from audio features
- **Multiple Sort Modes**: 
  - Brightness (RGB sum)
  - Darkness (negative RGB sum)
  - Hue (HSL color wheel position)
  - Saturation (color intensity)
  - Lightness (perceived brightness)
- **Parallel Processing**: Uses Web Workers for efficient image transformation
- **High-Resolution Output**: Supports up to 7200×7200 pixel exports

## Audio-Visual Mapping

- **Sort Mode Selection**: Based on ZCR ranges
  - ZCR ≤ 14 → Lightness sort
  - 14 < ZCR ≤ 18 → Brightness sort
  - 18 < ZCR ≤ 28 → Saturation sort
  - ZCR > 28 → Hue sort
- **Sorting Angle**: Derived from spectral kurtosis
- **Threshold Values**: Calculated from ZCR aggressiveness


## Getting Started

### Prerequisites

- Node.js (v16.0 or higher recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/erikpataki/audixel.git

# Navigate to the project directory
cd audixel

# Install dependencies
npm install

# Start the development server
npm start
```


# Audio Processing Pipeline Pseudocode

## Function: `processAudio(audioFile)`

1. Load and decode audio file  
2. Divide audio into 512-sample buffers  
3. Extract features using Meyda.js:  
   - Zero Crossing Rate (ZCR)  
   - Spectral Kurtosis  
   - Energy  
   - Other spectral features  
4. Calculate aggregate statistics (min, max, average)  
5. Store individual buffer values for shape generation  
6. Pass audio features to Canvas component  

---

# Shape Generation

## Function: `generateShapes(individualBufferValues, audioFeatures)`

1. Create canvas with p5.js  
2. For each audio buffer segment with sufficient energy:  
   - **Calculate "aggressiveness" from ZCR:**  
     ```math
     aggressiveness = \frac{zcr - 10}{30}
     ```
   - **Set shape parameters:**  
     - **Vertices:** `Math.min(10, Math.max(3, aggressiveness * 10))`  
     - **Depth:** `Math.min(0.75, Math.max(0.1, aggressiveness / 1.34))`  
     - **Size:** `(35 + Math.min(110, energy)) * 0.5`  
     - **Color:** HSL values based on aggressiveness and energy  
   - **Draw distorted polygon with sinusoidal variation:**  
     ```math
     radius = baseRadius + (baseRadius * depth * sin(angle * vertices))
     ```
3. Capture generated image as `dataURL`  

---

# Parameter Selection

## Function: `selectPixelSortingParameters(audioFeatures)`

1. **Set angle based on spectral kurtosis:**  
   ```js
   angle = (spectralKurtosis.average * 10) % 360
2. **Set sort mode based on ZCR:**  
   ```js
   if (ZCR <= 14) {
       sortMode = "Lightness";
   } else if (ZCR <= 18) {
       sortMode = "Brightness";
   } else if (ZCR <= 28) {
       sortMode = "Saturation";
   } else {
       sortMode = "Hue";
   }
Pixel Sorting
=============

sortPixels(image, minThreshold, maxThreshold, sortMode, angle)
--------------------------------------------------------------

1.  **Rotate image to specified angle**
    
2.  **Create Web Workers for parallel processing**
    
3.  **For each row in the image:**
    
    *   **Find contiguous pixel sections** where brightness is between thresholds
        
    *   **For each section, determine sort value based on mode:**
        
        *   Brightness = r + g + b;
            
        *   Darkness = -(r + g + b);
            
        *   Hue = h; // from HSL
            
        *   Saturation = s; // from HSL
            
        *   Lightness = l; // from HSL
            
    *   **Sort pixels by calculated value**
        
    *   **Replace original pixels with sorted pixels**
        
4.  **Rotate image back to original orientation**
    
5.  **Return processed image as dataURL**