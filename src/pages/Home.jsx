import React, { useState, useRef, useEffect } from 'react';
import "./Home.css";
import FFT from 'fft.js'; // Import the FFT library
import Dropdowns from '../components/Dropdowns/Dropdowns';

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const canvasRef = useRef(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [uploadedSound, setUploadedSound] = useState(false);
  const [minThreshold, setMinThreshold] = useState(40);
  const [maxThreshold, setMaxThreshold] = useState(170);
  const [sortMode, setSortMode] = useState(0); // 0 = brightness, 1 = darkness
  const [sortDirection, setSortDirection] = useState('horizontal'); // 'horizontal' or 'vertical'
  const [audioFileUrl, setAudioFileUrl] = useState(null); // Store audio file URL
  const [showProcessed, setShowProcessed] = useState(true);
  const [audioFeatures, setAudioFeatures] = useState({
    average: 0,
    peak: 0,
    lowFreq: 0,
    midFreq: 0,
    highFreq: 0
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioContext, setAudioContext] = useState(null);
  const audioRef = useRef(null);
  const visualizerRef = useRef(null); // Add reference for the visualizer canvas

  // Update conversion function to handle zero or very low magnitudes
  const magnitudeToDB = (magnitude, reference) => {
    // Ensure reference is not zero to avoid division by zero
    if (reference === 0) reference = 1e-10;
    
    // Calculate the magnitude ratio
    const ratio = magnitude / reference;
    
    // Set a minimum ratio to prevent Math.log10 from receiving zero or negative values
    const minRatio = 1e-10;
    const safeRatio = Math.max(ratio, minRatio);
    
    // Convert magnitude to dB
    const db = 20 * Math.log10(safeRatio);
    
    return db;
  };

  useEffect(() => {
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        processImage(img, minThreshold, maxThreshold, sortMode, sortDirection);
      };
    }
  }, [minThreshold, maxThreshold, selectedImage, sortMode, sortDirection]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        console.log("event", event)
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          setSelectedImage(event.target.result);
          processImage(img, minThreshold, maxThreshold, sortMode, sortDirection);
        };
      };

      reader.readAsDataURL(file);
    }
  };

  // Frequency ranges in Hz
  const FREQUENCY_RANGES = {
    LOW: {
      MIN: 20,    // Sub-bass to bass (20Hz - 250Hz)
      MAX: 250
    },
    MID: {
      MIN: 250,   // Low-mids to upper-mids (250Hz - 4000Hz)
      MAX: 4000
    },
    HIGH: {
      MIN: 4000,  // Presence to brilliance (4000Hz - 20000Hz)
      MAX: 20000
    }
  };

  const analyzeFullAudio = async (file) => {
    console.log('Starting offline audio analysis...');
    setIsAnalyzing(true);
  
    try {
      console.log('Reading array buffer...');
      const arrayBuffer = await file.arrayBuffer();
      
      console.log('Creating audio context...');
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(audioContext);
      
      console.log('Decoding audio data...');
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer).catch(error => {
        console.error('Failed to decode audio:', error);
        throw error;
      });
      
      console.log('Audio decoded, getting channel data...');
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const bufferLength = 2048;
      const totalChunks = Math.ceil(channelData.length / bufferLength);
      
      console.log(`Processing ${totalChunks} chunks at ${sampleRate}Hz...`);
      
      const allValues = {
        averages: [],
        peaks: [],
        lowFreq: [],
        midFreq: [],
        highFreq: []
      };
  
      // Frequency ranges in Hz
      const FREQUENCY_RANGES = {
        LOW: {
          MIN: 20,    // Sub-bass to bass (20Hz - 250Hz)
          MAX: 250
        },
        MID: {
          MIN: 250,   // Low-mids to upper-mids (250Hz - 4000Hz)
          MAX: 4000
        },
        HIGH: {
          MIN: 4000,  // Presence to brilliance (4000Hz - 20000Hz)
          MAX: 20000
        }
      };
  
      // Helper to convert Hz to FFT bin index
      const freqToBin = (freq) => Math.floor(freq / (sampleRate / 2) * (bufferLength / 2));
  
      // Calculate bin ranges
      const binRanges = {
        low: {
          start: freqToBin(FREQUENCY_RANGES.LOW.MIN),
          end: freqToBin(FREQUENCY_RANGES.LOW.MAX)
        },
        mid: {
          start: freqToBin(FREQUENCY_RANGES.MID.MIN),
          end: freqToBin(FREQUENCY_RANGES.MID.MAX)
        },
        high: {
          start: freqToBin(FREQUENCY_RANGES.HIGH.MIN),
          end: freqToBin(FREQUENCY_RANGES.HIGH.MAX)
        }
      };
  
      // Process chunks with error handling
      for (let i = 0; i < totalChunks; i++) {
        try {
          const chunk = channelData.slice(i * bufferLength, (i + 1) * bufferLength);
          const offlineCtx = new OfflineAudioContext(1, bufferLength, sampleRate);
          const source = offlineCtx.createBufferSource();
          const analyzer = offlineCtx.createAnalyser();
          
          analyzer.fftSize = 2048;
          
          const dataArray = new Float32Array(analyzer.frequencyBinCount);
          
          const tempBuffer = offlineCtx.createBuffer(1, chunk.length, sampleRate);
          tempBuffer.copyToChannel(chunk, 0);
          
          source.buffer = tempBuffer;
          source.connect(analyzer);
          analyzer.connect(offlineCtx.destination);
          
          source.start();
          await offlineCtx.startRendering().catch(error => {
            console.error(`Failed to render chunk ${i}:`, error);
            throw error;
          });
          
          analyzer.getFloatFrequencyData(dataArray);
          
          // Replace map with a loop to convert dB to linear amplitudes
          const linearDataArray = new Float32Array(dataArray.length);
          for (let j = 0; j < dataArray.length; j++) {
            linearDataArray[j] = Math.pow(10, dataArray[j] / 20);
          }
          
          // Process frequency data in linear scale
          const average = linearDataArray.reduce((a, b) => a + b, 0) / linearDataArray.length;
          const peak = Math.max(...linearDataArray);
  
          // Calculate frequency band averages
          const lowFreqValues = linearDataArray.slice(binRanges.low.start, binRanges.low.end);
          const midFreqValues = linearDataArray.slice(binRanges.mid.start, binRanges.mid.end);
          const highFreqValues = linearDataArray.slice(binRanges.high.start, binRanges.high.end);
  
          const lowFreq = lowFreqValues.reduce((a, b) => a + b, 0) / lowFreqValues.length;
          const midFreq = midFreqValues.reduce((a, b) => a + b, 0) / midFreqValues.length;
          const highFreq = highFreqValues.reduce((a, b) => a + b, 0) / highFreqValues.length;
          
          allValues.averages.push(average);
          allValues.peaks.push(peak);
          allValues.lowFreq.push(lowFreq);
          allValues.midFreq.push(midFreq);
          allValues.highFreq.push(highFreq);
          
          console.log("allValues", allValues)

          setProgress(Math.round((i / totalChunks) * 100));
          
        } catch (chunkError) {
          console.error(`Error processing chunk ${i}:`, chunkError);
          continue; // Skip failed chunk
        }
      }
  
      return {
        average: (allValues.averages.reduce((a, b) => a + b, 0) / allValues.averages.length),
        peak: (allValues.peaks.reduce((a, b) => a + b, 0) / allValues.peaks.length),
        lowFreq: (allValues.lowFreq.reduce((a, b) => a + b, 0) / allValues.lowFreq.length),
        midFreq: (allValues.midFreq.reduce((a, b) => a + b, 0) / allValues.midFreq.length),
        highFreq: (allValues.highFreq.reduce((a, b) => a + b, 0) / allValues.highFreq.length)
      };
  
    } catch (error) {
      console.error('Offline analysis failed:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const setupVisualizer = (audioUrl) => {
    const audio = new Audio(audioUrl);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
  
    analyser.fftSize = 4096; // Increased FFT size for better frequency resolution
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = visualizerRef.current;
    const canvasCtx = canvas.getContext('2d');
  
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
  
    const minFrequency = 20;
    const maxFrequency = 20000;
    const sampleRate = ctx.sampleRate;
    const freqPerBin = sampleRate / analyser.fftSize;
    const startBin = Math.floor(minFrequency / freqPerBin);
    const endBin = Math.min(Math.floor(maxFrequency / freqPerBin), bufferLength);
  
    // New: Define number of logarithmic bars
    const numberOfBars = 60;
    const logMin = Math.log10(minFrequency);
    const logMax = Math.log10(maxFrequency);
    const logStep = (logMax - logMin) / numberOfBars;
    const frequencies = Array.from({ length: numberOfBars }, (_, i) => Math.pow(10, logMin + i * logStep));
  
    // New: Map each frequency to its corresponding FFT bin
    const binIndices = frequencies.map(freq => Math.floor(freq / freqPerBin));
  
    const draw = () => {
      requestAnimationFrame(draw);
  
      analyser.getByteFrequencyData(dataArray);
  
      canvasCtx.fillStyle = '#000';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  
      // New: Calculate bar width based on logarithmic bars
      const barWidth = WIDTH / numberOfBars;
  
      frequencies.forEach((freq, i) => {
        const bin = binIndices[i];
        const barHeight = dataArray[bin];
  
        // Adjust bar height if bin index is out of range
        const safeBarHeight = bin < bufferLength ? barHeight : 0;
  
        canvasCtx.fillStyle = `rgb(${safeBarHeight + 100}, 50, 50)`;
        canvasCtx.fillRect(i * barWidth, HEIGHT - safeBarHeight / 2, barWidth - 2, safeBarHeight / 2);
      });
    };
  
    src.connect(analyser);
    analyser.connect(ctx.destination);
  
    draw();
    audio.play();
  };

  const handleAudioChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const averages = await analyzeFullAudio(file);
      setAudioFeatures(averages);

      console.log("averages", averages)
      
      // Create URL for playback after analysis
      const url = URL.createObjectURL(file);
      setAudioFileUrl(url);
      setUploadedSound(true);

      // Set up audio visualization
      setupVisualizer(url);
    } catch (error) {
      console.error('Audio processing failed:', error);
    }
  };

  useEffect(() => {
    // Cleanup audio context when component unmounts
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  const processImage = async (image, minThreshold, maxThreshold, sortMode, sortDirection) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = new Uint8ClampedArray(imageData.data);

    const workerBlob = new Blob([`
      self.onmessage = function(e) {
        const { data, width, height, sortDirection, minThreshold, maxThreshold, sortMode } = e.data;
        
        const processChunk = (data, width, height) => {
          const pixels = new Uint8ClampedArray(data);
          
          const meetsThreshold = (i) => {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const value = (r + g + b) / 3; // Simplified since we only need this for thresholding
            return value >= minThreshold && value <= maxThreshold;
          };

          const getSortValue = (i) => {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            return sortMode === 0 ? (r + g + b) : -(r + g + b);
          };

          if (sortDirection === 'horizontal') {
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
                  pixelsToSort.sort((a, b) => a.sortValue - b.sortValue);

                  for (let j = 0; j < pixelsToSort.length; j++) {
                    const targetI = (y * width + (startX + j)) * 4;
                    pixels[targetI] = pixelsToSort[j].r;
                    pixels[targetI + 1] = pixelsToSort[j].g;
                    pixels[targetI + 2] = pixelsToSort[j].b;
                    pixels[targetI + 3] = pixelsToSort[j].a;
                  }
                  isInSortRange = false;
                }
              }
            }
          } else if (sortDirection === 'vertical') {
            for (let x = 0; x < width; x++) {
              let startY = 0;
              let isInSortRange = false;
              let pixelsToSort = [];

              for (let y = 0; y < height; y++) {
                const i = (y * width + x) * 4;
                const shouldSort = meetsThreshold(i);

                if (shouldSort && !isInSortRange) {
                  startY = y;
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

                if ((!shouldSort || y === height - 1) && isInSortRange) {
                  pixelsToSort.sort((a, b) => a.sortValue - b.sortValue);

                  for (let j = 0; j < pixelsToSort.length; j++) {
                    const targetI = ((startY + j) * width + x) * 4;
                    pixels[targetI] = pixelsToSort[j].r;
                    pixels[targetI + 1] = pixelsToSort[j].g;
                    pixels[targetI + 2] = pixelsToSort[j].b;
                    pixels[targetI + 3] = pixelsToSort[j].a;
                  }
                  isInSortRange = false;
                }
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

    if (sortDirection === 'horizontal') {
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
            sortDirection,
            minThreshold,
            maxThreshold,
            sortMode
          });
        }));
      }
    } else { // vertical sorting
      const chunkWidth = Math.ceil(canvas.width / workerCount);
      
      for (let i = 0; i < workerCount; i++) {
        const worker = new Worker(workerUrl);
        const startX = i * chunkWidth;
        const endX = Math.min(startX + chunkWidth, canvas.width);
        const chunk = new Uint8ClampedArray(canvas.height * (endX - startX) * 4);
        
        // Extract vertical strip of pixels
        for (let y = 0; y < canvas.height; y++) {
          for (let x = startX; x < endX; x++) {
            const sourceIndex = (y * canvas.width + x) * 4;
            const targetIndex = (y * (endX - startX) + (x - startX)) * 4;
            chunk[targetIndex] = data[sourceIndex];
            chunk[targetIndex + 1] = data[sourceIndex + 1];
            chunk[targetIndex + 2] = data[sourceIndex + 2];
            chunk[targetIndex + 3] = data[sourceIndex + 3];
          }
        }
        
        workers.push(new Promise(resolve => {
          worker.onmessage = (e) => {
            // Copy processed data back to main array
            const processedChunk = e.data;
            for (let y = 0; y < canvas.height; y++) {
              for (let x = startX; x < endX; x++) {
                const sourceIndex = (y * (endX - startX) + (x - startX)) * 4;
                const targetIndex = (y * canvas.width + x) * 4;
                data[targetIndex] = processedChunk[sourceIndex];
                data[targetIndex + 1] = processedChunk[sourceIndex + 1];
                data[targetIndex + 2] = processedChunk[sourceIndex + 2];
                data[targetIndex + 3] = processedChunk[sourceIndex + 3];
              }
            }
            worker.terminate();
            resolve();
          };
          
          worker.postMessage({
            data: chunk,
            width: endX - startX,
            height: canvas.height,
            sortDirection,
            minThreshold,
            maxThreshold,
            sortMode
          });
        }));
      }
    }

    await Promise.all(workers);
    URL.revokeObjectURL(workerUrl);
    
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
    setProcessedImage(canvas.toDataURL());
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'processed-image.png';
      link.click();
    }, 'image/png');
  };

  const presetSelector = (preset) => {
    switch (preset) {
      case 'default':
        setMinThreshold(27);
        setMaxThreshold(173);
        setSortMode(0);
        setSortDirection('horizontal');
        break;
      case 'techno':
        setMinThreshold(176);
        setMaxThreshold(200);
        setSortMode(0);
        setSortDirection('vertical');
        break;
      case 'dnb':
        setMinThreshold(80);
        setMaxThreshold(90);
        setSortMode(0);
        setSortDirection('horizontal');
        break;
      case 'footwork':
        setMinThreshold(0);
        setMaxThreshold(170);
        setSortMode(0); // Changed from 3 to 0 since dark mode was removed
        setSortDirection('vertical');
        break;
      default:
        break;
    }
  }

  console.log("audioFeatures", audioFeatures)

  useEffect(() => {
    if (audioFeatures.lowFreq > audioFeatures.midFreq && audioFeatures.lowFreq > audioFeatures.highFreq) {
      setSortDirection('vertical');
      setMinThreshold(30);
      setMaxThreshold(170);
      setSortMode(1);
    }
    else if (audioFeatures.midFreq > audioFeatures.lowFreq && audioFeatures.midFreq > audioFeatures.highFreq) {
      setSortDirection('horizontal');
      setMinThreshold(50);
      setMaxThreshold(150);
      setSortMode(0);
    }
    else if (audioFeatures.highFreq > audioFeatures.lowFreq && audioFeatures.highFreq > audioFeatures.midFreq) {
      setSortDirection('vertical');
      setMinThreshold(20);
      setMaxThreshold(120);
      setSortMode(1);
    }
  }, [audioFeatures]);

  return (
    <div className='upload-parent-parent'>
      <div className='upload-parent'>
        {selectedImage && (
          <div className='presets-container'>
            <div className='presets-window'>
              <h3>Presets:</h3>
              <h4 onClick={() => presetSelector('default')}>Default (art)</h4>
              <h4 onClick={() => presetSelector('techno')}>Techno (flower)</h4>
              <h4 onClick={() => presetSelector('dnb')}>DnB (badminton)</h4>
              <h4 onClick={() => presetSelector('footwork')}>Footwork</h4>
            </div>
            <div>
              <h3>Current Preset:</h3>
              <p>Min Threshold: {minThreshold}</p>
              <p>Max Threshold: {maxThreshold}</p>
              <p>Sort Mode: {sortMode === 0 ? 'Brightness' : 'Darkness'}</p>
              <p>Sort Direction: {sortDirection}</p>
            </div>
            <div>
              <h4></h4>
            </div>
          </div>
        )}
        <div className="image-upload">
          <label htmlFor="file-input">
            <div className="upload-block">
              {selectedImage ? (
                <img
                  src={showProcessed ? processedImage : selectedImage}
                  alt={showProcessed ? "Processed" : "Original"}
                  className="preview-image"
                />
              ) : (
                <div className="upload-text">
                  <p>Click here to upload an image</p>
                </div>
              )}
            </div>
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
        </div>

        {selectedImage && (
          <div className='selectors-container'>
            <h3>Advanced Controls:</h3>
            <div className="toggle-switch">
              <h4>Show Processed Image:</h4>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={showProcessed}
                  onChange={(e) => setShowProcessed(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="threshold-slider">
              <h4>Min Threshold:</h4>
              <div className="threshold-control">
                <input
                  id="min-threshold-slider"
                  type="range"
                  min="0"
                  max="255"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(Number(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={minThreshold}
                  onChange={(e) => {
                    const value = Math.min(255, Math.max(0, Number(e.target.value)));
                    setMinThreshold(value);
                  }}
                  className="threshold-number"
                />
              </div>
              
              <h4>Max Threshold:</h4>
              <div className="threshold-control">
                <input
                  id="max-threshold-slider"
                  type="range"
                  min="0"
                  max="255"
                  value={maxThreshold}
                  onChange={(e) => setMaxThreshold(Number(e.target.value))}
                />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={maxThreshold}
                  onChange={(e) => {
                    const value = Math.min(255, Math.max(0, Number(e.target.value)));
                    setMaxThreshold(value);
                  }}
                  className="threshold-number"
                />
              </div>
            </div>

            <div className="sort-parameter">
              <label htmlFor="sort-mode">Sort Mode: </label>
              <select
                id="sort-mode"
                value={sortMode}
                onChange={(e) => setSortMode(Number(e.target.value))}
              >
                <option value="0">Brightness</option>
                <option value="1">Darkness</option>
              </select>
            </div>

            <div className="sort-direction">
              <label htmlFor="sort-direction">Sort Direction: </label>
              <select
                id="sort-direction"
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value)}
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>

            <Dropdowns hasDropdown={true} title="Threshold" setMaxThreshold={setMaxThreshold} maxThreshold={maxThreshold} type={"slider"} />

            <div className='sound-upload'>
              <input id="sound-file" accept="audio/*" type="file" onChange={handleAudioChange} />
              <div>
                <figure>
                  <figcaption>Audio File:</figcaption>
                  {audioFileUrl ? (
                    <audio ref={audioRef} controls src={audioFileUrl}></audio>
                  ) : (
                    <p>No audio uploaded</p>
                  )}
                </figure>
                {/* {uploadedSound && (
                  <div className="audio-features">
                    <h4>Audio Analysis:</h4>
                    {isAnalyzing ? (
                      <div className="analyzing">
                        <p>Analyzing audio file...</p>
                        <div className="spinner"></div>
                      </div>
                    ) : (
                      // Update display section
                      <div className="analysis-results">
                        <p>Average: {audioFeatures.average.toFixed(2)} dB</p>
                        <p>Peak: {audioFeatures.peak.toFixed(2)} dB</p>
                        <p>Low Freq ({FREQUENCY_RANGES.LOW.MIN}Hz-{FREQUENCY_RANGES.LOW.MAX}Hz): {audioFeatures.lowFreq.toFixed(2)} dB</p>
                        <p>Mid Freq ({FREQUENCY_RANGES.MID.MIN}Hz-{FREQUENCY_RANGES.MID.MAX}Hz): {audioFeatures.midFreq.toFixed(2)} dB</p>
                        <p>High Freq ({FREQUENCY_RANGES.HIGH.MIN}Hz-{FREQUENCY_RANGES.HIGH.MAX}Hz): {audioFeatures.highFreq.toFixed(2)} dB</p>
                      </div>
                    )}
                  </div>
                )} */}
                {isAnalyzing && (
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ '--progress': `${progress}%` }}
                    />
                    <p>Analyzing: {progress}%</p>
                  </div>
                )}
                <canvas ref={visualizerRef} width="300" height="100"></canvas>
              </div>
            </div>

            {processedImage && (
              <div className="download-button">
                <button onClick={downloadImage}>Download Image</button>
              </div>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default Home;