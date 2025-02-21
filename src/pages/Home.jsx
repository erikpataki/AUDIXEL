import React, { useState, useRef, useEffect, useCallback } from 'react';
import "./Home.css";
import Dropdowns from '../components/Dropdowns/Dropdowns';
import Meyda from "meyda";
import Slider from '../components/Dropdowns/Slider/Slider';
import Canvas from '../components/Canvas/Canvas';
import * as tf from '@tensorflow/tfjs';
import { preprocess, shortenAudio } from '../audioUtils.js';
import inferenceWorker from '../inference.js?worker';

const Home = ({ selectedImage, processedImage, setSelectedImage, setProcessedImage }) => {
  const [minThreshold, setMinThreshold] = useState(40);
  const [maxThreshold, setMaxThreshold] = useState(170);
  const [sortMode, setSortMode] = useState(0); // 0 = brightness, 1 = darkness, 2 = hue, 3 = saturation, 4 = lightness
  const [showProcessed, setShowProcessed] = useState(true);
  const [combinedThreshold, setCombinedThreshold] = useState(150);
  const debounceTimeoutRef = useRef(null);
  const [audioSamples, setAudioSamples] = useState([]);
  const [audioFeatures, setAudioFeatures] = useState({});
  const [brightness, setBrightness] = useState(128);
  const [angle, setAngle] = useState(115);
  const canvasRef = useRef(null);
  const [individualBufferValues, setIndividualBufferValues] = useState([]);
  const [horizontalResolutionValue, setHorizontalResolutionValue] = useState(2000);
  const [verticalResolutionValue, setVerticalResolutionValue] = useState(2000);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [EssentiaWASM, setEssentiaWASM] = useState(null);
  const [essentia, setEssentia] = useState(null);
  const [moodModel, setMoodModel] = useState(null);
  const modelNames = [
    'mood_happy-musicnn-msd-2',
    'mood_sad-musicnn-msd-2',
    'mood_relaxed-musicnn-msd-2',
    'mood_aggressive-musicnn-msd-2',
    'danceability-musicnn-msd-2'
  ];
  const [inferenceWorkers, setInferenceWorkers] = useState({});
  const [inferenceResultPromises, setInferenceResultPromises] = useState([]);
  const [essentiaAnalysis, setEssentiaAnalysis] = useState(null);
  const [previousSpectrum, setPreviousSpectrum] = useState(null);
  const [moodPredictions, setMoodPredictions] = useState({
    happy: 0,
    sad: 0,
    relaxed: 0,
    aggressive: 0,
    danceability: 0
  });
  const [featureExtractionWorker, setFeatureExtractionWorker] = useState(null);

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  const KEEP_PERCENTAGE = 0.15;

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

  useEffect(() => {
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        debouncedProcessImage(selectedImage, minThreshold, maxThreshold, sortMode, angle);
      };
    }
  }, [minThreshold, maxThreshold, selectedImage, sortMode, angle, debouncedProcessImage]);

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
      image.onload = () => {
        resolve();
      };
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
    const workers = {};

    // Always perform horizontal sorting
    const chunkHeight = Math.ceil(newHeight / workerCount);
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(workerUrl);
      const startY = i * chunkHeight;
      const endY = Math.min(startY + chunkHeight, newHeight);
      
      const chunk = imageData.data.slice(startY * newWidth * 4, endY * newWidth * 4);
      
      workers[i] = new Promise(resolve => {
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
      });
    }

    await Promise.all(Object.values(workers));
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


