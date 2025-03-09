import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import p5 from 'p5';
import "./Canvas.css";

const Canvas = forwardRef(({ selectedImage, processedImage, showProcessed, setSelectedImage, setProcessedImage, canvasRef, audioFeatures, individualBufferValues, debouncedProcessImage, horizontalResolutionValue, verticalResolutionValue, scale, bufferSize, setAngle, minThreshold, maxThreshold, handleThresholdChange, setSortMode }, ref) => {
  const p5ContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const processingCompletedRef = useRef(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasGeneratedBaseImageRef = useRef(false);
  
  // Add a state to store generated shapes for reuse when scale changes
  const [shapeData, setShapeData] = useState([]);
  // Flag to track if we need to regenerate shapes or just rescale
  const [shouldRegenerateShapes, setShouldRegenerateShapes] = useState(true);
  // Previous audio features reference to detect changes
  const previousAudioFeaturesRef = useRef(null);

  // Expose the setShouldRegenerateShapes method through the ref
  useImperativeHandle(ref, () => ({
    setShouldRegenerateShapes
  }));

  // let paletteSelected1;
  // let paletteSelected2;

  // console.log("audioFeatures:", audioFeatures);
  // console.log("(audioFeatures.energy.max - audioFeatures.energy.min)*100:", (30/(audioFeatures.energy.max - audioFeatures.energy.min))*100);
  // console.log("individualBufferValues:", individualBufferValues);

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

  function getAudioRGBA(hue, saturation, lightness) {
    hue = (1-hue) * 240;
    saturation = saturation;
    lightness = 50;
    // console.log("saturation:", saturation)
    
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

      // Determine if we need to regenerate shapes based on audio features change
      // If the audioFeatures object is different from what we had before, regenerate shapes
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
        p.setup = () => {
          const container = p5ContainerRef.current;
          // Use the horizontalResolutionValue and verticalResolutionValue directly
          // These already have the scale factor applied in Home.jsx
          const canvas = p.createCanvas(horizontalResolutionValue, verticalResolutionValue);
          canvas.parent(container);
          p.angleMode(p.DEGREES);
          p.noLoop();
        };

        p.draw = () => {
          p.background(0); // Set background to black
          
          // If we need to regenerate shapes, process audio data and create new shapes
          if (shouldRegenerateShapes) {
            const newShapeData = [];
            let kurtosisRange = audioFeatures.spectralKurtosis.max - audioFeatures.spectralKurtosis.min;

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
                    baseSize: sizedShape, // Store the base size (before scale multiplier)
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

        // Updated poly function to extract drawing logic
        function drawPoly(x, y, r, p, rotation, verticesNums, depth, color1, color2) {
          // Function to draw a polygon
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

        // Original poly function for backward compatibility
        function poly(x, y, r, p, aggressiveness) {
          const verticesNums = p.int(Math.max(3, Math.min(10, Math.round(aggressiveness*10))));
          const depth = Math.max(0.1, Math.min(0.75, aggressiveness/1.34));
          const rotation = p.random(360);
          
          drawPoly(x, y, r, p, rotation, verticesNums, depth, col1, col2);
        }

        function distortedCircle(x, y, r, p) {
          // Function to draw a distorted circle
          p.noStroke();
          let gradientFill = p.drawingContext.createLinearGradient(
            0,
            -r,
            0,
            r
          );
          gradientFill.addColorStop(0, p.color(col1));
          gradientFill.addColorStop(1, p.color(col2));
          p.drawingContext.fillStyle = gradientFill;
          p.push();
          p.translate(x, y)
          //points
          let p1 = p.createVector(0, -r / 2);
          let p2 = p.createVector(r / 2, 0);
          let p3 = p.createVector(0, r / 2);
          let p4 = p.createVector(-r / 2, 0)
          //anker
          let val = 0.3;
          let random_a8_1 = p.random(-r * val, r * val)
          let random_a2_3 = p.random(-r * val, r * val)
          let random_a4_5 = p.random(-r * val, r * val)
          let random_a6_7 = p.random(-r * val, r * val)
          let ran_anker_lenA = r * p.random(0.2, 0.5)
          let ran_anker_lenB = r * p.random(0.2, 0.5)
          let a1 = p.createVector(ran_anker_lenA, -r / 2 + random_a8_1);
          let a2 = p.createVector(r / 2 + random_a2_3, -ran_anker_lenB);
          let a3 = p.createVector(r / 2 - random_a2_3, ran_anker_lenA);
          let a4 = p.createVector(ran_anker_lenB, r / 2 + random_a4_5);
          let a5 = p.createVector(-ran_anker_lenA, r / 2 - random_a4_5);
          let a6 = p.createVector(-r / 2 + random_a6_7, ran_anker_lenB);
          let a7 = p.createVector(-r / 2 - random_a6_7, -ran_anker_lenA);
          let a8 = p.createVector(-ran_anker_lenB, -r / 2 - random_a8_1);
          p.beginShape();
          p.vertex(p1.x, p1.y);
          p.bezierVertex(a1.x, a1.y, a2.x, a2.y, p2.x, p2.y)
          p.bezierVertex(a3.x, a3.y, a4.x, a4.y, p3.x, p3.y)
          p.bezierVertex(a5.x, a5.y, a6.x, a6.y, p4.x, p4.y)
          p.bezierVertex(a7.x, a7.y, a8.x, a8.y, p1.x, p1.y)
          p.endShape(p.CLOSE);
          p.pop();
        }
      };

      // Store the p instance in the ref
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

// Define palettes outside the component
const palettes = [
  ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"],
  ["#641A1D", "#9A2B2E", "#D03D3F", "#F25C54", "#F08A5D"],
  ["#2EC4B6", "#CBF3F0", "#FFBF69", "#F4A261", "#264653"],
  ["#003049", "#D62828", "#F77F00", "#FCBF49", "#EAE2B7"],
  ["#495464", "#577590", "#4D908E", "#F9C80E", "#F94144"]
];

export default Canvas;