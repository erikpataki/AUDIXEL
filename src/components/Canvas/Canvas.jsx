/**
 * @module components/Canvas
 * @description Canvas component for creating and displaying audio-reactive generative art.
 * Handles audio visualization, shape generation, and image processing.
 * @see module:components/Dropdowns
 */
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import p5 from 'p5';
import "./Canvas.css";

/**
 * Renders a canvas for audio visualization and image processing
 * 
 * @function Canvas
 * @memberof module:components/Canvas
 * @param {Object} props - Component props
 * @param {string} props.selectedImage - URL or data URI of the currently selected image
 * @param {string} props.processedImage - URL or data URI of the processed image
 * @param {boolean} props.showProcessed - Whether to display the processed image or original image
 * @param {Function} props.setSelectedImage - Setter function for the selected image
 * @param {React.RefObject} props.canvasRef - Reference to the canvas element
 * @param {Object} props.audioFeatures - Object containing analyzed audio features
 * @param {Array} props.individualBufferValues - Array of audio buffer analysis values
 * @param {Function} props.debouncedProcessImage - Debounced function to process images
 * @param {number} props.horizontalResolutionValue - Horizontal resolution for the canvas
 * @param {number} props.verticalResolutionValue - Vertical resolution for the canvas
 * @param {number} props.scale - Scale factor for rendering
 * @param {Function} props.setAngle - Setter function for the angle parameter
 * @param {number} props.minThreshold - Minimum threshold for image processing
 * @param {number} props.maxThreshold - Maximum threshold for image processing
 * @param {Function} props.handleThresholdChange - Handler function for threshold changes
 * @param {Function} props.setSortMode - Setter function for the pixel sorting mode
 * @param {React.Ref} ref - Ref forwarded to the component for imperative methods
 * @returns {JSX.Element} Canvas component for visualization rendering
 * @example
 * // Example Canvas with minimal configuration
 * <Canvas 
 *   bufferSize={bufferSize}
 *   selectedImage={selectedImage}
 *   processedImage={processedImage}
 *   showProcessed={showProcessed}
 *   setSelectedImage={setSelectedImage}
 *   setProcessedImage={setProcessedImage}
 *   canvasRef={canvasRef}
 *   audioFeatures={audioFeatures}
 *   individualBufferValues={individualBufferValues}
 *   debouncedProcessImage={debouncedProcessImage}
 *   horizontalResolutionValue={horizontalResolutionValue}
 *   verticalResolutionValue={verticalResolutionValue}
 *   scale={scale}
 *   setAngle={setAngle}
 *   minThreshold={minThreshold}
 *   maxThreshold={maxThreshold}
 *   handleThresholdChange={handleThresholdChange}
 *   setSortMode={setSortMode}
 *   ref={canvasComponentRef}
 * />
 */
