import React, { useState, useRef, useEffect, useCallback } from 'react';
import "./Home.css";
import Dropdowns from '../components/Dropdowns/Dropdowns';
import Meyda from "meyda";
import Canvas from '../components/Canvas/Canvas';
import LoadingOverlay from '../components/LoadingOverlay/LoadingOverlay';
import SpinnerOverlay from '../components/SpinnerOverlay/SpinnerOverlay';
import Modal from '../components/Modal/Modal';
import InfoButton from '../components/InfoButton/InfoButton';
import { getTutorialMessage } from '../utils/tutorialContent';

const Home = ({ selectedImage, processedImage, setSelectedImage, setProcessedImage, initialAudioFile, setInitialAudioFile }) => {
  const [minThreshold, setMinThreshold] = useState(40);
  const [maxThreshold, setMaxThreshold] = useState(220);
  const [showProcessed, setShowProcessed] = useState(true);
  const [combinedThreshold, setCombinedThreshold] = useState(150);
  const debounceTimeoutRef = useRef(null);
  const [audioFeatures, setAudioFeatures] = useState({});
  const [middlePoint, setMiddlePoint] = useState(128);
  const [angle, setAngle] = useState(115);
  const [sortMode, setSortMode] = useState(0);
  // const [anglePreview, setAnglePreview] = useState(null);
  // const [sortModePreview, setSortModePreview] = useState(null);
  const canvasRef = useRef(null);
  const [individualBufferValues, setIndividualBufferValues] = useState([]);
  // const [audioProcessingState, setAudioProcessingState] = useState('idle');
  // const [pendingProcessedImage, setPendingProcessedImage] = useState(null);
  const hasTriggeredImageProcessingRef = useRef(false);
  const BASE_RESOLUTION = 2400;
  const [horizontalResolutionValue, setHorizontalResolutionValue] = useState(BASE_RESOLUTION);
  const [verticalResolutionValue, setVerticalResolutionValue] = useState(BASE_RESOLUTION);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [scale, setScale] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isSettingsChanging, setIsSettingsChanging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasComponentRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [isUploadImageHidden, setIsUploadImageHidden] = useState(false);
  const [isFilenameLong, setIsFilenameLong] = useState(false);
  const filenameRef = useRef(null);
  const [showShortAudioModal, setShowShortAudioModal] = useState(false);
  const [showLongAudioModal, setShowLongAudioModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [pendingAudioFile, setPendingAudioFile] = useState(null);

  useEffect(() => {
    if (selectedImage && !fileName && initialAudioFile) {
      // If we have a selected image from landing page
      if (initialAudioFile.isImage) {
        setFileName(initialAudioFile.name || 'Uploaded Image');
      } else if (initialAudioFile.file) {
        setFileName(initialAudioFile.name || 'Uploaded Audio');
      }
    }
  }, [selectedImage, fileName, initialAudioFile]);

  const getScaleMultiplier = (scaleValue) => scaleValue > 0 ? scaleValue + 1 : 1;

  const debounce = (func, delay) => {
    return function (...args) {
      setIsSettingsChanging(true);
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        func.apply(null, args);
        // setIsSettingsChanging will be set to false in the processImage function when processing is complete
      }, delay);
    };
  };

  const debouncedProcessImage = useCallback(debounce((dataUrl, minThreshold, maxThreshold, sortMode, angle) => {
    processImage(dataUrl, minThreshold, maxThreshold, sortMode, angle);
  }, 300), []);

  const handleThresholdChange = (type, value) => {
    if (type === 'amount') {
      setCombinedThreshold(value);
    } else if (type === 'middlePoint') {
      setMiddlePoint(value);
    }

    const newMiddlePoint = type === 'middlePoint' ? value : middlePoint;
    const newCombinedThreshold = type === 'amount' ? value : combinedThreshold;

    let minValue = newMiddlePoint - (newCombinedThreshold * 0.5);
    minValue = Math.max(0, Math.floor(minValue)); 

    let maxValue = newMiddlePoint + (newCombinedThreshold * (0.0029*newCombinedThreshold)); 
    maxValue = Math.min(255, Math.ceil(maxValue)); 

    if (minValue > maxValue) {
      [minValue, maxValue] = [maxValue, minValue];
    }

    setMinThreshold(minValue);
    setMaxThreshold(maxValue);
  };

  const handleMinThresholdChange = (value) => {
    setMinThreshold(value);
  };

  const handleMaxThresholdChange = (value) => {
    setMaxThreshold(value);
  };

  const processImage = async (dataUrl, minThreshold, maxThreshold, sortMode, angle) => {
    setIsSettingsChanging(true);
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas ref is not available.");
      setIsSettingsChanging(false);
      return;
    }
    
    const ctx = canvas.getContext('2d');

    const scaleMultiplier = getScaleMultiplier(scale);

    const image = new Image();
    image.src = dataUrl;
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const radians = (angle * Math.PI) / 180;

    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const newWidth = Math.ceil(image.width * cos + image.height * sin);
    const newHeight = Math.ceil(image.width * sin + image.height * cos);

    canvas.width = newWidth * scaleMultiplier;
    canvas.height = newHeight * scaleMultiplier;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = newWidth * scaleMultiplier;
    tempCanvas.height = newHeight * scaleMultiplier;
    
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    tempCtx.save();
    
    tempCtx.translate(newWidth * scaleMultiplier / 2, newHeight * scaleMultiplier / 2);
    tempCtx.rotate(radians);
    tempCtx.translate(-image.width / 2, -image.height / 2);
    tempCtx.drawImage(image, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, newWidth * scaleMultiplier, newHeight * scaleMultiplier);
    const data = new Uint8ClampedArray(imageData.data);

    const workerBlob = new Blob([`
      self.onmessage = function(e) {
        const { data, width, height, minThreshold, maxThreshold, sortMode } = e.data;
        
        const rgbaToHsl = (r, g, b) => {
          r /= 255;
          g /= 255;
          b /= 255;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;

          if (max === min) {
            h = s = 0; 
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }
          return [h * 360, s * 100, l * 100];
        };

        const processChunk = (data, width, height) => {
          const pixels = new Uint8ClampedArray(data);
          
          const meetsThreshold = (i) => {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            if (a === 0) return false; 
            const value = (r + g + b) / 3;
            return value >= minThreshold && value <= maxThreshold;
          };

          const getSortValue = (i) => {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const [h, s, l] = rgbaToHsl(r, g, b);
            switch (sortMode) {
              case 0: return r + g + b; 
              case 1: return -(r + g + b); 
              case 2: return h; 
              case 3: return s; 
              case 4: return l; 
              default: return r + g + b; 
            }
          };

          for (let y = 0; y < height; y++) {
            let startX = 0;
            let isInSortRange = false;
            let pixelsToSort = [];

            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;
              const shouldSort = meetsThreshold(i);

              if (shouldSort && !isInSortRange) {
                startX = x;
                isInSortRange = true;
                pixelsToSort = [];
              }

              if (isInSortRange) {
                pixelsToSort.push({
                  r: pixels[i],
                  g: pixels[i + 1],
                  b: pixels[i + 2],
                  a: pixels[i + 3],
                  sortValue: getSortValue(i)
                });
              }

              if ((!shouldSort || x === width - 1) && isInSortRange) {
                if (pixelsToSort.length > 0) {
                  pixelsToSort.sort((a, b) => a.sortValue - b.sortValue);

                  for (let j = 0; j < pixelsToSort.length; j++) {
                    const targetI = (y * width + (startX + j)) * 4;
                    pixels[targetI] = pixelsToSort[j].r;
                    pixels[targetI + 1] = pixelsToSort[j].g;
                    pixels[targetI + 2] = pixelsToSort[j].b;
                    pixels[targetI + 3] = pixelsToSort[j].a;
                  }
                }
                isInSortRange = false;
              }
            }

            if (isInSortRange && pixelsToSort.length > 0) {
              pixelsToSort.sort((a, b) => a.sortValue - b.sortValue);

              for (let j = 0; j < pixelsToSort.length; j++) {
                const targetI = (y * width + (startX + j)) * 4;
                pixels[targetI] = pixelsToSort[j].r;
                pixels[targetI + 1] = pixelsToSort[j].g;
                pixels[targetI + 2] = pixelsToSort[j].b;
                pixels[targetI + 3] = pixelsToSort[j].a;
              }
            }
          }
          return pixels;
        };

        const processed = processChunk(data, width, height);
        self.postMessage(processed);
      };
    `], { type: 'application/javascript' });

    const workerUrl = URL.createObjectURL(workerBlob);
    const workerCount = navigator.hardwareConcurrency || 4;
    const workers = [];

    const chunkHeight = Math.ceil(newHeight * scaleMultiplier / workerCount);
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(workerUrl);
      const startY = i * chunkHeight;
      const endY = Math.min(startY + chunkHeight, newHeight * scaleMultiplier);
      
      const chunk = imageData.data.slice(startY * newWidth * scaleMultiplier * 4, endY * newWidth * scaleMultiplier * 4);
      
      workers.push(new Promise(resolve => {
        worker.onmessage = (e) => {
          imageData.data.set(e.data, startY * newWidth * scaleMultiplier * 4);
          worker.terminate();
          resolve();
        };
        
        worker.postMessage({
          data: chunk,
          width: newWidth * scaleMultiplier,
          height: endY - startY,
          minThreshold,
          maxThreshold,
          sortMode
        });
      }));
    }

    await Promise.all(workers);
    URL.revokeObjectURL(workerUrl);
    
    tempCtx.putImageData(imageData, 0, 0);
    
    tempCtx.restore();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    const rotatedBackCanvas = document.createElement('canvas');
    const rotatedBackCtx = rotatedBackCanvas.getContext('2d');
    
    rotatedBackCanvas.width = image.width * scaleMultiplier;
    rotatedBackCanvas.height = image.height * scaleMultiplier;
    
    rotatedBackCtx.translate(rotatedBackCanvas.width / 2, rotatedBackCanvas.height / 2);
    rotatedBackCtx.rotate(-radians);
    rotatedBackCtx.translate(-newWidth * scaleMultiplier / 2, -newHeight * scaleMultiplier / 2);
    
    rotatedBackCtx.drawImage(canvas, 0, 0);
    
    const rotatedBackDataURL = rotatedBackCanvas.toDataURL();
    
    // Set the processed image with a callback to ensure spinner disappears only after image is set
    setProcessedImage(rotatedBackDataURL);
    
    // Add a small delay before removing the spinner to ensure the image has time to render
    setTimeout(() => {
      setIsSettingsChanging(false);
    }, 100);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas ref is not available.");
      return;
    }

    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');

      finalCanvas.width = horizontalResolutionValue;
      finalCanvas.height = verticalResolutionValue;

      const radians = (angle * Math.PI) / 180;

      finalCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
      finalCtx.rotate(-radians);

      finalCtx.translate(-canvas.width / 2, -canvas.height / 2);

      finalCtx.drawImage(canvas, 0, 0);

      finalCanvas.toBlob((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const downloadFilename = uploadedFile 
        ? `${uploadedFile.name.replace(/\.[^/.]+$/, "")}-album-cover.png` 
        : `AUDIXEL-album-cover.png`;
        link.download = downloadFilename;
        link.click();

        URL.revokeObjectURL(link.href);
      }, 'image/png');
    };
  };

  const toggleUploadImageHide = () => {
    setIsUploadImageHidden(!isUploadImageHidden);
  };

  const FEATURES = [
    { name: "spectralCentroid", average: true, min: true, max: true },
    { name: "energy", average: true, min: true, max: true },
    { name: "spectralKurtosis", average: true, min: true, max: true }, 
    { name: "spectralSpread", average: true, min: true, max: true },
    { name: "zcr", average: true, min: true, max: true },
    { name: "spectralRolloff", average: true, min: true, max: true },
    { name: "chroma", average: true, min: true, max: true },
    { name: "mfcc", average: true, min: true, max: true },
  ];

  let bufferSize = 512;

  const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

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

  const handleAudioChange = async (event, existingFile = null) => {
    let fileToProcess;
    let isAlreadyApproved = false;
    
    if (existingFile) {
      fileToProcess = existingFile;
      // Check if this file was previously approved as a short audio file
      if (initialAudioFile && initialAudioFile.shortAudioApproved) {
        isAlreadyApproved = true;
      }
      // Check if this file was previously approved as a long audio file
      if (initialAudioFile && initialAudioFile.longAudioApproved) {
        isAlreadyApproved = true;
      }
    } else if (event && event.target && event.target.files && event.target.files[0]) {
      fileToProcess = event.target.files[0];
    }
    
    if (fileToProcess) {
      // Skip duration check if already approved
      if (isAlreadyApproved) {
        processAudioFile(fileToProcess, event);
        return;
      }
      
      // Check audio duration
      try {
        const duration = await checkAudioDuration(fileToProcess);
        
        if (duration < 120) { // Less than 2 minutes (120 seconds)
          setPendingAudioFile({
            file: fileToProcess,
            event: event
          });
          setShowShortAudioModal(true);
          return;
        } else if (duration > 600) { // More than 10 minutes (600 seconds)
          setPendingAudioFile({
            file: fileToProcess,
            event: event
          });
          setShowLongAudioModal(true);
          return;
        }
        
        // If duration is fine, continue with processing
        processAudioFile(fileToProcess, event);
      } catch (error) {
        console.error("Error checking audio duration:", error);
        // Fall back to processing without the check
        processAudioFile(fileToProcess, event);
      }
    }
  };

  const processAudioFile = (fileToProcess, event = null) => {
    // setAudioProcessingState('idle');
    setIsLoading(true);
    setLoadingProgress(0);
    setProcessingMessage('Preparing audio for processing...');
    // ...existing code from handleAudioChange...
    setFileName(fileToProcess.name || 'Unknown File');
    setUploadedFile(fileToProcess);
    
    console.log("Processing audio file:", fileToProcess);
    
    if (!selectedImage) {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const defaultImage = canvas.toDataURL();
      setSelectedImage(defaultImage);
    }

    try {
      const startTime = performance.now();
      // ...rest of your existing audio processing code...
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        // ...existing code from reader.onload...
        try {
          await new Promise(resolve => setTimeout(() => {
            setProcessingMessage('Decoding audio data...');
            setLoadingProgress(10);
            resolve();
          }, 500));
          
          const audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 48000 
          });
          
          const audioBuffer = await audioContext.decodeAudioData(e.target.result);

          await new Promise(resolve => setTimeout(() => {
            setProcessingMessage('Initializing audio feature extraction...');
            setLoadingProgress(20);
            resolve();
          }, 500));

          let previousSignal = null;
          const features = {};
          const finalFeatures = {};
          const newIndividualBufferValues = [];
          
          FEATURES.forEach(feature => {
            features[feature.name] = [];
          });
          
          await new Promise(resolve => setTimeout(() => {
            setProcessingMessage('Extracting audio features...');
            setLoadingProgress(25);
            resolve();
          }, 400));
          
          const totalBuffers = Math.ceil(audioBuffer.length / bufferSize);
          let processedBuffers = 0;
          
          const BATCH_SIZE = Math.max(20, Math.floor(totalBuffers / 50)); // Process in batches of 20 or 2% of total, whichever is larger
          
          for (let i = 0; i < audioBuffer.length; i += bufferSize * BATCH_SIZE) {
            const batchEnd = Math.min(i + bufferSize * BATCH_SIZE, audioBuffer.length);
            
            for (let j = i; j < batchEnd; j += bufferSize) {
              const sampleBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                bufferSize,
                audioBuffer.sampleRate
              );
              
              for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const channelData = audioBuffer.getChannelData(channel);
                const sampleChannelData = sampleBuffer.getChannelData(channel);
                
                for (let k = 0; k < bufferSize && j + k < audioBuffer.length; k++) {
                  sampleChannelData[k] = channelData[j + k];
                }
              }
              
              const signal = new Float32Array(bufferSize);
              const channelData = sampleBuffer.getChannelData(0);
              for (let k = 0; k < bufferSize; k++) {
                signal[k] = channelData[k];
              }
              
              if (previousSignal && arraysEqual(signal, previousSignal)) {
                processedBuffers++;
                continue;
              }
              previousSignal = signal.slice();
              
              const chunkFeatures = Meyda.extract(FEATURES.map(feature => feature.name), signal);
              
              newIndividualBufferValues.push(chunkFeatures);
              
              for (const feature in chunkFeatures) {
                if (features[feature]) {
                  features[feature].push(chunkFeatures[feature]);
                }
              }
              
              processedBuffers++;
            }
            
            const progress = Math.floor((processedBuffers / totalBuffers) * 55) + 25; // Audio processing is 25-80% of total
            const percentComplete = Math.floor((processedBuffers / totalBuffers) * 100);
            
            await new Promise(resolve => setTimeout(() => {
              setProcessingMessage(`Extracting audio features...`);
              setLoadingProgress(progress);
              resolve();
            }, 0));
          }
          
          setIndividualBufferValues(newIndividualBufferValues);
          console.log("newIndividualBufferValues:", newIndividualBufferValues);
          
          await new Promise(resolve => setTimeout(() => {
            setProcessingMessage('Analyzing audio features...');
            setLoadingProgress(80);
            resolve();
          }, 500));
          
          for (const feature in features) {
            let sum = 0;
            let min = Infinity;
            let max = -Infinity;
            
            const values = features[feature].filter(val => 
              !isNaN(val) && val !== null && val !== undefined
            );
            
            if (values.length > 0) {
              for (const value of values) {
                if (typeof value === 'number') {
                  sum += value;
                  min = Math.min(min, value);
                  max = Math.max(max, value);
                } else if (Array.isArray(value) && value.length > 0) {
                  const avgValue = value.reduce((a, b) => a + b, 0) / value.length;
                  sum += avgValue;
                  min = Math.min(min, ...value);
                  max = Math.max(max, ...value);
                }
              }
              
              const average = sum / values.length;
              
              finalFeatures[feature] = {
                min,
                max,
                average
              };
            } else {
              finalFeatures[feature] = {
                min: 0,
                max: 0,
                average: 0
              };
            }
          }
          
          // console.log("Energy stats:", finalFeatures.energy);
          // console.log("ZCR stats:", finalFeatures.zcr);
          // console.log("spectralKurtosis stats:", finalFeatures.spectralKurtosis);
          console.log("finalFeatures:", finalFeatures);
          
          setAudioFeatures(finalFeatures);
          
          await new Promise(resolve => setTimeout(() => {
            setProcessingMessage('Processing image...');
            setLoadingProgress(85);
            resolve();
          }, 500));
          
          let currentProgress = 85;
          const progressInterval = setInterval(() => {
            currentProgress += 1;
            if (currentProgress <= 98) {
              setLoadingProgress(currentProgress);
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(progressInterval);
            setLoadingProgress(100);
            setProcessingMessage('Complete!');
            
            setTimeout(() => {
              setIsLoading(false);
            }, 500);
            
            const endTime = performance.now();
            console.log(`Audio processing took ${endTime - startTime}ms`);
          }, 1500);
          
        } catch (error) {
          console.error("Error processing audio data:", error);
          setIsLoading(false);
        }
      };
      
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setIsLoading(false);
      };
      
      reader.readAsArrayBuffer(fileToProcess);
      
    } catch (error) {
      console.error("Error processing audio file:", error);
      setIsLoading(false);
    }
  };

  const handleConfirmShortAudio = () => {
    if (pendingAudioFile) {
      processAudioFile(pendingAudioFile.file, pendingAudioFile.event);
    }
    setShowShortAudioModal(false);
    setPendingAudioFile(null);
  };

  const handleCancelShortAudio = () => {
    setShowShortAudioModal(false);
    setPendingAudioFile(null);
    
    // Reset file input if it's from a file input element
    if (pendingAudioFile && pendingAudioFile.event && 
        pendingAudioFile.event.target && 
        pendingAudioFile.event.target.value) {
      pendingAudioFile.event.target.value = '';
    }
  };

  const handleConfirmLongAudio = () => {
    if (pendingAudioFile) {
      processAudioFile(pendingAudioFile.file, pendingAudioFile.event);
    }
    setShowLongAudioModal(false);
    setPendingAudioFile(null);
  };

  const handleCancelLongAudio = () => {
    setShowLongAudioModal(false);
    setPendingAudioFile(null);
    
    // Reset file input if it's from a file input element
    if (pendingAudioFile && pendingAudioFile.event && 
        pendingAudioFile.event.target && 
        pendingAudioFile.event.target.value) {
      pendingAudioFile.event.target.value = '';
    }
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
      };

      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (initialAudioFile && !uploadedFile) {
      console.log("Processing initial file from landing page:", initialAudioFile);
      setFileName(initialAudioFile.name || 'Unknown File');
      
      // Only process actual audio files, not images
      if (initialAudioFile.file && !initialAudioFile.isImage) {
        handleAudioChange(null, initialAudioFile.file);
      }
      
      setInitialAudioFile(null);
    }
  }, [initialAudioFile]);

  useEffect(() => {
    return () => {
      setSelectedImage(null);
      setProcessedImage(null);
      setInitialAudioFile(null);
    };
  }, []);

  const handleProcessAudioAgain = () => {
    if (uploadedFile) {
      if (canvasComponentRef.current && canvasComponentRef.current.setShouldRegenerateShapes) {
        canvasComponentRef.current.setShouldRegenerateShapes(true);
      }
      
      const multiplier = getScaleMultiplier(scale);
      setHorizontalResolutionValue(BASE_RESOLUTION * multiplier);
      setVerticalResolutionValue(BASE_RESOLUTION * multiplier);
      handleAudioChange(null, uploadedFile);
    } else {
      console.warn("No audio file has been uploaded yet");
    }
  };

  useEffect(() => {
    const multiplier = getScaleMultiplier(scale);
    setHorizontalResolutionValue(BASE_RESOLUTION * multiplier);
    setVerticalResolutionValue(BASE_RESOLUTION * multiplier);
  }, [scale]);

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
        handleAudioChange(null, file);
      }
      if (file.type.startsWith('image/')) {
        handleImageChange(null, file);
      }
    }
  };

  const settingsSliders = [
    {
        label: "AMOUNT",
        value: combinedThreshold,
        setValue: (value) => handleThresholdChange('amount', value),
        tooltip: "Sets the amount of pixel sorting applied. Changes lower and upper threshold at the same time. Higher values will sort more pixels, resulting in a more intense image. Lower values will sort fewer pixels, resulting in a less abstract image."
    },
    {
        label: "MIDDLE POINT",
        value: middlePoint,
        setValue: (value) => handleThresholdChange('middlePoint', value),
        tooltip: "Sets the center point for the threshold range"
    },
    {
        label: "ANGLE",
        value: angle,
        setValue: setAngle,
        maxValue: 360,
        tooltip: "The angle that the pixels are sorted in. Automatically set based on hue initially, but can be manually changed"
    },
  ];

  const advancedSettingsSliders = [
    {
        label: "LOWER THRESHOLD",
        value: minThreshold,
        setValue: handleMinThresholdChange,
        tooltip: "Sets the lower threshold for the pixel sorting. The lower you go, the more pixels will be sorted because it reduced the lower bound."
    },
    {
        label: "UPPER THRESHOLD",
        value: maxThreshold,
        setValue: handleMaxThresholdChange,
        tooltip: "Sets the upper threshold for the pixel sorting. The higher you go, the more pixels will be sorted because it increased the upper bound."
    },
  ];

  const sortModeSelectors = [ 
    {
      label: "SORT MODE",
      value: sortMode,
      setValue: setSortMode,
      options: [
          { value: 0, label: 'Brightness' },
          { value: 1, label: 'Darkness' },
          { value: 2, label: 'Hue' },
          { value: 3, label: 'Saturation' },
          { value: 4, label: 'Lightness' }
      ],
      tooltip: "Sets the method by which the pixels are sorted."
    },
    {
      label: "SCALE",
      value: scale,
      setValue: setScale,
      options: [
        { value: 0, label: '1X (2400x2400)' },
        { value: 1, label: '2X (4800x4800)' },
        { value: 2, label: '3X (7200x7200)' },
        // { value: 3, label: '4X (9600x9600)' },
      ],
      tooltip: "Sets the scale for the image. This will result in more detailed pixel sorting and a larger image. Larger scales will result in much longer processing times and potentially break the app on slower machines."
    }
  ];

  useEffect(() => {
    if (selectedImage) {
      debouncedProcessImage(selectedImage, minThreshold, maxThreshold, sortMode, angle);
    }
  }, [minThreshold, maxThreshold, selectedImage, sortMode, angle, debouncedProcessImage]);

  const checkFilenameOverflow = useCallback(() => {
    if (filenameRef.current) {
      const element = filenameRef.current;
      const isOverflowing = element.scrollWidth > element.clientWidth;
      
      // Store the scroll width as a CSS variable to use in the animation
      if (isOverflowing) {
        // Set a CSS variable with the actual scroll width needed
        element.style.setProperty('--scroll-width', `${element.scrollWidth}px`);
      } else {
        element.style.setProperty('--scroll-width', '100%');
      }
      
      setIsFilenameLong(isOverflowing);
    }
  }, []);

  useEffect(() => {
    checkFilenameOverflow();
    window.addEventListener('resize', checkFilenameOverflow);
    return () => window.removeEventListener('resize', checkFilenameOverflow);
  }, [fileName, uploadedFile, checkFilenameOverflow]);

  const tutorialMessage = getTutorialMessage();

  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
  };

  const handleOpenTutorial = () => {
    setShowTutorialModal(true);
  };

  return (
    <div className='upload-parent-parent'>
      <InfoButton 
        onClick={handleOpenTutorial} 
        isVisible={!showTutorialModal && !showShortAudioModal && !showLongAudioModal && !isLoading}
      />
      {isLoading && (
        <LoadingOverlay 
          progress={loadingProgress} 
          message={processingMessage} 
        />
      )}
      <div className='upload-parent'>
        <div className="canvas-wrapper">
          <Canvas 
            bufferSize={bufferSize}
            selectedImage={selectedImage}
            processedImage={processedImage}
            showProcessed={showProcessed}
            setSelectedImage={setSelectedImage}
            setProcessedImage={setProcessedImage}
            canvasRef={canvasRef}
            audioFeatures={audioFeatures}
            individualBufferValues={individualBufferValues}
            debouncedProcessImage={debouncedProcessImage}
            horizontalResolutionValue={horizontalResolutionValue}
            verticalResolutionValue={verticalResolutionValue}
            scale={scale}
            setAngle={setAngle}
            minThreshold={minThreshold}
            maxThreshold={maxThreshold}
            handleThresholdChange={handleThresholdChange}
            setSortMode={setSortMode}
            ref={canvasComponentRef}
          />
          <div className={`download-button upload-own-image-button ${isUploadImageHidden ? 'hidden' : ''}`} style={{ textAlign: 'left' }}>
            <div className='upload-own-image-button-tab' onClick={toggleUploadImageHide}>
              <h4 className={`upload-own-image-button-tab-icon ${isUploadImageHidden ? 'hidden' : ''}`}>˄</h4>
            </div>
            <label htmlFor="image-file-input">
              <Dropdowns dropdownName={"UPLOAD OWN IMAGE"} hasDropdown={false} />
              <div className='upload-own-image-button-plus-icon-parent'>
                <svg width="30" height="30" viewBox="0 0 50 50" className='upload-own-image-button-plus-icon'>
                  <line x1="5" y1="25" x2="45" y2="25" stroke="black" stroke-width="2"/>
                  <line x1="25" y1="5" x2="25" y2="45" stroke="black" stroke-width="2"/>
                </svg>
              </div>
            </label>
          </div>
          <input id="image-file-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}>
          </input>
          {isSettingsChanging && (
            <div className="canvas-spinner-container">
              <SpinnerOverlay isVisible={true} />
            </div>
          )}
        </div>
        {selectedImage && (
          <div className='selectors-container-parent'>
            <div className='selectors-container'>
              <div className='title-bar'>
                <h3 className='main-title'>AUDIXEL</h3>
                <label className="switch">
                    <input
                      type="checkbox"
                      checked={showProcessed}
                      onChange={(e) => setShowProcessed(e.target.checked)}
                      className='toggle-switch-input'
                    />
                  </label>
              </div>
              <div className='chosen-file'>
                {uploadedFile ? (
                  uploadedFile.type.toLowerCase().startsWith('audio') ? (
                    <p ref={filenameRef}>CHOSEN AUDIO: {uploadedFile.name}</p>
                  ) : (
                    <p ref={filenameRef}>CHOSEN IMAGE: {uploadedFile.name || fileName}</p>
                  )
                ) : fileName ? (
                  initialAudioFile && initialAudioFile.isImage ? 
                    <p ref={filenameRef}>CHOSEN IMAGE: {fileName}</p> 
                    : 
                    <p ref={filenameRef}>CHOSEN AUDIO: {fileName}</p>
                ) : selectedImage ? (
                  <p>CHOSEN IMAGE</p>
                ) : (
                  <p>No file chosen</p>
                )}
              </div>
              <Dropdowns 
                dropdownName="SETTINGS"
                sliders={settingsSliders}
                hasDropdown={true}
              />
              <Dropdowns 
                dropdownName="ADVANCED SETTINGS"
                sliders={advancedSettingsSliders}
                selectors={sortModeSelectors}
                hasDropdown={true}
              />
              <div className={`audio-upload-block home-page-upload-block ${isDragging ? 'dragging' : ''}`} 
                style={{marginTop: "auto"}}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}>
                <label htmlFor="sound-file" className='file-input-label'>
                  <div className="upload-text home-page-upload-text">
                    <div className='image-upload-text-main-parent'>
                      <p className='image-upload-text'>SELECT OR DRAG NEW AUDIO FILE</p>
                      <p className='image-upload-text'>(.wav, .mp3, .ogg)</p>
                    </div>
                  </div>
                </label>
              </div>
              <input 
                id="sound-file" 
                accept="audio/*" 
                type="file" 
                onChange={handleAudioChange}
                value=""
                style={{ display: 'none' }}
                ref={(element) => {
                  if (element) {
                    element.value = '';
                  }
                }}
              />
              <div className='download-button' onClick={handleProcessAudioAgain}>                
                <Dropdowns dropdownName={"PROCESS AUDIO AGAIN"} hasDropdown={false} />
              </div>
              <div className='download-button' onClick={downloadImage}>                
                <Dropdowns dropdownName={"DOWNLOAD IMAGE"} hasDropdown={false} />
              </div>
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <Modal
        isOpen={showShortAudioModal}
        onClose={handleCancelShortAudio}
        onConfirm={handleConfirmShortAudio}
        title="Short Audio File"
        message="The audio file you've selected is less than 2 minutes long. Short audio files may not produce effective results. Would you like to continue anyway?"
      />
      <Modal
        isOpen={showLongAudioModal}
        onClose={handleCancelLongAudio}
        onConfirm={handleConfirmLongAudio}
        title="Long Audio File"
        message="The audio file you've selected is over 10 minutes long. Processing might take longer. Would you like to continue anyway?"
      />
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

export default Home;