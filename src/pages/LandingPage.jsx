import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./LandingPage.css";

const LandingPage = ({ setSelectedImage, setProcessedImage, setInitialAudioFile }) => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        setSelectedImage(event.target.result);
        setProcessedImage(null);
        setInitialAudioFile({
          file: null,
          name: file.name,
          isImage: true
        });
        navigate('/home');
      };

      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setInitialAudioFile({
        file: file,
        name: file.name
      });
      setSelectedImage(null);
      setProcessedImage(null);
      navigate('/home');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (file.type.startsWith('audio/')) {
        // Handle as audio file
        setInitialAudioFile({
          file: file,
          name: file.name
        });
        setSelectedImage(null);
        setProcessedImage(null);
        navigate('/home');
      } else if (file.type.startsWith('image/')) {
        // Handle as image file
        const reader = new FileReader();
        reader.onload = function (event) {
          setSelectedImage(event.target.result);
          setProcessedImage(null);
          setInitialAudioFile({
            file: null,
            name: file.name,
            isImage: true
          });
          navigate('/home');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="image-upload">
      <div 
        className={`upload-block ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label htmlFor="audio-file-input" className='file-input-label'>
          <div className="upload-text">
            <div className='image-upload-text-main-parent'>
              <p className='image-upload-text'>Select or drag audio file(s)</p>
              <p className='image-upload-text'>(.wav, .mp3, .ogg)</p>
            </div>
            <label htmlFor='image-file-input' className='image-upload-text small-image-upload-text'>
              <p>(or upload your own image here)</p>
            </label>
          </div>
        </label>
      </div>
      <input
        id="audio-file-input"
        type="file"
        accept="audio/*"
        onChange={handleAudioChange}
        style={{ display: 'none' }}
      />
      <input id="image-file-input"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: 'none' }}>
      </input>
    </div>
  );
};

export default LandingPage;