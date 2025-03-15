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