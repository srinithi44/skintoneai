import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, RefreshCw, CheckCircle2, ChevronRight, Wand2, ThermometerSun, AlertCircle, Sparkles } from 'lucide-react';

const StepperAnalysis = () => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState(null);
  
  const [mode, setMode] = useState('');
  const [city, setCity] = useState('');
  
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => stopCamera();
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setUseCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setUseCamera(false);
    setStream(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
        setFile(capturedFile);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const handleFileUpload = (e, setFileFn, setPreviewFn) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileFn(f);
      if (setPreviewFn) {
        setPreviewFn(URL.createObjectURL(f));
      }
    }
  };

  const callApi = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/full-analysis`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const performInitialAnalysis = async () => {
    if (!file) {
      setError("Please provide an image first.");
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    const data = await callApi(formData);
    if (data) {
      setAnalysisData(prev => ({ ...prev, ...data }));
      setStep(2);
    }
  };

  const advanceToDetails = async () => {
    if (!mode) return;
    if (mode === 'Weather' && !city) {
      setError("Please enter a city for weather mode.");
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    formData.append('mode', mode);
    if (city) formData.append('city', city);
    
    const data = await callApi(formData);
    if (data) {
      setAnalysisData(prev => ({ ...prev, ...data }));
      setStep(4);
    }
  };

  const performTransformationAnalysis = async () => {
    if (!beforeFile || !afterFile) {
      setError("Please provide both before and after images.");
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    if (mode) formData.append('mode', mode);
    if (city) formData.append('city', city);
    formData.append('before_image', beforeFile);
    formData.append('after_image', afterFile);
    
    const data = await callApi(formData);
    if (data) {
      setAnalysisData(prev => ({ ...prev, ...data }));
      setStep(5);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-[3rem] border border-rose-gold/10 p-5 sm:p-8 md:p-12 max-w-5xl mx-auto shadow-[0_20px_80px_rgba(141,91,76,0.1)] flex flex-col relative overflow-hidden">
      {/* STEPPER HEADER */}
      <div className="flex items-center justify-between mb-8 sm:mb-12 px-2 sm:px-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-rose-gold/10 -z-10 -translate-y-1/2"></div>
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-500 scale-90 ${
            step === idx ? 'bg-rose-gold text-white scale-110 shadow-lg shadow-rose-gold/30' : 
            step > idx ? 'bg-rose-gold/60 text-white' : 
            'bg-white text-mauve border border-rose-gold/20'
          }`}>
            {step > idx ? <CheckCircle2 size={16} /> : idx}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center">
        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: IMAGE INPUT */}
          {step === 1 && (
            <motion.div key="1" className="w-full flex-1 flex flex-col animate-in fade-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-10">
                <span className="text-xs font-bold tracking-[0.3em] text-mauve uppercase mb-2 block">Step 1 of 5</span>
                <h2 className="text-4xl md:text-5xl font-playfair text-dark-luxe mb-3">Capture Your Glow</h2>
                <p className="text-mauve/80 max-w-lg mx-auto italic font-light">For the most accurate AI analysis, ensure your face is well-lit and clearly visible.</p>
              </div>
              
              <div className="grid lg:grid-cols-[1fr_300px] gap-10 items-start">
                <div className="flex flex-col items-center">
                  {!preview && !useCamera && (
                    <div className="w-full aspect-[4/3] rounded-[2rem] sm:rounded-[2.5rem] bg-[#fdf8f5] border-2 border-dashed border-rose-gold/20 flex flex-col items-center justify-center p-5 sm:p-8 transition-all hover:bg-white/50 group">
                      <div className="flex gap-4 sm:gap-6 mb-6 sm:mb-8">
                        <button onClick={startCamera} className="group/btn flex flex-col items-center gap-3">
                          <div className="p-4 sm:p-5 bg-white shadow-md rounded-2xl text-rose-gold transform transition-transform group-hover/btn:-translate-y-1"><Camera size={28} /></div>
                          <span className="text-sm font-semibold tracking-wide text-dark-luxe">Live Camera</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="group/btn flex flex-col items-center gap-3">
                          <div className="p-4 sm:p-5 bg-white shadow-md rounded-2xl text-rose-gold transform transition-transform group-hover/btn:-translate-y-1"><Upload size={28} /></div>
                          <span className="text-sm font-semibold tracking-wide text-dark-luxe">Upload Image</span>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setFile, setPreview)} />
                        </button>
                      </div>
                      <p className="text-sm text-mauve/60 text-center max-w-[240px]">Drag & Drop your selfie or choose a high-resolution portrait.</p>
                    </div>
                  )}

                  {useCamera && (
                    <div className="flex flex-col items-center gap-6 w-full">
                      <div className="relative w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-black shadow-2xl">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 border-[12px] border-white/10 pointer-events-none rounded-[2.5rem]"></div>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={stopCamera} className="px-8 py-3 rounded-full border border-rose-gold/20 text-rose-gold font-medium hover:bg-rose-gold/5 transition-colors">Cancel</button>
                        <button onClick={capturePhoto} className="px-10 py-3 rounded-full bg-rose-gold text-white font-bold hover:shadow-lg hover:shadow-rose-gold/30 transition-all flex items-center gap-2 tracking-wide">Capture Glow</button>
                      </div>
                    </div>
                  )}

                  {preview && !useCamera && (
                    <div className="flex flex-col items-center gap-8 w-full">
                      <div className="relative w-full max-w-md aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-rose-gold/10">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => { setPreview(null); setFile(null); }} className="px-8 py-3 rounded-full bg-white border border-rose-gold/10 text-mauve hover:text-rose-gold transition-colors flex items-center gap-2 font-medium">
                          <RefreshCw size={18} /> Retake
                        </button>
                        <button onClick={performInitialAnalysis} disabled={loading} className="px-10 py-3 rounded-full bg-rose-gold text-white font-bold hover:shadow-lg hover:shadow-rose-gold/30 transition-all disabled:opacity-50 flex items-center gap-2 tracking-wide">
                          {loading ? 'Analyzing face...' : 'Analyze Skin Tone'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Studio Guidelines Sidebar */}
                <div className="bg-[#fdf8f5]/50 rounded-[2rem] p-6 border border-rose-gold/5">
                  <h3 className="font-playfair text-xl text-dark-luxe mb-6 pb-4 border-b border-rose-gold/10">Studio Guidelines</h3>
                  <ul className="space-y-6">
                    {[
                      { icon: <ThermometerSun size={18} />, title: "Natural Light", desc: "For best results, aim for natural, soft illumination." },
                      { icon: <RefreshCw size={18} />, title: "Neutral Expression", desc: "Keep a relaxed, neutral face for accurate mapping." },
                      { icon: <AlertCircle size={18} />, title: "Clear Lens", desc: "Wipe your camera lens to allow high clarity for AI analysis." }
                    ].map((g, i) => (
                      <li key={i} className="flex gap-4">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-white shadow-sm flex items-center justify-center text-rose-gold">{g.icon}</div>
                        <div>
                          <h4 className="text-sm font-bold text-dark-luxe mb-1">{g.title}</h4>
                          <p className="text-xs text-mauve/70 leading-relaxed">{g.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 pt-6 border-t border-rose-gold/10">
                    <p className="text-[10px] text-mauve/50 uppercase tracking-widest font-bold mb-3">Expert Tip</p>
                    <p className="text-xs italic text-mauve-80">"Remove any makeup for a true skin health baseline."</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: AI SKIN ANALYSIS */}
          {step === 2 && (
            <motion.div key="2" className="w-full flex flex-col items-center text-center animate-in" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="w-20 h-20 bg-rose-gold/10 text-rose-gold rounded-full mb-8 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-4xl font-playfair text-dark-luxe mb-4">Analysis Complete</h2>
              <p className="text-mauve/70 mb-12 max-w-md font-light italic">Our AI has successfully mapped your features and calibrated your unique skin profile.</p>
              
              <div className="w-full max-w-md bg-[#fdf8f5] border border-rose-gold/10 rounded-[2.5rem] p-10 mb-12 shadow-sm flex flex-col gap-8">
                <div className="flex justify-between items-center pb-6 border-b border-rose-gold/5">
                  <span className="text-xs font-bold tracking-widest text-mauve uppercase">Skin Tone Profile</span>
                  <span className="font-playfair text-3xl text-rose-gold">{analysisData?.skin_tone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold tracking-widest text-mauve uppercase">AI Accuracy</span>
                  <span className="text-xl font-medium text-dark-luxe">{(analysisData?.confidence * 100)?.toFixed(1)}%</span>
                </div>
              </div>

              <button onClick={() => setStep(3)} className="px-12 py-4 rounded-full bg-rose-gold text-white font-bold hover:shadow-xl hover:shadow-rose-gold/30 transition-all flex items-center gap-3 tracking-wide">
                Select Your Style <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {/* STEP 3: MODE SELECTION */}
          {step === 3 && (
            <motion.div key="3" className="w-full flex-1 flex flex-col items-center animate-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-12">
                <span className="text-xs font-bold tracking-[0.3em] text-mauve uppercase mb-2 block">Step 3 of 5</span>
                <h2 className="text-4xl md:text-5xl font-playfair text-dark-luxe mb-4">Choose Your Mode</h2>
                <p className="text-mauve/70 max-w-lg mx-auto italic font-light text-sm">Select how you want our AI to curate your personalized beauty routine today.</p>
              </div>

              <div className="flex flex-col gap-4 w-full max-w-2xl mb-12">
                {[
                  { id: 'Simple', icon: <Sparkles />, title: 'Simple', desc: 'A quick, daily-focused analysis for natural look maintenance and basic skin health essentials.' },
                  { id: 'Occasion', icon: <Wand2 />, title: 'Occasion', desc: 'Elevated styling for weddings, galas, or professional shoots. AI-curated palettes for maximum impact.' },
                  { id: 'Weather', icon: <ThermometerSun />, title: 'Weather', desc: 'Adaptive beauty intelligence that reacts to humidity, UV levels, and local temperature shifts.' }
                ].map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setMode(m.id)} 
                    className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-center gap-6 text-left ${
                      mode === m.id 
                      ? 'border-rose-gold bg-rose-gold/[0.03] shadow-lg shadow-rose-gold/5' 
                      : 'border-rose-gold/5 bg-[#fdf8f5]/50 hover:border-rose-gold/20 hover:bg-white'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      mode === m.id ? 'bg-rose-gold text-white' : 'bg-white text-rose-gold shadow-sm'
                    }`}>
                      {React.cloneElement(m.icon, { size: 24, strokeWidth: 1.5 })}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-xl font-playfair mb-1 ${mode === m.id ? 'text-dark-luxe' : 'text-mauve'}`}>{m.title}</h4>
                      <p className="text-xs text-mauve/60 leading-relaxed max-w-md">{m.desc}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      mode === m.id ? 'border-rose-gold bg-rose-gold' : 'border-rose-gold/20'
                    }`}>
                      {mode === m.id && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {mode === 'Weather' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-sm mb-12">
                    <div className="relative group">
                      <input 
                        type="text" 
                        placeholder="Enter your city for local calibration..." 
                        className="w-full bg-white border border-rose-gold/10 rounded-2xl px-6 py-4 text-dark-luxe placeholder-mauve/40 focus:outline-none focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold transition-all" 
                        value={city} 
                        onChange={e => setCity(e.target.value)} 
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-gold/40"><ChevronRight size={18} /></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={advanceToDetails} 
                disabled={!mode || (mode === 'Weather' && !city) || loading} 
                className="px-12 py-4 rounded-full bg-rose-gold text-white font-bold disabled:opacity-30 disabled:grayscale hover:shadow-xl hover:shadow-rose-gold/30 transition-all flex gap-3 items-center tracking-wide"
              >
                {loading ? 'Consulting AI...' : 'Proceed to Curation'} <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {/* STEP 4: DETAILED MAKEUP ANALYSIS */}
          {step === 4 && (
            <motion.div key="4" className="w-full flex flex-col animate-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-10">
                <span className="text-xs font-bold tracking-[0.3em] text-mauve uppercase mb-2 block">Step 4 of 5</span>
                <h2 className="text-4xl md:text-5xl font-playfair text-dark-luxe mb-4">Your Customized Look</h2>
                <p className="text-mauve/70 max-w-lg mx-auto italic font-light text-sm">A bespoke collection of beauty essentials tailored for your unique profile and current environment.</p>
              </div>
              
              <div className="grid lg:grid-cols-[400px_1fr] gap-12 w-full max-w-5xl mx-auto">
                <div className="flex flex-col gap-8">
                  <div className="relative w-full aspect-[3/4] rounded-[3rem] overflow-hidden border border-rose-gold/10 shadow-2xl">
                    <img src={preview} className="w-full h-full object-cover" alt="Base" />
                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-5 py-2 rounded-2xl border border-rose-gold/20 shadow-sm">
                      <div className="text-[10px] font-bold tracking-widest text-rose-gold uppercase mb-0.5">Selected Mode</div>
                      <div className="text-sm font-playfair text-dark-luxe">{mode}</div>
                    </div>
                  </div>
                  {analysisData?.weather && (
                    <div className="bg-[#fdf8f5] border border-rose-gold/10 p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-gold shadow-sm">
                          <ThermometerSun size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold tracking-widest text-mauve uppercase">Environment</div>
                          <div className="font-playfair text-lg text-dark-luxe">{analysisData.weather.temp}°C / {analysisData.weather.humidity}% Hum</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {analysisData?.weather?.tip && (
                    <div className="bg-rose-gold/5 text-dark-luxe text-sm px-6 py-4 rounded-2xl border border-rose-gold/10 mb-2 flex items-start gap-3">
                      <span className="text-rose-gold mt-0.5">💡</span>
                      <p className="italic font-light leading-relaxed"><strong className="font-bold">Luxe Tip:</strong> {analysisData.weather.tip}</p>
                    </div>
                  )}
                  <div className="grid gap-3">
                    {Object.entries(analysisData?.makeup_details || {}).map(([key, val]) => (
                      <div key={key} className="bg-white border border-rose-gold/5 rounded-[1.5rem] p-5 flex gap-5 items-center hover:border-rose-gold/20 transition-all shadow-sm group">
                        <div className="w-12 h-12 rounded-2xl bg-[#fdf8f5] group-hover:bg-rose-gold transition-colors flex items-center justify-center text-rose-gold group-hover:text-white shrink-0">
                          <Sparkles size={20} strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold tracking-widest text-mauve uppercase mb-1">{key}</div>
                          <div className="text-sm md:text-base text-dark-luxe font-medium">{val}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button onClick={() => setStep(5)} className="mt-6 px-10 py-4 rounded-full bg-rose-gold text-white font-bold hover:shadow-xl hover:shadow-rose-gold/30 transition-all text-center flex items-center justify-center gap-3 tracking-wide">
                    Try Transformation Analysis <Wand2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}            {/* STEP 5: BEFORE VS AFTER TRANSFORMATION */}
          {step === 5 && (
            <motion.div key="5" className="w-full flex flex-col items-center animate-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-10">
                <span className="text-xs font-bold tracking-[0.3em] text-mauve uppercase mb-2 block">Step 5 of 5</span>
                <h2 className="text-4xl md:text-5xl font-playfair text-dark-luxe mb-4">Transformation Analysis</h2>
                <p className="text-mauve/70 max-w-lg mx-auto italic font-light text-sm">Compare your pre-application base with your finished look to measure the AI enhancement score.</p>
              </div>
              
              {!analysisData?.transformation ? (
                <div className="w-full max-w-3xl flex flex-col gap-10">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-col items-center gap-6">
                      <span className="text-[10px] font-bold tracking-widest text-mauve uppercase">Essence (Before)</span>
                      <button onClick={() => beforeInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-rose-gold/20 rounded-[2.5rem] bg-[#fdf8f5]/50 flex flex-col items-center justify-center hover:bg-white transition-all overflow-hidden shadow-sm group">
                        {beforeFile ? <img src={URL.createObjectURL(beforeFile)} className="w-full h-full object-cover" /> : (
                          <div className="flex flex-col items-center gap-2 group-hover:-translate-y-1 transition-transform">
                            <Upload className="text-rose-gold" size={40} strokeWidth={1} />
                            <span className="text-xs font-medium text-mauve/60">Upload Portrait</span>
                          </div>
                        )}
                      </button>
                      <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setBeforeFile)} />
                    </div>
                    <div className="flex flex-col items-center gap-6">
                      <span className="text-[10px] font-bold tracking-widest text-mauve uppercase">Glow (After)</span>
                      <button onClick={() => afterInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-rose-gold/20 rounded-[2.5rem] bg-[#fdf8f5]/50 flex flex-col items-center justify-center hover:bg-white transition-all overflow-hidden shadow-sm group">
                        {afterFile ? <img src={URL.createObjectURL(afterFile)} className="w-full h-full object-cover" /> : (
                          <div className="flex flex-col items-center gap-2 group-hover:-translate-y-1 transition-transform">
                            <Upload className="text-rose-gold" size={40} strokeWidth={1} />
                            <span className="text-xs font-medium text-mauve/60">Upload Result</span>
                          </div>
                        )}
                      </button>
                      <input type="file" ref={afterInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setAfterFile)} />
                    </div>
                  </div>
                  <button onClick={performTransformationAnalysis} disabled={loading} className="w-full px-10 py-5 rounded-full bg-rose-gold text-white font-bold hover:shadow-2xl hover:shadow-rose-gold/30 transition-all text-xl tracking-wider">
                    {loading ? 'Processing Mastery...' : 'Analyze Transformation'}
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-4xl flex flex-col items-center">
                  <div className="w-56 h-56 rounded-full border-[8px] border-[#fdf8f5] bg-white relative flex items-center justify-center mb-10 shadow-[0_20px_60px_rgba(141,91,76,0.15)] overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="112" cy="112" r="100" className="stroke-rose-gold/5" strokeWidth="12" fill="none" />
                      <circle cx="112" cy="112" r="100" className="stroke-rose-gold" strokeWidth="12" fill="none" strokeDasharray={`${analysisData.transformation.score * 6.28} 628`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </svg>
                    <div className="text-center z-10">
                      <div className="text-6xl font-playfair text-dark-luxe font-bold leading-none">{analysisData.transformation.score.toFixed(0)}%</div>
                      <div className="text-[10px] font-bold tracking-[0.3em] text-rose-gold mt-2 uppercase">Luxe Score</div>
                    </div>
                  </div>

                  <h3 className="text-3xl font-playfair text-dark-luxe mb-10 text-center italic">"{analysisData.transformation.feedback}"</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                    {[
                      { label: 'Risk Level', val: analysisData.transformation.risk },
                      { label: 'Longevity', val: analysisData.transformation.longevity },
                      { label: 'Est. Cost', val: `₹${analysisData.transformation.cost}` }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white border border-rose-gold/10 p-8 rounded-[2rem] shadow-sm text-center">
                        <div className="text-[10px] font-bold tracking-widest text-mauve uppercase mb-2">{stat.label}</div>
                        <div className="text-2xl font-playfair text-dark-luxe">{stat.val}</div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => { setStep(1); setPreview(null); setFile(null); setBeforeFile(null); setAfterFile(null); setAnalysisData(null); }} className="mt-16 text-rose-gold/60 hover:text-rose-gold font-medium border-b border-rose-gold/20 pb-1 flex items-center gap-2 group transition-all">
                    Restart Analysis Flow <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StepperAnalysis;
