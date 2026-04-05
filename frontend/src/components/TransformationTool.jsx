import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Wand2, Loader2, RefreshCcw, AlertCircle, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import api from '../api';

const UploadZone = ({ id, type, preview, onUpload, label, subLabel, icon: Icon }) => (
  <div
    className="glass-card border-dashed min-h-[280px] flex flex-col items-center justify-center p-4 relative group cursor-pointer overflow-hidden transition-all hover:border-rose-gold/40"
    onClick={() => document.getElementById(id).click()}
  >
    <input id={id} type="file" hidden accept="image/*" onChange={onUpload} />
    {preview && (
      <img
        src={preview}
        alt={type}
        className="absolute inset-0 w-full h-full object-cover rounded-2xl transition-transform group-hover:scale-105"
        style={{ opacity: 0.55 }}
      />
    )}
    <div className={`relative z-10 text-center space-y-3 transition-opacity ${preview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
      <Icon className="w-12 h-12 text-rose-gold mx-auto drop-shadow" />
      <h3 className="text-xl font-playfair font-bold">{label}</h3>
      <p className="text-xs text-cream/40 uppercase tracking-widest">{subLabel}</p>
    </div>
    {preview && (
      <div className="absolute bottom-3 right-3 z-10 bg-rose-gold/80 text-dark text-[10px] font-bold uppercase px-2 py-1 rounded-full">
        Click to change
      </div>
    )}
  </div>
);

const TransformationTool = () => {
  const [before, setBefore]             = useState(null);
  const [after, setAfter]               = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview, setAfterPreview]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);

  const handleUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'before') { setBefore(file); setBeforePreview(url); }
    else                   { setAfter(file);  setAfterPreview(url); }
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!before || !after) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('before', before);
    formData.append('after', after);

    try {
      const { data } = await api.post('/api/transform', formData);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Transformation analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null); setError(null);
    setBefore(null); setAfter(null);
    setBeforePreview(null); setAfterPreview(null);
  };

  const pct = result?.transformation_percentage ?? 0;
  const circumference = 2 * Math.PI * 88; // r=88 → ~552.92

  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* Upload Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UploadZone
          id="before-in" type="before"
          preview={beforePreview}
          onUpload={(e) => handleUpload(e, 'before')}
          label="Before 📷" subLabel="Base skin / morning look"
          icon={Camera}
        />
        <UploadZone
          id="after-in" type="after"
          preview={afterPreview}
          onUpload={(e) => handleUpload(e, 'after')}
          label="After 💄" subLabel="Makeup applied / styled look"
          icon={Wand2}
        />
      </div>

      {/* Instruction hint */}
      {(!before || !after) && (
        <p className="text-center text-cream/30 text-sm">
          Upload both a <span className="text-rose-gold">Before</span> and an <span className="text-rose-gold">After</span> photo to compare your transformation.
        </p>
      )}

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3 max-w-2xl mx-auto"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-xs font-bold uppercase">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze Button — shown whenever both images loaded and no result yet */}
      {before && after && !result && (
        <motion.div className="flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-rose-gold text-dark font-bold px-12 py-4 rounded-xl flex items-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="animate-spin" /> Analyzing...</>
              : <><ArrowLeftRight className="w-5 h-5" /> Analyze Transformation</>
            }
          </button>
        </motion.div>
      )}

      {/* Result Card */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card !p-12 text-center space-y-8 max-w-2xl mx-auto"
          >
            {/* Circular Progress */}
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <motion.circle
                  cx="96" cy="96" r="88" fill="none"
                  stroke="#c9956a" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - (circumference * pct) / 100 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-rose-gold">{pct}%</span>
                <span className="text-[10px] uppercase font-bold text-cream/30">Styled Change</span>
              </div>
            </div>

            {/* Feedback Badge */}
            <div className="space-y-4">
              <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm tracking-widest uppercase border ${
                pct > 75 ? 'bg-rose-gold/20 border-rose-gold text-rose-gold' :
                pct > 50 ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                pct > 20 ? 'bg-green-500/20 border-green-500 text-green-400' :
                           'bg-white/10 border-white/20 text-cream/40'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
                {result.feedback}
              </div>
              <p className="text-cream/40 max-w-md mx-auto text-sm italic">
                "Based on color saturation and light reflection analysis, we've detected a unique transformation. Your styling choice enhances your natural features beautifully."
              </p>
            </div>

            {/* Reset */}
            <button
              onClick={reset}
              className="text-rose-gold/60 text-xs font-bold uppercase hover:text-rose-gold transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCcw className="w-3 h-3" /> Start New Analysis
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransformationTool;
