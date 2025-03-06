import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./LandingPage.css";
import Modal from '../components/Modal/Modal';

const LandingPage = ({ setSelectedImage, setProcessedImage, setInitialAudioFile }) => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [showShortAudioModal, setShowShortAudioModal] = useState(false);
  const [showLongAudioModal, setShowLongAudioModal] = useState(false);
  const [pendingAudioFile, setPendingAudioFile] = useState(null);

  const checkAudioDuration = (file) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      });
      
      audio.src = objectUrl;
    });
  };

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

  const handleAudioChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      try {
        const duration = await checkAudioDuration(file);
        
        if (duration < 120) { // Less than 2 minutes (120 seconds)
          setPendingAudioFile({
            file: file,
            event: e
          });
          setShowShortAudioModal(true);
          return;
        } else if (duration > 600) { // More than 10 minutes (600 seconds)
          setPendingAudioFile({
            file: file,
            event: e
          });
          setShowLongAudioModal(true);
          return;
        }
        
        // If duration is fine, continue with processing
        processAudioFile(file);
      } catch (error) {
        console.error("Error checking audio duration:", error);
        // Fall back to processing without the check
        processAudioFile(file);
      }
    }
  };
  
  const processAudioFile = (file, isShortApproved = false, isLongApproved = false) => {
    setInitialAudioFile({
      file: file,
      name: file.name,
      shortAudioApproved: isShortApproved,
      longAudioApproved: isLongApproved
    });
    setSelectedImage(null);
    setProcessedImage(null);
    navigate('/home');
  };

  const handleConfirmShortAudio = () => {
    if (pendingAudioFile && pendingAudioFile.file) {
      // Pass true for shortAudioApproved
      processAudioFile(pendingAudioFile.file, true, false);
    }
    setShowShortAudioModal(false);
    setPendingAudioFile(null);
  };

  const handleConfirmLongAudio = () => {
    if (pendingAudioFile && pendingAudioFile.file) {
      // Pass true for longAudioApproved
      processAudioFile(pendingAudioFile.file, false, true);
    }
    setShowLongAudioModal(false);
    setPendingAudioFile(null);
  };

  const handleCancelShortAudio = () => {
    setShowShortAudioModal(false);
    
    // Reset file input if it's from a file input element
    if (pendingAudioFile && pendingAudioFile.event && 
        pendingAudioFile.event.target && 
        pendingAudioFile.event.target.value) {
      pendingAudioFile.event.target.value = '';
    }
    
    setPendingAudioFile(null);
  };

  const handleCancelLongAudio = () => {
    setShowLongAudioModal(false);
    
    // Reset file input if it's from a file input element
    if (pendingAudioFile && pendingAudioFile.event && 
        pendingAudioFile.event.target && 
        pendingAudioFile.event.target.value) {
      pendingAudioFile.event.target.value = '';
    }
    
    setPendingAudioFile(null);
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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (file.type.startsWith('audio/')) {
        try {
          const duration = await checkAudioDuration(file);
          
          if (duration < 120) { // Less than 2 minutes (120 seconds)
            setPendingAudioFile({
              file: file
            });
            setShowShortAudioModal(true);
            return;
          } else if (duration > 600) { // More than 10 minutes (600 seconds)
            setPendingAudioFile({
              file: file
            });
            setShowLongAudioModal(true);
            return;
          }
          
          // If duration is fine, continue with processing
          processAudioFile(file);
        } catch (error) {
          console.error("Error checking audio duration:", error);
          // Fall back to processing without the check
          processAudioFile(file);
        }
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
      <div className='title-bar landing-page-title'>
        <h3 className='main-title landing-page-title-text'>AUDIXEL</h3>
      </div>
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
      
      {/* Short audio modal */}
      <Modal
        isOpen={showShortAudioModal}
        onClose={handleCancelShortAudio}
        onConfirm={handleConfirmShortAudio}
        title="Short Audio File"
        message="The audio file you've selected is less than 2 minutes long. Short audio files may not produce effective results. Would you like to continue anyway?"
      />
      
      {/* Long audio modal */}
      <Modal
        isOpen={showLongAudioModal}
        onClose={handleCancelLongAudio}
        onConfirm={handleConfirmLongAudio}
        title="Long Audio File"
        message="The audio file you've selected is over 10 minutes long. Processing might take longer. Would you like to continue anyway?"
      />
    </div>
  );
};

export default LandingPage;