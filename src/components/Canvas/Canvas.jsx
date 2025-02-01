import React, { useEffect } from 'react';
import "./Canvas.css";

const Canvas = ({ selectedImage, processedImage, showProcessed, setSelectedImage, setProcessedImage, canvasRef }) => {
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

  return (
    <div className="image-upload">
      <div className="upload-block">
        {selectedImage ? (
          <>
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
          </>
        ) : (
          <label htmlFor="image-file-input" className='file-input-label'>
            <div className="upload-text">
              <div className='image-upload-text-main-parent'>
                <p className='image-upload-text'>Select or drag image file(s)</p>
                <p className='image-upload-text'>(.jpg, .png, .gif)</p>
              </div>
            </div>
          </label>
        )}
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
    </div>
  );
};

export default Canvas;