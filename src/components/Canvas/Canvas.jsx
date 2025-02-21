import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import "./Canvas.css";

const Canvas = ({ selectedImage, processedImage, showProcessed, setSelectedImage, setProcessedImage, canvasRef, audioFeatures, individualBufferValues, debouncedProcessImage, horizontalResolutionValue, verticalResolutionValue, bufferSize }) => {
  const p5ContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const processingCompletedRef = useRef(false); // Add a ref to track processing
  const [imageLoaded, setImageLoaded] = useState(false); // Add a new state

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
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        setImageLoaded(true); // Set the state to true when image is loaded
      };
    }
  }, [selectedImage, canvasRef]);

  function getAudioRGBA(value) {
    // Ensure value is clamped between 0 and 1
    value = Math.max(0, Math.min(1, value));
    
    let r, g, b;
    let t = 0
    
    if (value < 0.5) {
        // Transition from blue to green
        t = value * 2; // Scale to range 0 - 1
        r = 0;
        g = Math.round(t * 255);
        b = Math.round((1 - t) * 255);
    } else {
        // Transition from green to red
        t = (value - 0.5) * 2; // Scale to range 0 - 1
        r = Math.round(t * 255);
        g = Math.round((1 - t) * 255);
        b = 0;
        // console.log("t:", t);
    }
    
    let color1 = `rgba(${r}, ${g}, ${b}, 0.01)`;
    // let color1 = `rgba(${r}, ${g}, ${b}, ${Math.max(0.1, Math.min(0.3, value/3))})`;
    let darkenFactor = 0.6; // 80% of the original brightness
    // let color2 = `rgba(${ Math.round(r * darkenFactor)}, ${Math.round(g * darkenFactor)}, ${Math.round(b * darkenFactor)}, 0.3)`;
    let color2 = `rgba(${Math.max(0, Math.min(255, Math.round(r * darkenFactor)))}, ${Math.max(0, Math.min(255, Math.round(g * darkenFactor)))}, ${Math.max(0, Math.min(255, Math.round(b * darkenFactor)))}, 0.3)`;
    // let color2 = color1
    // console.log("color1:", color1, "color2:", color2);
    // console.log("Math.round(r * darkenFactor):", Math.round(r * darkenFactor));
    // console.log("value:", value);
    return { color1, color2 };
  }

  let col1;
  let col2;

  useEffect(() => {
    if (audioFeatures && Object.keys(audioFeatures).length > 0 && individualBufferValues && imageLoaded) { // Add imageLoaded to the dependency array
      // console.log("Audio Features received:", audioFeatures);
      // console.log("Individual Buffer Values received:", individualBufferValues);

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

      const sketch = (p) => {
        p.setup = () => {
          const container = p5ContainerRef.current;
          const canvas = p.createCanvas(horizontalResolutionValue, verticalResolutionValue);
          canvas.parent(container);
          p.angleMode(p.DEGREES);
          // paletteSelected1 = p.random(palettes);
          // paletteSelected2 = p.random(palettes);
          // console.log("p5 setup called");
          p.noLoop();
        };

        p.draw = () => {
          p.background(0); // Set background to black
          // Loop to draw multiple shapes
          for (let i = 0; i < individualBufferValues.length; i++) { // Draws a shape for each buffer
            // console.log("Math.min(individualBufferValues[i].spectralFlatness*5, 1):", Math.min(individualBufferValues[i].spectralFlatness*5, 1));
            // console.log("individualBufferValues[i].spectralFlatness:", Math.min(individualBufferValues[i].spectralFlatness, 1));
            // console.log("individualBufferValues[i].spectralCentroid:", individualBufferValues[i].spectralCentroid/(bufferSize/4));
            // console.log("individualBufferValues[i].spectralKurtosis:", individualBufferValues[i].spectralKurtosis);
            // console.log("(Math.min(individualBufferValues[i].spectralFlatness*5, 1) + (individualBufferValues[i].spectralCentroid/(bufferSize/4)) + individualBufferValues[i].spectralKurtosis)/3:", (Math.min(individualBufferValues[i].spectralFlatness*5, 1) + (individualBufferValues[i].spectralCentroid/(bufferSize/4)) + individualBufferValues[i].spectralKurtosis)/3);
            // console.log("individualBufferValues[i].energy:", individualBufferValues[i].energy);
            col1 = getAudioRGBA(((Math.min(individualBufferValues[i].spectralFlatness*5, 1) + (1 - (individualBufferValues[i].spectralCentroid)/(bufferSize/4)) + (1-individualBufferValues[i].spectralKurtosis))/3)).color1;
            col2 = getAudioRGBA(((Math.min(individualBufferValues[i].spectralFlatness*5, 1) + (1 - (individualBufferValues[i].spectralCentroid)/(bufferSize/4)) + (1-individualBufferValues[i].spectralKurtosis))/3)).color2;
            // console.log("col1:", col1, "col2:", col2);
            if (individualBufferValues[i].energy > (audioFeatures.energy.average * 0.2) && individualBufferValues[i].spectralKurtosis !== 0 && individualBufferValues[i].spectralFlatness !== 0 && individualBufferValues[i].spectralCentroid !== 0) {
              // console.log("individualBufferValues[i].spectralFlatness + (individualBufferValues[i].spectralCentroid/(bufferSize/4)))/2:", (individualBufferValues[i].spectralFlatness + (individualBufferValues[i].spectralCentroid/(bufferSize/4)))/2);
              // Draw a polygon with random parameters
              poly(p.random(p.width), p.random(p.height), individualBufferValues[i].energy, p, individualBufferValues[i].spectralKurtosis); // x, y, radius, p5 instance
              // distortedCircle(p.random(p.width), p.random(p.height), p.random(50, 200), p); // x, y, radius, p5 instance
            } 
            // else {
            //   // Draw a distorted circle with random parameters
            //   distortedCircle(p.random(p.width), p.random(p.height), p.random(50, 200), p); // x, y, radius, p5 instance
            // }
          }

          const dataUrl = p.canvas.toDataURL();
          setSelectedImage(dataUrl);

          // Trigger image processing with the new data URL
          if (!processingCompletedRef.current) {
            debouncedProcessImage(dataUrl, 40, 170, 0, 115);
            processingCompletedRef.current = true; // Set the flag to true
          }
        };

        function poly(x, y, r, p, spectralKurtosis) {
          // Function to draw a polygon
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
          p.rotate(p.random(360))
          // verticesNums sets how many points the shape has
          let verticesNums = p.int(p.random(3, 6))
          // depth sets how close the bits that go into the shape are to the center
          // let depth = p.random(0.1, 0.5)
          // console.log("spectralKurtosis:", spectralKurtosis/2);
          let depth = Math.max(0.1, Math.min(0.5, spectralKurtosis/2))
          p.beginShape();
          for (let i = 0; i < 360; i += 1) {
            let radius = r + (r * depth * p.sin(i * verticesNums));
            let ex = radius * p.sin(i);
            let ey = radius * p.cos(i);
            p.vertex(ex, ey)
          }
          p.endShape(p.CLOSE)
          p.pop();
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
  }, [audioFeatures, setSelectedImage, setProcessedImage, individualBufferValues, debouncedProcessImage, canvasRef, imageLoaded, horizontalResolutionValue, verticalResolutionValue]);

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
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
              }}
            />
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

// Define palettes outside the component
const palettes = [
  ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"],
  ["#641A1D", "#9A2B2E", "#D03D3F", "#F25C54", "#F08A5D"],
  ["#2EC4B6", "#CBF3F0", "#FFBF69", "#F4A261", "#264653"],
  ["#003049", "#D62828", "#F77F00", "#FCBF49", "#EAE2B7"],
  ["#495464", "#577590", "#4D908E", "#F9C80E", "#F94144"]
];

export default Canvas;