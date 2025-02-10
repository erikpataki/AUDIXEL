import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import "./Canvas.css";

const Canvas = ({ selectedImage, processedImage, showProcessed, setSelectedImage, setProcessedImage, canvasRef, audioFeatures, individualBufferValues, debouncedProcessImage }) => {
  const p5ContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const processingCompletedRef = useRef(false); // Add a ref to track processing

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
      };
    }
  }, [selectedImage, canvasRef]);
  
  let colors = [];

  useEffect(() => {
    if (audioFeatures && Object.keys(audioFeatures).length > 0 && individualBufferValues) {
      console.log("Audio Features received:", audioFeatures);
      console.log("Individual Buffer Values received:", individualBufferValues);
      const sketch = (p) => {
        p.setup = () => {
          const container = p5ContainerRef.current;
          const canvas = p.createCanvas(container.offsetWidth, container.offsetHeight);
          canvas.parent(container);
          console.log("p5 setup called");
          p.noLoop();
          generateColors();
        };

        p.draw = () => {
          p.background(20);
          for (let i = 0; i < 200; i++) {
            drawBlob(p.random(p.width), p.random(p.height), p.random(50, 200));
          }

          // Convert p canvas to data URL and set as selected image
          const dataUrl = p.canvas.toDataURL();
          setSelectedImage(dataUrl);
          
          // Trigger image processing with the new data URL
          if (!processingCompletedRef.current) {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
              debouncedProcessImage(img, 40, 170, 0, 115);
              processingCompletedRef.current = true; // Set the flag to true
            };
          }
        };
        
        function drawBlob(x, y, size) {
          let col = p.random(colors);
          p.noStroke();
          for (let i = size; i > 0; i -= 5) {
            p.fill(col[0], col[1], col[2], p.map(i, 0, size, 50, 200));
            p.ellipse(x + p.noise(i) * 50, y + p.noise(i + 100) * 50, i * 2, i * 1.5);
          }
        }
        
        function generateColors() {
          colors = [
            [200, 20, 20], // Red
            [250, 100, 150], // Pink
            [20, 20, 200], // Blue
            [100, 50, 200] // Purple
          ];
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
  }, [audioFeatures, setSelectedImage, setProcessedImage, individualBufferValues, debouncedProcessImage, canvasRef]);

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
      </div>
      <input
        id="image-file-input"
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function (event) {
              setSelectedImage(event.target.result);
            };
            reader.readAsDataURL(file);
          }
        }}
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <div
        id="p5-canvas-container"
        ref={p5ContainerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3 }}>
      </div>
    </div>
  );
};

export default Canvas;