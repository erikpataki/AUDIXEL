import React, { useState, useRef, useEffect, useCallback } from 'react';
import "./Home.css";
import Dropdowns from '../components/Dropdowns/Dropdowns';
import Meyda from "meyda";
// import Slider from '../components/Dropdowns/Slider/Slider';
import Canvas from '../components/Canvas/Canvas';
import * as realtimeBpm from 'realtime-bpm-analyzer';

const Home = ({ selectedImage, processedImage, setSelectedImage, setProcessedImage, initialAudioFile }) => {
  const [minThreshold, setMinThreshold] = useState(40);
  const [maxThreshold, setMaxThreshold] = useState(170);
  const [sortMode, setSortMode] = useState(0); // 0 = brightness, 1 = darkness, 2 = hue, 3 = saturation, 4 = lightness
  const [showProcessed, setShowProcessed] = useState(true);
  const [combinedThreshold, setCombinedThreshold] = useState(150);
  const debounceTimeoutRef = useRef(null);
  const [audioSamples, setAudioSamples] = useState([]);
  const [audioFeatures, setAudioFeatures] = useState({});
  const [middlePoint, setMiddlePoint] = useState(128);
  const [angle, setAngle] = useState(115);
  const canvasRef = useRef(null);
  const [individualBufferValues, setIndividualBufferValues] = useState([]);
  const [horizontalResolutionValue, setHorizontalResolutionValue] = useState(2000);
  const [verticalResolutionValue, setVerticalResolutionValue] = useState(2000);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [onsets, setOnsets] = useState([]);
  const [bpm, setBpm] = useState(null);
  const [pendingHorizontalResolution, setPendingHorizontalResolution] = useState(horizontalResolutionValue);
  const [pendingVerticalResolution, setPendingVerticalResolution] = useState(verticalResolutionValue);

  const debounce = (func, delay) => {
    return (...args) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        func(...args);
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

    // Recalculate minThreshold and maxThreshold based on updated values
    const newMiddlePoint = type === 'middlePoint' ? value : middlePoint;
    const newCombinedThreshold = type === 'amount' ? value : combinedThreshold;

    let minValue = newMiddlePoint - (newCombinedThreshold * 0.5);
    minValue = Math.max(0, Math.floor(minValue)); // Cap at 0

    let maxValue = newMiddlePoint + (newCombinedThreshold * (0.0029*newCombinedThreshold)); // Corrected calculation
    maxValue = Math.min(255, Math.ceil(maxValue)); // Cap at 255

    // Ensure minThreshold is not greater than maxThreshold
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
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas ref is not available.");
      return;
    }
    const ctx = canvas.getContext('2d');

    const image = new Image();
    image.src = dataUrl;
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    // Calculate radians from angle
    const radians = (angle * Math.PI) / 180;

    // Calculate new canvas dimensions based on rotation
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const newWidth = Math.ceil(image.width * cos + image.height * sin);
    const newHeight = Math.ceil(image.width * sin + image.height * cos);

    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Clear any existing transformations on the main context
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Create a temporary canvas for processing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    
    // Clear the temporary canvas
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Save the temporary context state
    tempCtx.save();
    
    // Rotate around center point and draw image
    tempCtx.translate(newWidth / 2, newHeight / 2);
    tempCtx.rotate(radians);
    tempCtx.translate(-image.width / 2, -image.height / 2);
    tempCtx.drawImage(image, 0, 0);
    
    // Get image data from the temporary canvas
    const imageData = tempCtx.getImageData(0, 0, newWidth, newHeight);
    // const data = new Uint8ClampedArray(imageData.data);

    // Create a worker blob to process image data in a separate thread for better performance. Means interface won't freeze while processing
    const workerBlob = new Blob([`
      self.onmessage = function(e) {
        const { data, width, height, minThreshold, maxThreshold, sortMode } = e.data;
        
        // Function to convert RGBA to HSL
        const rgbaToHsl = (r, g, b) => {
          r /= 255;
          g /= 255;
          b /= 255;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;

          if (max === min) {
            h = s = 0; // achromatic
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

        // Function to process a chunk of image data
        const processChunk = (data, width, height) => {
          const pixels = new Uint8ClampedArray(data);
          
          // Function to check if a pixel meets the threshold
          const meetsThreshold = (i) => {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            if (a === 0) return false; // Exclude transparent pixels
            const value = (r + g + b) / 3;
            return value >= minThreshold && value <= maxThreshold;
          };

          // Function to get the sort value of a pixel
          const getSortValue = (i) => {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const [h, s, l] = rgbaToHsl(r, g, b);
            switch (sortMode) {
              case 0: return r + g + b; // Brightness
              case 1: return -(r + g + b); // Darkness
              case 2: return h; // Hue
              case 3: return s; // Saturation
              case 4: return l; // Lightness
              default: return r + g + b; // Default to brightness
            }
          };

          // Loop through each row of pixels
          for (let y = 0; y < height; y++) {
            let startX = 0;
            let isInSortRange = false;
            let pixelsToSort = [];

            // Loop through each pixel in the row
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;
              const shouldSort = meetsThreshold(i);

              // Start collecting pixels to sort
              if (shouldSort && !isInSortRange) {
                startX = x;
                isInSortRange = true;
                pixelsToSort = [];
              }

              // Collect pixels to sort
              if (isInSortRange) {
                pixelsToSort.push({
                  r: pixels[i],
                  g: pixels[i + 1],
                  b: pixels[i + 2],
                  a: pixels[i + 3],
                  sortValue: getSortValue(i)
                });
              }

              // Sort and replace pixels when the range ends
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

            // Handle the case where the entire row is within the threshold
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

        // Process the image data and send it back to the main thread
        const processed = processChunk(data, width, height);
        self.postMessage(processed);
      };
    `], { type: 'application/javascript' });

    const workerUrl = URL.createObjectURL(workerBlob);
    const workerCount = navigator.hardwareConcurrency || 4;
    const workers = [];

    // Always perform horizontal sorting
    const chunkHeight = Math.ceil(newHeight / workerCount);
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(workerUrl);
      const startY = i * chunkHeight;
      const endY = Math.min(startY + chunkHeight, newHeight);
      
      const chunk = imageData.data.slice(startY * newWidth * 4, endY * newWidth * 4);
      
      workers.push(new Promise(resolve => {
        worker.onmessage = (e) => {
          imageData.data.set(e.data, startY * newWidth * 4);
          worker.terminate();
          resolve();
        };
        
        worker.postMessage({
          data: chunk,
          width: newWidth,
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
    
    // Restore the temporary canvas context to remove transformations
    tempCtx.restore();
    
    // Clear the main canvas and draw the processed image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Rotate the processed image back to original orientation
    const rotatedBackCanvas = document.createElement('canvas');
    const rotatedBackCtx = rotatedBackCanvas.getContext('2d');
    
    // Set rotated back canvas size to original image dimensions
    rotatedBackCanvas.width = image.width;
    rotatedBackCanvas.height = image.height;
    
    // Translate and rotate back
    rotatedBackCtx.translate(rotatedBackCanvas.width / 2, rotatedBackCanvas.height / 2);
    rotatedBackCtx.rotate(-radians);
    rotatedBackCtx.translate(-newWidth / 2, -newHeight / 2);
    
    // Draw the processed image onto the rotated back canvas
    rotatedBackCtx.drawImage(canvas, 0, 0);
    
    // Update the processed image with the rotated back image
    const rotatedBackDataURL = rotatedBackCanvas.toDataURL();
    setProcessedImage(rotatedBackDataURL);
  };

  // Download processed image
  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas ref is not available.");
      return;
    }

    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      // Create a temporary canvas for the final rotated image
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');

      // Set final canvas size to original image dimensions
      finalCanvas.width = img.width;
      finalCanvas.height = img.height;

      // Calculate radians from angle
      const radians = (angle * Math.PI) / 180;

      // Translate and rotate back to original orientation
      finalCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
      finalCtx.rotate(-radians);

      // Translate back to the top-left corner for drawing
      finalCtx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw the processed image onto the final canvas
      finalCtx.drawImage(canvas, 0, 0);

      // Use toBlob on the final canvas
      finalCanvas.toBlob((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const downloadFilename = uploadedFile 
        ? `${uploadedFile.name.replace(/\.[^/.]+$/, "")}-album-cover.png` 
        : `AUDIXEL-album-cover.png`;
        link.download = downloadFilename;
        link.click();

        // Clean up the object URL after download
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    };
  };

  // Define the features to extract with their respective options
  const FEATURES = [
    // Meyda features
    // { name: "spectralFlatness", average: true, min: true, max: true }, // Useless
    { name: "spectralCentroid", average: true, min: true, max: true },
    { name: "energy", average: true, min: true, max: true },
    // { name: "rms", average: true, min: true, max: true }, // Energy but more unpredictable
    // { name: "loudness", average: true, min: true, max: true }, // Confusing result that doesn't seem to work well with the way I have things set up
    { name: "spectralKurtosis", average: true, min: true, max: true }, // Doesnt work as intended
    { name: "spectralSpread", average: true, min: true, max: true },
    // { name: "rms", average: true, min: true, max: true }, // Useless
    { name: "zcr", average: true, min: true, max: true },
    // { name: "spectralFlux", average: true}, // Can't get it to work. Always gives error
    { name: "spectralRolloff", average: true, min: true, max: true },
    // { name: "powerSpectrum", average: true, min: true, max: true }, // Doesn't work, meant to be showing energy of frequencies. put in audio thats EQ'd to be between 4000hz - 20000hz and its saying it has high bass frequencies at the lowest frequencies (0Hz - 93Hz
    // { name: "spectralCrest", average: true, min: true, max: true }, // Doesnt correlate - very similar for each song
    { name: "chroma", average: true, min: true, max: true },
    { name: "mfcc", average: true, min: true, max: true },
    // { name: "spectralSlope", average: true, min: true, max: true }, //Broken
    // { name: "spectralSkewness", average: true, min: true, max: true }, // Unclear, doesn't correlate properly
    // { name: "perceptualSpread", average: true, min: true, max: true }, // Same for each song
  ];

  let bufferSize = 512;
  const handleAudioChange = async (e, existingFile = null) => {
    let file;
    if (existingFile) {
      // Handle file object coming from landing page
      file = existingFile.file || existingFile;
      setUploadedFile(file); // Set the uploaded file state
    } else {
      e.preventDefault();
      file = e.target.files[0];
      setUploadedFile(file);
    }
    
    console.log("sound-file", file);
    
    if (file) {
      // Create a default image if no image is selected
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

        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 48000 // Force 48kHz sample rate
        });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        let previousSignal = null;
        const features = {};
        const finalFeatures = {};
        // Reset individualBufferValues for the new audio file
        const newIndividualBufferValues = [];

        const reader = new FileReader();
        reader.addEventListener('load', () => {
          // The file is uploaded, now we decode it
          audioContext.decodeAudioData(reader.result, audioBuffer => {
            // The result is passed to the analyzer
            realtimeBpm.analyzeFullBuffer(audioBuffer).then(topCandidates => {
              // Do something with the BPM
              console.log('topCandidates', topCandidates);
            });
          });
        });
        reader.readAsArrayBuffer(file);
        
        // Initialize arrays for each feature
        FEATURES.forEach(feature => {
          if (feature.average) {
            features[feature.name] = [];
          }
          if (feature.min || feature.max) {
            finalFeatures[feature.name] = {};
          }
        });

        // Get the audio data
        const channelData = audioBuffer.getChannelData(0);
        const totalBuffers = Math.floor(channelData.length / bufferSize);

        for (let i = 0; i < totalBuffers; i++) {
          const buffer = channelData.slice(i * bufferSize, (i + 1) * bufferSize);
          const bufferFeatures = {};

          FEATURES.forEach(feature => {
            try {
              let value;
              // if (feature.name === "spectralFlux") {
              //   if (previousSignal) {
              //     // Get the spectrum for both current and previous signals
              //     const currentSpectrum = Meyda.extract("amplitudeSpectrum", buffer);
              //     const previousSpectrum = Meyda.extract("amplitudeSpectrum", previousSignal);
                  
              //     // Calculate the difference between spectrums
              //     let flux = 0;
              //     for (let j = 0; j < currentSpectrum.length; j++) {
              //       const diff = currentSpectrum[j] - previousSpectrum[j];
              //       flux += (diff + Math.abs(diff)) / 2;
              //     }
              //     value = flux;
              //   } else {
              //     value = 0;
              //   }
              //   previousSignal = buffer;
              // } else {
                value = Meyda.extract(feature.name, buffer);
              // }

              // Store the value in bufferFeatures
              bufferFeatures[feature.name] = value;

              // Update running calculations for the feature
              if (feature.average) {
                features[feature.name].push(value);
              }

              // Update min/max if needed
              if (feature.min || feature.max) {
                if (feature.min && (!finalFeatures[feature.name].min || value < finalFeatures[feature.name].min)) {
                  finalFeatures[feature.name].min = value;
                }
                if (feature.max && (!finalFeatures[feature.name].max || value > finalFeatures[feature.name].max)) {
                  finalFeatures[feature.name].max = value;
                }
              }

            } catch (error) {
              console.error(`Error processing ${feature.name}:`, error);
            }
          });

          // Add the current buffer's features to the array
          newIndividualBufferValues.push(bufferFeatures);
        }

        // Handle any remaining samples by padding with zeros to reach bufferSize
        if (channelData.length % bufferSize > 0) {
          const remainingSamples = channelData.length % bufferSize;
          const buffer = new Float32Array(bufferSize);
          buffer.set(channelData.subarray(channelData.length - remainingSamples));
          const bufferFeatures = {};

          FEATURES.forEach(feature => {
            const value = Meyda.extract(feature.name, buffer);
            bufferFeatures[feature.name] = value;

            if (feature.average) {
              // Weight the value according to the proportion of valid samples
              const validProportion = remainingSamples / bufferSize;
              features[feature.name].push(value * validProportion);
            } else {
              features[feature.name] += value * (remainingSamples / bufferSize);
            }

            // Update min for remaining samples:
            if (feature.min && value < finalFeatures[feature.name].min) {
              finalFeatures[feature.name].min = value;
              // console.log(`Buffer ${totalBuffers}: new min for ${feature.name} = ${value}`);
            }

            // Update max for remaining samples:
            if (feature.max && value > finalFeatures[feature.name].max) {
              finalFeatures[feature.name].max = value;
              // console.log(`Buffer ${totalBuffers}: new max for ${feature.name} = ${value}`);
            }
          });

          newIndividualBufferValues.push(bufferFeatures);
        }

        // When computing final averages
        FEATURES.forEach(feature => {
          if (feature.average) {
            const validValues = features[feature.name].filter(val => 
              val !== null && 
              val !== undefined && 
              !Number.isNaN(val)
            );
            
            if (validValues.length > 0) {
              // Calculate how many samples to skip at start and end (1/20th each)
              const skipCount = Math.floor(validValues.length / 20);
              
              // Get the middle 90% of values (skip first and last 5%)
              const trimmedValues = validValues.slice(skipCount, -skipCount);
              
              if (trimmedValues.length > 0) {
                const sum = trimmedValues.reduce((acc, val) => acc + val, 0);
                finalFeatures[feature.name].average = sum / trimmedValues.length;
                // if (feature.name === "zcr") {
                //   setAverageZCR(finalFeatures[feature.name].average);
                // }
              } else {
                console.warn(`No valid values remaining after trimming for ${feature.name}`);
                finalFeatures[feature.name].average = 0;
              }
            } else {
              console.warn(`No valid values for ${feature.name} average calculation`);
              finalFeatures[feature.name].average = 0;
            }
          }
        });

        const endTime = performance.now(); // End timer
        const elapsedTime = (endTime - startTime) / 1000; // Convert to seconds
        console.log(`Audio feature extraction took ${elapsedTime.toFixed(2)} seconds.`); // Log elapsed time in seconds

        console.log("Final Features:", finalFeatures);
        console.log("Individual Buffer Values:", newIndividualBufferValues); // Log individual buffer values
        
        setAudioSamples(channelData);
        setAudioFeatures(finalFeatures); // Set audioFeatures state
        setIndividualBufferValues(newIndividualBufferValues); // Set the new array

        console.log("Audio File Sample Rate:", audioBuffer.sampleRate);
        console.log("Audio Context Sample Rate:", audioContext.sampleRate);

      } catch (error) {
        console.error("Error processing audio file:", error);
      }
    }
  };

  // Add useEffect to handle initial audio file
  useEffect(() => {
    if (initialAudioFile) {
      handleAudioChange(null, initialAudioFile);
    }
  }, [initialAudioFile]);

  // Define sliders as an array of objects
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
    // Add more sliders here as needed
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

  const sortModeSelector = {
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
  };

  // Function to handle reprocessing
  const reprocessAudio = () => {
    if (uploadedFile) {
      setHorizontalResolutionValue(pendingHorizontalResolution);
      setVerticalResolutionValue(pendingVerticalResolution);
      handleAudioChange(null, uploadedFile);
    } else {
      console.warn("No audio file has been uploaded yet");
    }
  };

  useEffect(() => {
    if (selectedImage) {
      debouncedProcessImage(selectedImage, minThreshold, maxThreshold, sortMode, angle);
    }
  }, [minThreshold, maxThreshold, selectedImage, sortMode, angle, debouncedProcessImage]);

  return (
    <div className='upload-parent-parent'>
      <div className='upload-parent'>
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
          setAngle={setAngle}
          minThreshold={minThreshold}
          maxThreshold={maxThreshold}
          setSortMode={setSortMode}
        />
        {selectedImage && (
          <div className='selectors-container-parent'>
            <div className='selectors-container'>
              <div className='title-bar'>
                <h3 className='main-title' onClick={() => { setSelectedImage(null); setProcessedImage(null); }}>AUDIXEL</h3>
                <label className="switch">
                    <input
                      type="checkbox"
                      checked={showProcessed}
                      onChange={(e) => setShowProcessed(e.target.checked)}
                      className='toggle-switch-input'
                    />
                  </label>
              </div>
              <Dropdowns 
                dropdownName="SETTINGS"
                sliders={settingsSliders}
                hasDropdown={true}
              />
              <Dropdowns 
                dropdownName="ADVANCED SETTINGS"
                sliders={advancedSettingsSliders}
                selectors={[sortModeSelector]}
                hasDropdown={true}
              />
              <div className='download-button' onClick={reprocessAudio}>                
                <Dropdowns dropdownName={"PROCESS AUDIO AGAIN"} hasDropdown={false} />
              </div>
              {processedImage && (
                <div className='download-button' onClick={downloadImage} >                
                  <Dropdowns dropdownName={"DOWNLOAD IMAGE"} hasDropdown={false} />
                </div>
              )}

              <input 
                id="sound-file" 
                accept="audio/*" 
                type="file" 
                onChange={handleAudioChange}
                value=""
                ref={(element) => {
                  if (element) {
                    // Create a new DataTransfer object
                    const dataTransfer = new DataTransfer();
                    
                    // If we have an uploaded file, add it to the DataTransfer object
                    if (uploadedFile) {
                      dataTransfer.items.add(uploadedFile);
                      // Set the files property of the input element
                      element.files = dataTransfer.files;
                    }
                  }
                }}
              />
              <input
                type="number"
                min="1000"
                max={4000}
                value={pendingHorizontalResolution}
                onChange={(e) => {
                  setPendingHorizontalResolution(e.target.value);
                }}
              />              
              <input
                type="number"
                min="1000"
                max={4000}
                value={pendingVerticalResolution}
                onChange={(e) => {
                  setPendingVerticalResolution(e.target.value);
                }}
              />
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      {bpm && (
        <div className="bpm-display">
          Detected BPM: {bpm}
        </div>
      )}
    </div>
  );
};

export default Home;