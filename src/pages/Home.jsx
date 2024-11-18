import React, { useState, useRef, useEffect } from 'react';
import "./Home.css";

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const canvasRef = useRef(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [uploadedSound, setUploadedSound] = useState(false);
  const [minThreshold, setMinThreshold] = useState(40);
  const [maxThreshold, setMaxThreshold] = useState(170);
  const [sortMode, setSortMode] = useState(0); // 0 = white, 1 = black (ascending/descending)
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

  // Update conversion function
  const byteToDB = (byteValue) => {
    if (audioFeatures.minDB === undefined || audioFeatures.maxDB === undefined) return 0;
    const db = (byteValue / 255) * (audioFeatures.maxDB - audioFeatures.minDB) + audioFeatures.minDB;
    return parseFloat(db.toFixed(1));
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
      MIN: 4000,  // Presence to brilliance (4kHz - 20kHz)
      MAX: 20000
    }
  };

  const analyzeFullAudio = async (file) => {
    setIsAnalyzing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
      const source = offlineCtx.createBufferSource();
      const analyzer = offlineCtx.createAnalyser();
      
      analyzer.fftSize = 32768;
      analyzer.smoothingTimeConstant = 0.8;
      
      source.buffer = audioBuffer;
      source.connect(analyzer);
      analyzer.connect(offlineCtx.destination);
      
      const frequencyData = new Float32Array(analyzer.frequencyBinCount);
      const binSize = audioContext.sampleRate / analyzer.fftSize;
      
      source.start(0);
      await offlineCtx.startRendering();
      
      analyzer.getFloatFrequencyData(frequencyData);

      // Handle -Infinity values
      for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] === -Infinity) {
          frequencyData[i] = analyzer.minDecibels;
        }
      }

      // Use FREQUENCY_RANGES constant
      const frequencyBands = {
        low: { min: FREQUENCY_RANGES.LOW.MIN, max: FREQUENCY_RANGES.LOW.MAX, values: [] },
        mid: { min: FREQUENCY_RANGES.MID.MIN, max: FREQUENCY_RANGES.MID.MAX, values: [] },
        high: { min: FREQUENCY_RANGES.HIGH.MIN, max: FREQUENCY_RANGES.HIGH.MAX, values: [] }
      };

      // Process frequency data using FREQUENCY_RANGES
      for (let i = 0; i < frequencyData.length; i++) {
        const frequency = i * binSize;
        const dB = frequencyData[i];
        const power = Math.pow(10, dB / 10); // Corrected power conversion
        
        if (frequency >= FREQUENCY_RANGES.LOW.MIN && frequency <= FREQUENCY_RANGES.HIGH.MAX) {
          if (frequency <= FREQUENCY_RANGES.LOW.MAX) {
            frequencyBands.low.values.push(power);
          } else if (frequency <= FREQUENCY_RANGES.MID.MAX) {
            frequencyBands.mid.values.push(power);
          } else if (frequency <= FREQUENCY_RANGES.HIGH.MAX) {
            frequencyBands.high.values.push(power);
          }
        }
      }

      const minDecibels = analyzer.minDecibels;

      // Calculate results and pass minDecibels
      const results = {
        lowFreq: calculateAverageDB(frequencyBands.low.values, minDecibels),
        midFreq: calculateAverageDB(frequencyBands.mid.values, minDecibels),
        highFreq: calculateAverageDB(frequencyBands.high.values, minDecibels),
        average: calculateAverageDB(
          [
            ...frequencyBands.low.values,
            ...frequencyBands.mid.values,
            ...frequencyBands.high.values,
          ],
          minDecibels
        ),
        peak: Math.max(...frequencyData),
      };

      return results;

    } catch (error) {
      console.error('Audio analysis failed:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Modify calculateAverageDB to accept minDecibels
  const calculateAverageDB = (powers, minDecibels) => {
    if (powers.length === 0) return minDecibels;
    const totalPower = powers.reduce((a, b) => a + b, 0);
    const avgPower = totalPower / powers.length;
    return 10 * Math.log10(avgPower);
  };
  
  const normalizeResults = (results) => {
    const dBValues = [results.lowFreq, results.midFreq, results.highFreq];
    const maxDB = Math.max(...dBValues);
    const minDB = Math.min(...dBValues);
  
    return {
      lowFreq: ((results.lowFreq - minDB) / (maxDB - minDB)) * 255,
      midFreq: ((results.midFreq - minDB) / (maxDB - minDB)) * 255,
      highFreq: ((results.highFreq - minDB) / (maxDB - minDB)) * 255,
      average: results.average,
      peak: results.peak,
      minDB,
      maxDB,
    };
  };

  // Helper function to calculate A-weighting for frequencies
  const calculateAWeighting = (f) => {
    const f2 = f * f;
    const f4 = f2 * f2;
    const ra = (12200 * 12200 * f4) / ((f2 + 20.6 * 20.6) * Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) * (f2 + 12200 * 12200));
    return ra;
  };

  // Helper function to get median value (more robust than mean)
  const getMedian = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  const handleAudioChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const rawResults = await analyzeFullAudio(file);
      const normalizedResults = normalizeResults(rawResults);
      setAudioFeatures(normalizedResults);
      
      // Create URL for playback after analysis
      const url = URL.createObjectURL(file);
      setAudioFileUrl(url);
      setUploadedSound(true);
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

  useEffect(() => {
    if (byteToDB(audioFeatures.lowFreq) > byteToDB(audioFeatures.midFreq) && byteToDB(audioFeatures.lowFreq) > byteToDB(audioFeatures.highFreq)) {
      setSortDirection('vertical');
      setMinThreshold(30);
      setMaxThreshold(170);
      setSortMode(1);
    }
    else if (byteToDB(audioFeatures.midFreq) > byteToDB(audioFeatures.lowFreq) && byteToDB(audioFeatures.midFreq) > byteToDB(audioFeatures.highFreq)) {
      setSortDirection('horizontal');
      setMinThreshold(50);
      setMaxThreshold(150);
      setSortMode(0);
    }
    else if (byteToDB(audioFeatures.highFreq) > byteToDB(audioFeatures.lowFreq) && byteToDB(audioFeatures.highFreq) > byteToDB(audioFeatures.midFreq)) {
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
            <h3>Presets:</h3>
            <h4 onClick={() => presetSelector('default')}>Default (art)</h4>
            <h4 onClick={() => presetSelector('techno')}>Techno (flower)</h4>
            <h4 onClick={() => presetSelector('dnb')}>DnB (badminton)</h4>
            <h4 onClick={() => presetSelector('footwork')}>Footwork</h4>
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
                <option value="0">White</option>
                <option value="1">Black</option>
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
                {uploadedSound && (
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
                        <p>Average: {byteToDB(audioFeatures.average)} dB</p>
                        <p>Peak: {byteToDB(audioFeatures.peak)} dB</p>
                        <p>Low Freq ({FREQUENCY_RANGES.LOW.MIN}Hz-{FREQUENCY_RANGES.LOW.MAX}Hz): {byteToDB(audioFeatures.lowFreq)} dB</p>
                        <p>Mid Freq ({FREQUENCY_RANGES.MID.MIN}Hz-{FREQUENCY_RANGES.MID.MAX}Hz): {byteToDB(audioFeatures.midFreq)} dB</p>
                        <p>High Freq ({FREQUENCY_RANGES.HIGH.MIN}Hz-{FREQUENCY_RANGES.HIGH.MAX}Hz): {byteToDB(audioFeatures.highFreq)} dB</p>
                      </div>
                    )}
                  </div>
                )}
                {isAnalyzing && (
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ '--progress': `${progress}%` }}
                    />
                    <p>Analyzing: {progress}%</p>
                  </div>
                )}
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