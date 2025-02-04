import React, { useState, useRef, useEffect, useCallback } from 'react';
import "./Home.css";
import Dropdowns from '../components/Dropdowns/Dropdowns';
import Meyda from "meyda";
import Slider from '../components/Dropdowns/Slider/Slider';
import Canvas from '../components/Canvas/Canvas';

const Home = ({ selectedImage, processedImage, setSelectedImage, setProcessedImage }) => {
  const [minThreshold, setMinThreshold] = useState(40);
  const [maxThreshold, setMaxThreshold] = useState(170);
  const [sortMode, setSortMode] = useState(0); // 0 = brightness, 1 = darkness, 2 = hue, 3 = saturation, 4 = lightness
  const [showProcessed, setShowProcessed] = useState(true);
  const [combinedThreshold, setCombinedThreshold] = useState(50);
  const debounceTimeoutRef = useRef(null);
  const [audioSamples, setAudioSamples] = useState([]);
  const [audioFeatures, setAudioFeatures] = useState({});
  const [brightness, setBrightness] = useState(128);
  const [angle, setAngle] = useState(0);
  const canvasRef = useRef(null);

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

  const debouncedProcessImage = useCallback(debounce((image, minThreshold, maxThreshold, sortMode, angle) => {
    processImage(image, minThreshold, maxThreshold, sortMode, angle);
  }, 300), []);

  useEffect(() => {
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        debouncedProcessImage(img, minThreshold, maxThreshold, sortMode, angle);
      };
    }
  }, [minThreshold, maxThreshold, selectedImage, sortMode, angle, debouncedProcessImage]);

  const processImage = async (image, minThreshold, maxThreshold, sortMode, angle) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

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
    const data = new Uint8ClampedArray(imageData.data);

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
    const chunkHeight = Math.ceil(canvas.height / workerCount);
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(workerUrl);
      const startY = i * chunkHeight;
      const endY = Math.min(startY + chunkHeight, canvas.height);
      
      const chunk = data.slice(startY * canvas.width * 4, endY * canvas.width * 4);
      
      workers.push(new Promise(resolve => {
        worker.onmessage = (e) => {
          data.set(e.data, startY * canvas.width * 4);
          worker.terminate();
          resolve();
        };
        
        worker.postMessage({
          data: chunk,
          width: canvas.width,
          height: endY - startY,
          minThreshold,
          maxThreshold,
          sortMode
        });
      }));
    }

    await Promise.all(workers);
    URL.revokeObjectURL(workerUrl);
    
    imageData.data.set(data);
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
    setProcessedImage(rotatedBackCanvas.toDataURL());
  };

  // Download processed image
  const downloadImage = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'AUDIXEL-album-cover.png';
      link.click();
    }, 'image/png');
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
    { name: "spectralFlatness", average: true },
    { name: "spectralCentroid", average: true },
    { name: "rms", average: true },
    { name: "spectralSlope", average: true }
    // Add more features here as needed
  ];

  let finalFeatures = {};
  const handleAudioChange = async (e) => {
    e.preventDefault(); // Prevent potential default behavior
    const file = e.target.files[0];
    console.log("sound-file", file);
    
    if (file) {
      try {
        const startTime = performance.now(); // Start timer

        const bufferSize = 4096;

        // Read the file as an array buffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Create an AudioContext and decode the audio data
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get the number of channels
        const numberOfChannels = audioBuffer.numberOfChannels;
        console.log("Number of Channels:", numberOfChannels);
        
        // Combine all channels by averaging their samples
        const channelDataCombined = new Float32Array(audioBuffer.length);
        for (let idx = 0; idx < audioBuffer.length; idx++) {
          let sum = 0;
          for (let i = 0; i < numberOfChannels; i++) {
            sum += audioBuffer.getChannelData(i)[idx];
          }
          channelDataCombined[idx] = sum / numberOfChannels;
        }

        // Optimized normalization: Find max amplitude using a loop
        let maxAmplitude = 0;
        for (let idx = 0; idx < channelDataCombined.length; idx++) {
          const absSample = Math.abs(channelDataCombined[idx]);
          if (absSample > maxAmplitude) {
            maxAmplitude = absSample;
          }
        }
        console.log("Max Amplitude before normalization:", maxAmplitude);

        if (maxAmplitude > 0 && maxAmplitude !== 1) {
          for (let idx = 0; idx < channelDataCombined.length; idx++) {
            channelDataCombined[idx] /= maxAmplitude;
          }
          console.log("Normalization applied: All samples scaled by maxAmplitude.");
        } else {
          console.log("No normalization needed: Max amplitude is 1.");
        }

        // Verification After Normalization
        // let verifyMax = 0;
        // for (let idx = 0; idx < channelDataCombined.length; idx++) {
        //   const absSample = Math.abs(channelDataCombined[idx]);
        //   if (absSample > verifyMax) {
        //     verifyMax = absSample;
        //   }
        // }
        // console.log("Verified Max Amplitude after normalization:", verifyMax); // Should be 1
        
        const totalBuffers = Math.floor(channelDataCombined.length / bufferSize);
        const remainingSamples = channelDataCombined.length % bufferSize;
        const features = {};
        
        // Initialize features object
        FEATURES.forEach(feature => {
          features[feature.name] = feature.average ? [] : 0;
        });

        for (let i = 0; i < totalBuffers; i++) {
          const buffer = channelDataCombined.subarray(i * bufferSize, (i + 1) * bufferSize);
          FEATURES.forEach(feature => {
            const value = Meyda.extract(feature.name, buffer, {
              bufferSize: bufferSize,
              sampleRate: audioContext.sampleRate,
            });
            if (feature.average) {
              features[feature.name].push(value);
            } else {
              features[feature.name] += value;
            }
          });
        }

        // Handle any remaining samples by padding with zeros to reach bufferSize
        if (remainingSamples > 0) {
          const buffer = new Float32Array(bufferSize);
          buffer.set(channelDataCombined.subarray(channelDataCombined.length - remainingSamples));
          FEATURES.forEach(feature => {
            const value = Meyda.extract(feature.name, buffer, {
              bufferSize: bufferSize,
              sampleRate: audioContext.sampleRate,
            });
            if (feature.average) {
              // Calculate the proportion of valid samples
              const validProportion = remainingSamples / bufferSize;
              features[feature.name].push(value * validProportion);
            } else {
              features[feature.name] += value * (remainingSamples / bufferSize);
            }
          });
        }

        // Compute final features excluding padded zeroes
        FEATURES.forEach(feature => {
          if (feature.average) {
            const sum = features[feature.name].reduce((acc, val) => acc + val, 0);
            finalFeatures[feature.name] = sum / features[feature.name].length;
          } else {
            finalFeatures[feature.name] = features[feature.name];
          }
        });

        const endTime = performance.now(); // End timer
        const elapsedTime = (endTime - startTime) / 1000; // Convert to seconds
        console.log(`Audio feature extraction took ${elapsedTime.toFixed(2)} seconds.`); // Log elapsed time in seconds

        console.log("Final Features:", finalFeatures);
        
        setAudioSamples(channelDataCombined);

      } catch (error) {
        console.error("Error processing audio file:", error);
      }
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

  return (
    <div className='upload-parent-parent'>
      <div className='upload-parent'>
        <Canvas
          selectedImage={selectedImage}
          processedImage={processedImage}
          showProcessed={showProcessed}
          setSelectedImage={setSelectedImage}
          setProcessedImage={setProcessedImage}
          canvasRef={canvasRef}
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
              <h4>Analysis results:</h4>
              <h4>{JSON.stringify(finalFeatures, null, 2)}</h4>
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default Home;