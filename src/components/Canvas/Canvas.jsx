import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import "./Canvas.css";

const Canvas = ({ selectedImage, processedImage, showProcessed, setSelectedImage, setProcessedImage, canvasRef, audioFeatures }) => {
  const p5ContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);

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

  useEffect(() => {
    if (audioFeatures && Object.keys(audioFeatures).length > 0) {
      console.log("Audio Features received:", audioFeatures);
      const sketch = (p) => {
        p.setup = () => {
          const container = p5ContainerRef.current;
          const canvas = p.createCanvas(container.offsetWidth, container.offsetHeight);
          canvas.parent(container);
          console.log("p5 setup called");
        };

        p.draw = () => {
          console.log("p5 draw called");
          p.background(255);
          // Use audioFeatures to generate abstract image
          const { spectralFlatness, spectralCentroid, rms, spectralSlope } = audioFeatures;

          // Example: Draw circles based on audio features
          p.fill(255, 0, 0, spectralFlatness * 255);
          p.ellipse(p.width / 2, p.height / 2, spectralCentroid * 2, spectralCentroid * 2);

          p.fill(0, 255, 0, rms * 255);
          p.ellipse(p.width / 4, p.height / 4, spectralSlope * 2, spectralSlope * 2);

          p.fill(0, 0, 255, spectralFlatness * 255);
          p.ellipse((3 * p.width) / 4, (3 * p.height) / 4, rms * 2, rms * 2);

          // Convert p5 canvas to data URL and set as selected image
          const dataUrl = p.canvas.toDataURL();
          setSelectedImage(dataUrl);
          setProcessedImage(null);
        };
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
  }, [audioFeatures, setSelectedImage, setProcessedImage]);

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
              setProcessedImage(null);
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
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3 }}
      ></div>
    </div>
  );
};

export default Canvas;