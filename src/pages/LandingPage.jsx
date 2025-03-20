import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./LandingPage.css";
import Modal from '../components/Modal/Modal';
import InfoButton from '../components/InfoButton/InfoButton';
import { getTutorialMessage } from '../utils/tutorialContent';

/**
 * Landing page component for the application.
 * Allows users to upload audio files or images to start the application.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.setSelectedImage - Setter function for the selected image
 * @param {Function} props.setProcessedImage - Setter function for the processed image
 * @param {Function} props.setInitialAudioFile - Setter function for the initial audio file
 * @returns {React.ReactElement} The rendered LandingPage component
 */
const LandingPage = ({ setSelectedImage, setProcessedImage, setInitialAudioFile }) => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [showShortAudioModal, setShowShortAudioModal] = useState(false);
  const [showLongAudioModal, setShowLongAudioModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(true);
  const [pendingAudioFile, setPendingAudioFile] = useState(null);

  // Check if we should show the tutorial on component mount
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('audixel-has-seen-tutorial');
    if (!hasSeenTutorial) {
      setShowTutorialModal(true);
      localStorage.setItem('audixel-has-seen-tutorial', 'true');
    }
  }, []);

  // Tutorial message content with formatting
  const tutorialMessage = getTutorialMessage();

  /**
   * Checks the duration of an audio file.
   * 
   * @param {File} file - The audio file to check
   * @returns {Promise<number>} A promise that resolves to the duration in seconds
   */
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

  /**
   * Handles image file selection.
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event from the file input
   */
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

  /**
   * Handles audio file selection and checks duration constraints.
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event from the file input
   */
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
  
  /**
   * Processes the audio file and navigates to the home page.
   * 
   * @param {File} file - The audio file to process
   * @param {boolean} isShortApproved - Whether a short audio file was approved for use
   * @param {boolean} isLongApproved - Whether a long audio file was approved for use
   */
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

  /**
   * Confirms the use of a short audio file and proceeds with processing.
   */
  const handleConfirmShortAudio = () => {
    if (pendingAudioFile && pendingAudioFile.file) {
      // Pass true for shortAudioApproved
      processAudioFile(pendingAudioFile.file, true, false);
    }
    setShowShortAudioModal(false);
    setPendingAudioFile(null);
  };

  /**
   * Confirms the use of a long audio file and proceeds with processing.
   */
  const handleConfirmLongAudio = () => {
    if (pendingAudioFile && pendingAudioFile.file) {
      // Pass true for longAudioApproved
      processAudioFile(pendingAudioFile.file, false, true);
    }
    setShowLongAudioModal(false);
    setPendingAudioFile(null);
  };

  /**
   * Cancels the use of a short audio file and resets the file input.
   */
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

  /**
   * Cancels the use of a long audio file and resets the file input.
   */
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

  /**
   * Handles the dragover event for drag and drop functionality.
   * 
   * @param {React.DragEvent} e - The drag event
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  /**
   * Handles the dragleave event for drag and drop functionality.
   * 
   * @param {React.DragEvent} e - The drag event
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * Handles the drop event for drag and drop functionality.
   * Processes dropped audio or image files.
   * 
   * @param {React.DragEvent} e - The drop event
   */
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

  /**
   * Closes the tutorial modal.
   */
  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
  };

  /**
   * Opens the tutorial modal.
   */
  const handleOpenTutorial = () => {
    setShowTutorialModal(true);
  };

  return (
    <div className="image-upload">
      <InfoButton 
        onClick={handleOpenTutorial} 
        isVisible={!showTutorialModal}
      />
      
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
      
      {/* Tutorial modal */}
      <Modal
        isOpen={showTutorialModal}
        onClose={handleCloseTutorial}
        title="AUDIXEL"
        message={tutorialMessage}
        modalType="tutorial"
        hasButtons={false}
        customClass="tutorial-modal"
      />
    </div>
  );
};

export default LandingPage;