const Canvas = forwardRef(({ selectedImage, processedImage, showProcessed, setSelectedImage, canvasRef, audioFeatures, individualBufferValues, debouncedProcessImage, horizontalResolutionValue, verticalResolutionValue, scale, setAngle, minThreshold, maxThreshold, handleThresholdChange, setSortMode }, ref) => {
  const p5ContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const processingCompletedRef = useRef(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasGeneratedBaseImageRef = useRef(false);
  
  // Add a state to store generated shapes for reuse when scale changes
  const [shapeData, setShapeData] = useState([]);
  // Flag to track if shapes need regenerating or just rescaling
  const [shouldRegenerateShapes, setShouldRegenerateShapes] = useState(true);
  // Previous audio features reference to detect changes
  const previousAudioFeaturesRef = useRef(null);

  /**
   * Expose methods to parent component through ref
   * 
   * @memberof module:components/Canvas
   * @inner
   */
  useImperativeHandle(ref, () => ({
    /**
     * Sets flag to regenerate shapes on next render
     * 
     * @function setShouldRegenerateShapes
     * @param {boolean} value - Whether shapes should be regenerated
     */
    setShouldRegenerateShapes
  }));

  /**
   * Load and draw image to canvas when selected image changes
   * 
   * @memberof module:components/Canvas
   * @inner
   */
  useEffect(() => {
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Get scale multiplier consistently
        const getScaleMultiplier = (scaleValue) => scaleValue > 0 ? scaleValue + 1 : 1;
        const scaleMultiplier = getScaleMultiplier(scale);
        
        // Apply scale factor to canvas dimensions
        canvas.width = img.width * scaleMultiplier;
        canvas.height = img.height * scaleMultiplier;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageLoaded(true); // Set the state to true when image is loaded
      };
    }
  }, [selectedImage, canvasRef, scale]);

  /**
   * Converts audio analysis values to RGBA color values
   * 
   * @function getAudioRGBA
   * @memberof module:components/Canvas
   * @inner
   * @param {number} hue - Hue value from audio analysis, range 0-1
   * @param {number} saturation - Saturation value from audio analysis
   * @param {number} lightness - Lightness value (defaulted to 50)
   * @returns {Object} Object containing two color values as HSLA strings
   */
  function getAudioRGBA(hue, saturation, lightness) {
    hue = (1-hue) * 240;
    saturation = saturation;
    lightness = 50;
    
    let color1 = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`;
    let color2;
    if (hue > 0.5) {
      color2 = `hsla(0, 0%, 0%, 0.3)`;
    } else {
      color2 = `hsla(0, 0%, 100%, 0.3)`;
    }

    return { color1, color2 };
  }

  let col1;
  let col2;

  /**
   * Initialize p5 sketch and generate shapes based on audio features
   * 
   * @memberof module:components/Canvas
   * @inner
   */
  useEffect(() => {
    if (
      audioFeatures && 
      Object.keys(audioFeatures).length > 0 && 
      individualBufferValues && 
      imageLoaded && 
      (!hasGeneratedBaseImageRef.current || 
       p5InstanceRef.current === null)
    ) {
      // Set the flag to true
      hasGeneratedBaseImageRef.current = true;
      
      // Reset processing flag when new audio features are received
      processingCompletedRef.current = false;

      // Determine if the shapes need regenerating based on audio features change
      // If the audioFeatures object is different from what was before, regenerate shapes
      const audioFeaturesChanged = !previousAudioFeaturesRef.current || 
        JSON.stringify(previousAudioFeaturesRef.current) !== JSON.stringify(audioFeatures);
      
      if (audioFeaturesChanged) {
        setShouldRegenerateShapes(true);
        previousAudioFeaturesRef.current = { ...audioFeatures };
      }

      // Remove the old p5 instance if it exists
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }

      // Get container dimensions
      const container = p5ContainerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;

      // Calculate aspect ratio
      const aspectRatio = containerWidth / containerHeight;

      // Adjust canvas dimensions
      let canvasWidth = horizontalResolutionValue;
      let canvasHeight = verticalResolutionValue;

      if (canvasWidth / canvasHeight > aspectRatio) {
        canvasWidth = canvasHeight * aspectRatio;
      } else {
        canvasHeight = canvasWidth / aspectRatio;
      }

      // Calculate scale multiplier consistently
      const getScaleMultiplier = (scaleValue) => scaleValue > 0 ? scaleValue + 1 : 1;
      const scaleMultiplier = getScaleMultiplier(scale);

      const sketch = (p) => {
        /**
         * p5.js setup function.
         * Creates canvas and configures initial settings
         * 
         * @function setup
         * @memberof module:components/Canvas
         * @inner
         */
        p.setup = () => {
          const container = p5ContainerRef.current;
          // Use the horizontalResolutionValue and verticalResolutionValue directly
          // These already have the scale factor applied in Home.jsx
          const canvas = p.createCanvas(horizontalResolutionValue, verticalResolutionValue);
          canvas.parent(container);
          p.angleMode(p.DEGREES);
          p.noLoop();
        };

        /**
         * p5.js draw function
         * Renders shapes based on audio analysis
         * 
         * @function draw
         * @memberof module:components/Canvas
         * @inner
         */
        p.draw = () => {
          p.background(0); // Set background to black
          
          // If shapes need regenerating, process audio data and create new shapes
          if (shouldRegenerateShapes) {
            const newShapeData = [];

            for (let i = 0; i < individualBufferValues.length; i++) {
              if (individualBufferValues[i].spectralKurtosis && individualBufferValues[i].spectralKurtosis !== 0 && individualBufferValues[i].energy > 1) {
                // Original calculation for aggressiveness-based size
                let aggressiveness = ((individualBufferValues[i].zcr - 10)/30);
                let sizeMultiplier;
                if (aggressiveness > 1) {
                  sizeMultiplier = aggressiveness;
                } else {
                  sizeMultiplier = 1;
                }
                aggressiveness = Math.max(0, Math.min(1, aggressiveness));
                
                let hueValue = aggressiveness;
                let saturationValue = Math.min(100, (30 + (individualBufferValues[i].energy*1.15)));

                const { color1, color2 } = getAudioRGBA(hueValue, saturationValue);
                col1 = color1;
                col2 = color2;

                // Store the hue value instead of setting angle immediately
                if (individualBufferValues[i].energy > (audioFeatures.energy.average * 0.2) && aggressiveness !== 0) {
                  // Calculate base size with original formula
                  const baseSize = (35 + Math.min(110, individualBufferValues[i].energy)) * 0.5;
                  
                  // Apply the aggressiveness-based size multiplier from the original code
                  const sizedShape = baseSize * sizeMultiplier;
                  
                  // Generate random position once and store it
                  const x = p.random(p.width);
                  const y = p.random(p.height);
                  
                  // Store the positions as relative percentages of the canvas size
                  // This ensures they scale properly when the canvas size changes
                  const xPercent = x / p.width;
                  const yPercent = y / p.height;
                  
                  const rotation = p.random(360);
                  
                  // Get number of vertices based on aggressiveness
                  const verticesNums = p.int(Math.max(3, Math.min(10, Math.round(aggressiveness*10))));
                  const depth = Math.max(0.1, Math.min(0.75, aggressiveness/1.34));
                  
                  // Store all shape properties
                  newShapeData.push({
                    xPercent,
                    yPercent,
                    baseSize: sizedShape, // Base size (before scale multiplier)
                    color1,
                    color2,
                    aggressiveness,
                    rotation,
                    verticesNums,
                    depth
                  });
                  
                  // Draw the shape with the scale multiplier applied
                  const scaledSize = sizedShape * scaleMultiplier;
                  drawPoly(x, y, scaledSize, p, rotation, verticesNums, depth, color1, color2);
                }
              }
            }
            
            // Save the shape data for future use
            setShapeData(newShapeData);
            setShouldRegenerateShapes(false);
          } else {
            // Reuse existing shape data, just redraw with new scale
            shapeData.forEach(shape => {
              // Calculate actual pixel positions using percentages
              // This ensures shapes are distributed across the entire canvas
              const x = shape.xPercent * p.width;
              const y = shape.yPercent * p.height;
              
              const scaledSize = shape.baseSize * scaleMultiplier;
              drawPoly(
                x, 
                y, 
                scaledSize, 
                p, 
                shape.rotation,
                shape.verticesNums,
                shape.depth,
                shape.color1,
                shape.color2
              );
            });
          }

          const dataUrl = p.canvas.toDataURL();
          setSelectedImage(dataUrl);

          // Set angle based on spectralKurtosis average and sort mode based on ZCR average
          if (!processingCompletedRef.current) {
            // Set angle using spectralKurtosis
            const newAngle = audioFeatures.spectralKurtosis.average * 10;
            setAngle((newAngle + 360) % 360);
            
            // Set sort mode based on ZCR average
            const averageZCR = audioFeatures.zcr.average;

            let averageAggressiveness = ((audioFeatures.zcr.average - 10)/30);
            handleThresholdChange('amount', (130 + (averageAggressiveness * 60)));

            let newSortMode;
            if (averageZCR <= 14) {
              newSortMode = 4; // Lightness
            } else if (averageZCR > 14 && averageZCR <= 18) {
              newSortMode = 0; // Brightness
            } else if (averageZCR > 18 && averageZCR <= 28) {
              newSortMode = 3; // Saturation
            } else {
              newSortMode = 2; // Hue
            }
            setSortMode(newSortMode);

            // Process image with new angle and sort mode
            debouncedProcessImage(dataUrl, minThreshold, maxThreshold, newSortMode, newAngle);
            processingCompletedRef.current = true;
          }
        };

        /**
         * Draws a polygon with gradient fill
         * 
         * @function drawPoly
         * @memberof module:components/Canvas
         * @inner
         * @param {number} x - X coordinate of the polygon center
         * @param {number} y - Y coordinate of the polygon center
         * @param {number} r - Base radius of the polygon
         * @param {Object} p - p5 instance
         * @param {number} rotation - Rotation angle in degrees
         * @param {number} verticesNums - Number of vertices (determines shape complexity)
         * @param {number} depth - Depth factor for distortion
         * @param {string} color1 - First color for gradient
         * @param {string} color2 - Second color for gradient
         */
        function drawPoly(x, y, r, p, rotation, verticesNums, depth, color1, color2) {
          p.noStroke();
          let gradientFill = p.drawingContext.createLinearGradient(
            0,
            -r,
            0,
            r
          );
          gradientFill.addColorStop(0, p.color(color1));
          gradientFill.addColorStop(1, p.color(color2));
          p.drawingContext.fillStyle = gradientFill;
          p.push();
          p.translate(x, y);
          p.rotate(rotation);
          
          p.beginShape();
          for (let i = 0; i < 360; i += 1) {
            let radius = r + (r * depth * p.sin(i * verticesNums));
            let ex = radius * p.sin(i);
            let ey = radius * p.cos(i);
            p.vertex(ex, ey);
          }
          p.endShape(p.CLOSE);
          p.pop();
        }
      };

      // Store the p5 instance in the ref
      p5InstanceRef.current = new p5(sketch);
    }

    return () => {
      // Clean up the p5 instance when the component unmounts
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [audioFeatures, individualBufferValues, imageLoaded, horizontalResolutionValue, verticalResolutionValue, scale, shapeData, shouldRegenerateShapes]);

  return (
    <div className="image-upload">
      <div className="upload-block">
        <img
          src={showProcessed ? processedImage : selectedImage}
          alt={showProcessed ? "Processed" : "Original"}
          className="preview-image"
        />
        <img
          src={showProcessed ? processedImage : selectedImage}
          alt={showProcessed ? "Processed" : "Original"}
          className="preview-image-blur"
        />
        <div
          id="p5-canvas-container"
          ref={p5ContainerRef}
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            zIndex: 3,
          }}>
            <canvas 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
              }}
            />
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
});

export default Canvas;