// preset selection
  // const presetSelector = (preset) => {
  //   switch (preset) {
  //     case 'default':
  //       setMinThreshold(27);
  //       setMaxThreshold(173);
  //       setSortMode(0);
  //       setSortDirection('horizontal');
  //       break;
  //     case 'techno':
  //       setMinThreshold(176);
  //       setMaxThreshold(200);
  //       setSortMode(0);
  //       setSortDirection('vertical');
  //       break;
  //     case 'dnb':
  //       setMinThreshold(80);
  //       setMaxThreshold(90);
  //       setSortMode(0);
  //       setSortDirection('horizontal');
  //       break;
  //     case 'footwork':
  //       setMinThreshold(0);
  //       setMaxThreshold(170);
  //       setSortMode(0); // Changed from 3 to 0 since dark mode was removed
  //       setSortDirection('vertical');
  //       break;
  //     default:
  //       break;
  //   }
  // }

  // Preset selection based on audio features
  // useEffect(() => {
  //   if (audioFeatures.lowFreq > audioFeatures.midFreq && audioFeatures.lowFreq > audioFeatures.highFreq) {
  //     setSortDirection('vertical');
  //     setMinThreshold(30);
  //     setMaxThreshold(170);
  //     setSortMode(1);
  //   }
  //   else if (audioFeatures.midFreq > audioFeatures.lowFreq && audioFeatures.midFreq > audioFeatures.highFreq) {
  //     setSortDirection('horizontal');
  //     setMinThreshold(50);
  //     setMaxThreshold(150);
  //     setSortMode(0);
  //   }
  //   else if (audioFeatures.highFreq > audioFeatures.lowFreq && audioFeatures.highFreq > audioFeatures.midFreq) {
  //     setSortDirection('vertical');
  //     setMinThreshold(20);
  //     setMaxThreshold(120);
  //     setSortMode(1);
  //   }
  // }, [audioFeatures]);


  // Threshold slider handlers
  const handleThresholdChange = (type, value) => {
    if (type === 'amount') {
        setCombinedThreshold(value);
    } else if (type === 'brightness') {
        setBrightness(value);
    }

    // Recalculate minThreshold and maxThreshold based on updated values
    const newBrightness = type === 'brightness' ? value : brightness;
    const newCombinedThreshold = type === 'amount' ? value : combinedThreshold;

    let minValue = newBrightness - (newCombinedThreshold * 0.5);
    minValue = Math.max(0, Math.floor(minValue)); // Cap at 0

    let maxValue = newBrightness + (newCombinedThreshold * (0.0029*newCombinedThreshold)); // Corrected calculation
    maxValue = Math.min(255, Math.ceil(maxValue)); // Cap at 255

    // Ensure minThreshold is not greater than maxThreshold
    if (minValue > maxValue) {
        [minValue, maxValue] = [maxValue, minValue];
    }

    setMinThreshold(minValue);
    setMaxThreshold(maxValue);

    // Trigger image processing with updated threshold values
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        debouncedProcessImage(img, minValue, maxValue, sortMode, angle); // Use updated values
      };
    }
};

  const handleMinThresholdChange = (value) => {
    setMinThreshold(value);
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        debouncedProcessImage(img, value, maxThreshold, sortMode, angle);
      };
    }
  };

  const handleMaxThresholdChange = (value) => {
    setMaxThreshold(value);
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        debouncedProcessImage(img, minThreshold, value, sortMode, angle);
      };
    }
  };

  //FEATURE EXTRACTION
  // var signal = new Array(32).fill(0).map((element, index) => {
  //   const remainder = index % 3;
  //   if (remainder === 0) {
  //     return 1;
  //   } else if (remainder === 1) {
  //     return 0;
  //   }
  //   return -1;
  // });

  // let meydaExtractionTest = Meyda.extract("zcr", signal);

  // console.log("meydaExtractionTest", meydaExtractionTest)
  // console.log("signal", signal)

  // Define the features to extract with their respective options
  const FEATURES = [
    { name: "spectralFlatness", average: true, min: true, max: true  },
    { name: "spectralCentroid", average: true, min: true, max: true },
    { name: "energy", average: true, min: true, max: true },
    { name: "spectralKurtosis", average: true, min: true, max: true },
    { name: "spectralSpread", average: true, min: true, max: true },
    // Add more features here as needed
  ];

  let file;
  let bufferSize = 512;
  let finalFeatures = {};
  const handleAudioChange = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    
    if (file) {
      setUploadedFile(file);
      setIsProcessing(true);
      
      try {
        // Existing Meyda processing
        const audioBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
        
        const numberOfChannels = decodedAudio.numberOfChannels;
        const channelDataCombined = new Float32Array(decodedAudio.length);
        
        for (let i = 0; i < decodedAudio.length; i++) {
          let sum = 0;
          for (let channel = 0; channel < numberOfChannels; channel++) {
            sum += decodedAudio.getChannelData(channel)[i];
          }
          channelDataCombined[i] = sum / numberOfChannels;
        }

        // Keep existing Meyda feature extraction
        const bufferSize = 512;
        for (let i = 0; i < channelDataCombined.length; i += bufferSize) {
          const chunk = channelDataCombined.slice(i, i + bufferSize);
          if (chunk.length === bufferSize) {
            try {
              const features = Meyda.extract(["rms", "zcr", "energy"], chunk);
              setAudioFeatures(prev => ({
                ...prev,
                ...features
              }));
            } catch (chunkError) {
              console.error("Error processing chunk:", chunkError);
            }
          }
        }

        // New Essentia mood detection
        const preprocessedAudio = preprocess(decodedAudio);
        await audioCtx.suspend();

        let audioData = shortenAudio(preprocessedAudio, KEEP_PERCENTAGE, true);

        if (!featureExtractionWorker) {
          createFeatureExtractionWorker();
        }

        if (Object.keys(inferenceWorkers).length === 0) {
          createInferenceWorkers();
        }

        featureExtractionWorker.postMessage({
          audio: audioData.buffer
        }, [audioData.buffer]);

      } catch (error) {
        console.error("Error processing audio:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleInferenceResult = (msg) => {
    if (msg.data.predictions) {
      const mood = msg.data.name;
      const prediction = msg.data.predictions;
      
      // Update state with mood prediction
      setMoodPredictions(prev => ({
        ...prev,
        [mood]: prediction
      }));
    }
  };

  // Define sliders as an array of objects
  const settingsSliders = [
    {
        label: "AMOUNT",
        value: combinedThreshold,
        setValue: (value) => handleThresholdChange('amount', value), // Updated
    },
    {
        label: "BRIGHTNESS",
        value: brightness,
        setValue: (value) => handleThresholdChange('brightness', value), // Updated
    },
    {
        label: "ANGLE",
        value: angle,
        setValue: setAngle,
        maxValue: 360,
    },
    // Add more sliders here as needed
  ];

  const advancedSettingsSliders = [
    {
        label: "LOWER THRESHOLD",
        value: minThreshold,
        setValue: handleMinThresholdChange,
    },
    {
        label: "UPPER THRESHOLD",
        value: maxThreshold,
        setValue: handleMaxThresholdChange,
    },
    // Add more sliders here as needed
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
  };

  const createFeatureExtractionWorker = () => {
    featureExtractionWorker = new Worker('./src/featureExtraction.js');
    featureExtractionWorker.onmessage = (msg) => {
      if (msg.data.features) {
        modelNames.forEach((name) => {
          inferenceWorkers[name].postMessage({
            features: msg.data.features
          });
        });
        msg.data.features = null;
      }
      featureExtractionWorker.terminate();
    };
  };

  const createInferenceWorkers = () => {
    modelNames.forEach((name) => {
      inferenceWorkers[name] = new inferenceWorker();
      inferenceWorkers[name].postMessage({
        name: name
      });
      inferenceWorkers[name].onmessage = (msg) => {
        if (msg.data.predictions) {
          const predictions = msg.data.predictions;
          inferenceResultPromises.push(new Promise((resolve) => {
            resolve({ [name]: predictions });
          }));
          collectPredictions();
          console.log(`${name} predictions:`, predictions);
        }
      };
    });
  };

  const collectPredictions = () => {
    if (inferenceResultPromises.length === modelNames.length) {
      Promise.all(inferenceResultPromises).then((predictions) => {
        const allPredictions = {};
        Object.assign(allPredictions, ...predictions);
        console.log('All mood predictions:', allPredictions);
        setMoodPredictions(allPredictions);
        inferenceResultPromises = [];
      });
    }
  };

  useEffect(() => {
    const loadEssentia = async () => {
      try {
        if (window.EssentiaWASM) {
          console.log("Starting Essentia initialization...");
          const wasmModule = await window.EssentiaWASM();
          console.log("WASM module loaded:", wasmModule);
          
          // Check if we have the VectorFloat constructor
          if (!wasmModule.VectorFloat) {
            console.error("VectorFloat not found in WASM module:", wasmModule);
            return;
          }

          const essentiaInstance = new wasmModule.EssentiaJS(false);
          essentiaInstance.arrayToVector = wasmModule.arrayToVector;
          setEssentia(essentiaInstance);
          
          console.log("Essentia initialized successfully");
          console.log("About to create inference workers...");
          createInferenceWorkers();
          console.log("Called createInferenceWorkers");
        } else {
          console.error("EssentiaWASM not found on window object");
        }
      } catch (error) {
        console.error("Error loading Essentia:", error, error.stack);
      }
    };

    loadEssentia();
  }, []);

  useEffect(() => {
    if (Object.keys(inferenceWorkers).length > 0) {
      console.log('Inference workers created:', inferenceWorkers);
      // Test sending a message to one worker
      const testWorker = inferenceWorkers[modelNames[0]];
      if (testWorker) {
        testWorker.postMessage({ test: 'initialization' });
      }
    }
  }, [inferenceWorkers]);

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
          audioFeatures={audioFeatures} // Pass audioFeatures to Canvas
          individualBufferValues={individualBufferValues}
          debouncedProcessImage={debouncedProcessImage}
          horizontalResolutionValue={horizontalResolutionValue}
          verticalResolutionValue={verticalResolutionValue}
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
              {processedImage && (
                <div className='download-button' onClick={downloadImage} >                
                  <Dropdowns dropdownName={"DOWNLOAD IMAGE"} hasDropdown={false} />
                </div>
              )}

              <input id="sound-file" accept="audio/*" type="file" onChange={handleAudioChange}/>
              <input
                type="number"
                min="1000"
                max={4000}
                value={horizontalResolutionValue}
                onChange={(e) => {
                  setHorizontalResolutionValue(e.target.value);
                }}
                // className="slider-number"
              />              
              <input
                type="number"
                min="1000"
                max={4000}
                value={verticalResolutionValue}
                onChange={(e) => {
                  setVerticalResolutionValue(e.target.value);
                }}
                // className="slider-number"
              />
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default Home;