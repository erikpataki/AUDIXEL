import React, { useState, useRef, useEffect } from 'react';
import "./Home.css";

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const canvasRef = useRef(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [uploadedSound, setUploadedSound] = useState(false);
  const [minThreshold, setMinThreshold] = useState(0);
  const [maxThreshold, setMaxThreshold] = useState(128);
  const [sortMode, setSortMode] = useState(0); // 0 = white, 1 = black, 2 = bright, 3 = dark
  const [invertSelection, setInvertSelection] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
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
  const audioRef = useRef(null);
  const [audioContext, setAudioContext] = useState(null);
  const [audioSource, setAudioSource] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [progress, setProgress] = useState(0);

  // Update conversion function
  const byteToDB = (byteValue) => {
    // Convert byte (0-255) to amplitude (0-1)
    const amplitude = byteValue / 255;
    
    // Convert amplitude to dB
    if (amplitude === 0) return -Infinity;
    const db = 20 * Math.log10(amplitude);
    return db.toFixed(2);
  };

  useEffect(() => {
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        processImage(img, minThreshold, maxThreshold, sortMode, invertSelection, sortDirection);
      };
    }
  }, [minThreshold, maxThreshold, selectedImage, sortMode, invertSelection, sortDirection]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          setSelectedImage(event.target.result);
          processImage(img, minThreshold, maxThreshold, sortMode, invertSelection, sortDirection);
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
    console.log('Starting offline audio analysis...');
    setIsAnalyzing(true);
  
    try {
      console.log('Reading array buffer...');
      const arrayBuffer = await file.arrayBuffer();
      
      console.log('Creating audio context...');
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
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
          
          const tempBuffer = offlineCtx.createBuffer(1, chunk.length, sampleRate);
          tempBuffer.copyToChannel(chunk, 0);
          
          source.buffer = tempBuffer;
          source.connect(analyzer);
          analyzer.connect(offlineCtx.destination);
          
          const dataArray = new Uint8Array(analyzer.frequencyBinCount);
          
          source.start();
          await offlineCtx.startRendering().catch(error => {
            console.error(`Failed to render chunk ${i}:`, error);
            throw error;
          });
          
          analyzer.getByteFrequencyData(dataArray);
          
          // Process frequency data...
          const average = dataArray.reduce((a, b) => a + b) / analyzer.frequencyBinCount;
          const peak = Math.max(...dataArray);
          
          // Calculate frequency band averages
          const lowFreq = dataArray.slice(binRanges.low.start, binRanges.low.end)
            .reduce((a, b) => a + b) / (binRanges.low.end - binRanges.low.start);
          const midFreq = dataArray.slice(binRanges.mid.start, binRanges.mid.end)
            .reduce((a, b) => a + b) / (binRanges.mid.end - binRanges.mid.start);
          const highFreq = dataArray.slice(binRanges.high.start, binRanges.high.end)
            .reduce((a, b) => a + b) / (binRanges.high.end - binRanges.high.start);
          
          allValues.averages.push(average);
          allValues.peaks.push(peak);
          allValues.lowFreq.push(lowFreq);
          allValues.midFreq.push(midFreq);
          allValues.highFreq.push(highFreq);
          
          setProgress(Math.round((i / totalChunks) * 100));
          
        } catch (chunkError) {
          console.error(`Error processing chunk ${i}:`, chunkError);
          continue; // Skip failed chunk
        }
      }

      return {
        average: Math.floor(allValues.averages.reduce((a, b) => a + b) / allValues.averages.length),
        peak: Math.floor(allValues.peaks.reduce((a, b) => a + b) / allValues.peaks.length),
        lowFreq: Math.floor(allValues.lowFreq.reduce((a, b) => a + b) / allValues.lowFreq.length),
        midFreq: Math.floor(allValues.midFreq.reduce((a, b) => a + b) / allValues.midFreq.length),
        highFreq: Math.floor(allValues.highFreq.reduce((a, b) => a + b) / allValues.highFreq.length)
      };

    } catch (error) {
      console.error('Offline analysis failed:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Update handleAudioChange
  const handleAudioChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const averages = await analyzeFullAudio(file);
      setAudioFeatures(averages);
      
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
  }, []);

  const meetsThreshold = (r, g, b, mode) => {
    const brightness = 0.3 * r + 0.59 * g + 0.11 * b;
    const value = mode <= 1 ? (r + g + b) / 3 : brightness;
    
    // Pixels between thresholds are borders - don't sort them
    return value >= minThreshold && value <= maxThreshold;
  };

  const processImage = async (image, minThreshold, maxThreshold, sortMode, invertSelection, sortDirection) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = new Uint8ClampedArray(imageData.data);

    const workerBlob = new Blob([`
      self.onmessage = function(e) {
        const { data, width, height, sortDirection, minThreshold, maxThreshold, sortMode, invertSelection } = e.data;
        
        const processChunk = (data, width, height) => {
          const pixels = new Uint8ClampedArray(data);
          
          const meetsThreshold = (i) => {
            const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            return brightness >= minThreshold && brightness <= maxThreshold;
          };

          if (sortDirection === 'horizontal') {
            for (let y = 0; y < height; y++) {
              let startX = 0;
              let isInSortRange = false;
              let pixelsToSort = [];

              for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const isBorder = meetsThreshold(i);

                // Start collecting pixels when we exit border
                if (!isBorder && !isInSortRange) {
                  startX = x;
                  isInSortRange = true;
                  pixelsToSort = [];
                }

                // Collect pixels while outside border
                if (isInSortRange) {
                  pixelsToSort.push({
                    r: pixels[i],
                    g: pixels[i + 1],
                    b: pixels[i + 2],
                    a: pixels[i + 3],
                    brightness: (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
                  });
                }

                // Sort when we hit border again
                if ((isBorder || x === width - 1) && isInSortRange) {
                  pixelsToSort.sort((a, b) => a.brightness - b.brightness);
                  if (invertSelection) pixelsToSort.reverse();

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
    const chunkSize = Math.ceil(canvas.height / workerCount);

    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(workerUrl);
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, canvas.height);
      
      const chunk = data.slice(start * canvas.width * 4, end * canvas.width * 4);
      
      workers.push(new Promise(resolve => {
        worker.onmessage = (e) => {
          data.set(e.data, start * canvas.width * 4);
          worker.terminate();
          resolve();
        };
        
        worker.postMessage({
          data: chunk,
          width: canvas.width,
          height: end - start,
          sortDirection,
          minThreshold,
          maxThreshold,
          sortMode,
          invertSelection
        });
      }));
    }

    await Promise.all(workers);
    URL.revokeObjectURL(workerUrl);
    
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
    setProcessedImage(canvas.toDataURL());
  };

  const sortAndApplyRow = (data, y, start, end, row) => {
    row.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
    for (let i = 0; i < row.length; i++) {
      const index = (y * canvasRef.current.width + start + i) * 4;
      data[index] = row[i].r;
      data[index + 1] = row[i].g;
      data[index + 2] = row[i].b;
    }
  };

  const sortAndApplyColumn = (data, x, start, end, column) => {
    column.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
    for (let i = 0; i < column.length; i++) {
      const index = ((start + i) * canvasRef.current.width + x) * 4;
      data[index] = column[i].r;
      data[index + 1] = column[i].g;
      data[index + 2] = column[i].b;
    }
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
        setMinThreshold(87);
        setMaxThreshold(94);
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
        setSortMode(3);
        setSortDirection('vertical');
        break;
      default:
        break;
    }

  }

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
                <option value="2">Bright</option>
                <option value="3">Dark</option>
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
                        <p>Low Freq (20Hz-250Hz): {byteToDB(audioFeatures.lowFreq)} dB</p>
                        <p>Mid Freq (250Hz-4000Hz): {byteToDB(audioFeatures.midFreq)} dB</p>
                        <p>High Freq (4000Hz-20000Hz): {byteToDB(audioFeatures.highFreq)} dB</p>
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