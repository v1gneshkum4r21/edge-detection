import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Upload, Download, Settings, Sliders, Image as ImageIcon, Zap, Maximize, RotateCcw, Activity } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

function App() {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [algorithm, setAlgorithm] = useState('canny');
  const [showOriginal, setShowOriginal] = useState(true);
  const [mode, setMode] = useState('upload'); // 'upload' or 'webcam'
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const requestRef = React.useRef(null);

  // Parameters
  const [params, setParams] = useState({
    threshold1: 100,
    threshold2: 200,
    ksize: 3,
    blur: false,
    blur_kernel: 5,
    grayscale: true,
    invert: false
  });
  const [histogramData, setHistogramData] = useState(null);

  // Refs for loop state to avoid stale closures
  const stateRef = React.useRef({ algorithm, params, webcamActive });
  React.useEffect(() => {
    stateRef.current = { algorithm, params, webcamActive };
  }, [algorithm, params, webcamActive]);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setOriginalImage(URL.createObjectURL(file));
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      setImageId(res.data.image_id);
      processImage(res.data.image_id, algorithm, params);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setLoading(false);
    }
  }, [algorithm, params]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    multiple: false
  });

  const processImage = async (id, algo, p) => {
    if (!id) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('algorithm', algo);
    formData.append('params', JSON.stringify(p));

    try {
      const res = await axios.post(`${API_BASE}/process/${id}`, formData, {
        responseType: 'blob'
      });

      setProcessedImage(prev => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return URL.createObjectURL(res.data);
      });

      const histRes = await axios.get(`${API_BASE}/histogram/${id}`);
      setHistogramData(histRes.data.histogram);
    } catch (err) {
      console.error("Processing failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time update with debounce (simple version)
  useEffect(() => {
    if (imageId) {
      const timeout = setTimeout(() => {
        processImage(imageId, algorithm, params);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [params, algorithm, imageId]);

  const handleParamChange = (name, value) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `edge_detected_${algorithm}.png`;
    link.click();
  };

  // Webcam Logic
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setWebcamActive(true);
      }
    } catch (err) {
      console.error("Webcam failed", err);
      alert("Could not access webcam. Please ensure you have given permission and are using HTTPS or localhost.");
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
    if (requestRef.current) {
      clearTimeout(requestRef.current);
      cancelAnimationFrame(requestRef.current);
    }
  };

  const processFrame = async () => {
    if (!stateRef.current.webcamActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video is playing and has data
    if (video.paused || video.ended || video.readyState < 2) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');

    // Match dimensions
    if (video.videoWidth > 0 && (canvas.width !== video.videoWidth)) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    if (canvas.width === 0) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob || !stateRef.current.webcamActive) return;

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      formData.append('algorithm', stateRef.current.algorithm);
      formData.append('params', JSON.stringify(stateRef.current.params));

      try {
        const res = await axios.post(`${API_BASE}/process_live`, formData, {
          responseType: 'blob'
        });

        if (stateRef.current.webcamActive) {
          setProcessedImage(prev => {
            if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return URL.createObjectURL(res.data);
          });
        }
      } catch (err) {
        console.error("Frame processing failed", err);
      }

      if (stateRef.current.webcamActive) {
        requestRef.current = setTimeout(() => {
          requestAnimationFrame(processFrame);
        }, 100);
      }
    }, 'image/jpeg', 0.6);
  };

  useEffect(() => {
    if (webcamActive) {
      processFrame();
    }
    return () => {
      if (requestRef.current) {
        clearTimeout(requestRef.current);
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [webcamActive]);

  useEffect(() => {
    if (mode === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }
  }, [mode]);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="header">
          <h1>EdgeVision Pro</h1>
        </div>

        <div className="control-group">
          <label className="control-label">Mode</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${mode === 'upload' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '0.5rem' }}
              onClick={() => setMode('upload')}
            >
              Upload
            </button>
            <button
              className={`btn ${mode === 'webcam' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '0.5rem' }}
              onClick={() => setMode('webcam')}
            >
              Webcam
            </button>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">Algorithm</label>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
            <option value="canny">Canny Edge Detection</option>
            <option value="sobel">Sobel Operator</option>
            <option value="laplacian">Laplacian</option>
            <option value="scharr">Scharr Operator</option>
            <option value="prewitt">Prewitt Operator</option>
            <option value="morphological">Morphological Gradient</option>
            <option value="roberts">Roberts Operator</option>
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">Parameters</label>

          {algorithm === 'canny' && (
            <>
              <div className="slider-container">
                <div className="slider-header">
                  <span>Lower Threshold</span>
                  <span>{params.threshold1}</span>
                </div>
                <input
                  type="range" min="0" max="500"
                  value={params.threshold1}
                  onChange={(e) => handleParamChange('threshold1', parseInt(e.target.value))}
                />
              </div>
              <div className="slider-container">
                <div className="slider-header">
                  <span>Upper Threshold</span>
                  <span>{params.threshold2}</span>
                </div>
                <input
                  type="range" min="0" max="500"
                  value={params.threshold2}
                  onChange={(e) => handleParamChange('threshold2', parseInt(e.target.value))}
                />
              </div>
            </>
          )}

          {(algorithm === 'sobel' || algorithm === 'laplacian' || algorithm === 'morphological') && (
            <div className="control-group" style={{ padding: 0, border: 'none' }}>
              <label className="control-label">Kernel Size</label>
              <select
                value={params.ksize}
                onChange={(e) => handleParamChange('ksize', parseInt(e.target.value))}
              >
                <option value="1">1x1</option>
                <option value="3">3x3</option>
                <option value="5">5x5</option>
                <option value="7">7x7</option>
              </select>
            </div>
          )}

          <div className="toggle-item" style={{ marginTop: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem' }}>Invert Edges</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={params.invert}
                onChange={(e) => handleParamChange('invert', e.target.checked)}
              />
              <span className="slider-toggle"></span>
            </label>
          </div>

          <div className="toggle-item" style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.875rem' }}>Gaussian Blur</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={params.blur}
                onChange={(e) => handleParamChange('blur', e.target.checked)}
              />
              <span className="slider-toggle"></span>
            </label>
          </div>

          {params.blur && (
            <div className="slider-container">
              <div className="slider-header">
                <span>Blur Intensity</span>
                <span>{params.blur_kernel}</span>
              </div>
              <input
                type="range" min="1" max="15" step="2"
                value={params.blur_kernel}
                onChange={(e) => handleParamChange('blur_kernel', parseInt(e.target.value))}
              />
            </div>
          )}
        </div>

        <div className="control-group">
          <label className="control-label">Intensity Histogram</label>
          <div className="histogram-container">
            {histogramData ? (
              <div className="histogram-bars">
                {histogramData.filter((_, i) => i % 8 === 0).map((h, i) => (
                  <div
                    key={i}
                    className="hist-bar"
                    style={{ height: `${Math.min(100, (h / Math.max(...histogramData)) * 100)}%` }}
                  ></div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="control-group" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => {
            setOriginalImage(null);
            setProcessedImage(null);
            setImageId(null);
            setHistogramData(null);
          }}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </aside >

      {/* Main Workspace */}
      <main className="main-content">
        {mode === 'upload' && !originalImage ? (
          <div style={{ padding: '4rem', maxWidth: '600px', margin: 'auto', width: '100%' }}>
            <div {...getRootProps()} className="dropzone">
              <input {...getInputProps()} />
              <Upload size={48} style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }} />
              <p style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-main)' }}>
                {isDragActive ? "Drop the image here" : "Upload an image to start"}
              </p>
              <p style={{ marginTop: '0.5rem' }}>JPG, PNG supported</p>
            </div>
          </div>
        ) : (
          <>
            <div className={`canvas-container ${showOriginal ? 'grid-double' : 'grid-single'}`}>
              {showOriginal && (
                <div className="image-card fade-in">
                  <div className="card-header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ImageIcon size={16} /> {mode === 'webcam' ? 'Live Camera' : 'Original'}
                    </span>
                  </div>
                  <div className="image-preview">
                    {mode === 'webcam' ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          filter: params.grayscale ? 'grayscale(100%)' : 'none',
                          display: showOriginal ? 'block' : 'none'
                        }}
                      />
                    ) : (
                      <img
                        src={originalImage}
                        alt="Original"
                        style={{ filter: params.grayscale ? 'grayscale(100%)' : 'none' }}
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="image-card fade-in">
                <div className="card-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)' }}>
                    <Zap size={16} /> {algorithm.toUpperCase()} Output
                  </span>
                  {loading && <Activity size={16} className="spin" style={{ color: 'var(--accent-primary)' }} />}
                </div>
                <div className="image-preview">
                  {processedImage ? (
                    <img src={processedImage} alt="Processed" />
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>{mode === 'webcam' ? 'Initializing camera...' : 'Processing...'}</div>
                  )}
                </div>
              </div>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="download-bar">
              <button
                className="btn btn-outline"
                onClick={() => setParams(prev => ({ ...prev, grayscale: !prev.grayscale }))}
              >
                {params.grayscale ? "Show Original Color" : "Show Grayscale"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowOriginal(!showOriginal)}>
                {showOriginal ? "Hide Compare" : "Show Side-by-Side"}
              </button>
              <button
                className="btn btn-primary"
                onClick={downloadImage}
                disabled={!processedImage}
              >
                <Download size={18} /> Download Result
              </button>
            </div>

            {!showOriginal && mode === 'webcam' && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              />
            )}
          </>
        )}
      </main>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default App;
