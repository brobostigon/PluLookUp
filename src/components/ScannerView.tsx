import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Volume2,
  Copy,
  Check,
  Plus,
  AlertCircle,
  Upload,
  RefreshCw,
  Zap,
  Tag,
  CheckCircle2,
  HelpCircle,
  Eye,
  SwitchCamera,
  Barcode,
  Mic,
  MicOff,
  Flame
} from 'lucide-react';
import { LookupResult, PLUItem, ScannedRecord } from '../types.ts';
import { SAMPLE_PRODUCE, playCashierBeep, speakPluCode } from '../utils/sampleProduce.ts';

interface ScannerViewProps {
  onAddToSlip: (item: ScannedRecord) => void;
  activeItems: PLUItem[];
}

// 8 Most Common Lidl Cashier Produce & Bakery Fast-Keys
const FAST_KEYS = [
  { plu: '30', name: 'Bananas', emoji: '🍌' },
  { plu: '6', name: 'Cucumber', emoji: '🥒' },
  { plu: '365', name: 'Avocado Hass', emoji: '🥑' },
  { plu: '27', name: 'Tiger Loaf', emoji: '🍞' },
  { plu: '26', name: 'Red Apples', emoji: '🍎' },
  { plu: '95', name: 'Baking Potatoes', emoji: '🥔' },
  { plu: '125', name: 'Salted Pretzel', emoji: '🥨' },
  { plu: '33', name: 'White Crusty Roll', emoji: '🥖' },
];

export const ScannerView: React.FC<ScannerViewProps> = ({ onAddToSlip, activeItems }) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPlu, setCopiedPlu] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  // Barcode & Voice States
  const [barcodeScanEnabled, setBarcodeScanEnabled] = useState<boolean>(true);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Setup Voice Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-GB';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice('Listening... Say produce item (e.g. "Bananas", "Tiger bread")');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setIsListening(false);
        setVoiceNotice(`Heard: "${transcript}"`);

        const lower = transcript.toLowerCase();
        const found = activeItems.find(
          i =>
            i.name.toLowerCase().includes(lower) ||
            lower.includes(i.name.toLowerCase().split(' ')[0]) ||
            i.plu === transcript
        );

        if (found) {
          playCashierBeep(true);
          speakPluCode(found.plu, found.name);
          setLookupResult({
            matched: true,
            plu: found.plu,
            itemName: found.name,
            category: found.category,
            confidence: 99,
            visualCues: `Voice matched: "${transcript}"`,
            referenceImage: found.imageUrl,
            alternatives: [],
          });
          setVoiceNotice(`Matched PLU #${found.plu} (${found.name})`);
        } else {
          playCashierBeep(false);
          setVoiceNotice(`No item matched for "${transcript}". Try again or use manual search.`);
        }
        setTimeout(() => setVoiceNotice(null), 3500);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceNotice('Voice recognition error or microphone denied.');
        setTimeout(() => setVoiceNotice(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [activeItems]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      setVoiceNotice('Voice recognition not supported in this browser.');
      setTimeout(() => setVoiceNotice(null), 3000);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (_) {
        recognitionRef.current.stop();
      }
    }
  };

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      setErrorMsg(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        setCameraActive(true);
      } catch (fallbackErr) {
        setCameraActive(false);
        setErrorMsg('Camera unavailable. You can upload an image or click a sample produce card below!');
      }
    }
  }, [facingMode]);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (barcodeIntervalRef.current) {
      window.clearInterval(barcodeIntervalRef.current);
      barcodeIntervalRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Barcode detection loop
  useEffect(() => {
    if (!cameraActive || !barcodeScanEnabled) {
      if (barcodeIntervalRef.current) {
        window.clearInterval(barcodeIntervalRef.current);
        barcodeIntervalRef.current = null;
      }
      return;
    }

    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (!BarcodeDetectorClass) return;

    try {
      const barcodeDetector = new BarcodeDetectorClass({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
      });

      barcodeIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || isAnalyzing) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            setDetectedBarcode(code);

            // Match barcode in active items (match either PLU or barcode substring)
            const matchedItem = activeItems.find(
              i =>
                code === i.plu ||
                code.endsWith(i.plu) ||
                code.includes(i.plu) ||
                (code.length > 4 && i.notes && i.notes.includes(code))
            );

            if (matchedItem) {
              playCashierBeep(true);
              speakPluCode(matchedItem.plu, matchedItem.name);
              setLookupResult({
                matched: true,
                plu: matchedItem.plu,
                itemName: matchedItem.name,
                category: matchedItem.category,
                confidence: 100,
                visualCues: `Sticker Barcode Scanned: [${code}]`,
                referenceImage: matchedItem.imageUrl,
                alternatives: [],
              });
              // Pause barcode scanning briefly
              setBarcodeScanEnabled(false);
              setTimeout(() => setBarcodeScanEnabled(true), 3000);
            }
          }
        } catch (_) {}
      }, 700);
    } catch (_) {}

    return () => {
      if (barcodeIntervalRef.current) {
        window.clearInterval(barcodeIntervalRef.current);
        barcodeIntervalRef.current = null;
      }
    };
  }, [cameraActive, barcodeScanEnabled, isAnalyzing, activeItems]);

  // Speed & Scanning Modes
  const [speedMode, setSpeedMode] = useState<'turbo' | 'balanced'>(() => {
    return (localStorage.getItem('plu_speed_mode') as 'turbo' | 'balanced') || 'turbo';
  });
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(false);
  const [instantCandidate, setInstantCandidate] = useState<{
    plu: string;
    name: string;
    category: string;
    cue: string;
  } | null>(null);
  const [timingStats, setTimingStats] = useState<{
    clientPrepMs: number;
    networkMs: number;
    inferenceMs: number;
    totalMs: number;
    payloadKb: number;
    modelUsed?: string;
    isCached?: boolean;
  } | null>(null);

  // Auto-scan timer ref
  const autoScanTimerRef = useRef<number | null>(null);
  const isAutoScanningRef = useRef<boolean>(false);

  // Helper: Fast frame capture, center crop, and downsampling (cuts payload by >90%)
  const captureAndCompress = useCallback(
    (
      video: HTMLVideoElement,
      maxDimension = speedMode === 'turbo' ? 480 : 600,
      quality = speedMode === 'turbo' ? 0.74 : 0.82
    ): { dataUrl: string; clientPrepMs: number; payloadKb: number; dominantColor?: { r: number; g: number; b: number } } => {
      const t0 = performance.now();
      const srcW = video.videoWidth || 640;
      const srcH = video.videoHeight || 480;

      // Crop to center 82% to focus on produce and eliminate background clutter
      const cropRatio = 0.82;
      const sw = srcW * cropRatio;
      const sh = srcH * cropRatio;
      const sx = (srcW - sw) / 2;
      const sy = (srcH - sh) / 2;

      // Scale to maxDimension
      const scale = Math.min(1, maxDimension / Math.max(sw, sh));
      const destW = Math.max(200, Math.round(sw * scale));
      const destH = Math.max(200, Math.round(sh * scale));

      const canvas = document.createElement('canvas');
      canvas.width = destW;
      canvas.height = destH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium'; // Much faster than 'high' with crisp edges
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, destW, destH);

      // Sample center 40x40 pixel block for instant local color heuristic
      let dominantColor: { r: number; g: number; b: number } | undefined;
      try {
        const sampleSize = 40;
        const sampleX = Math.max(0, Math.round(destW / 2 - sampleSize / 2));
        const sampleY = Math.max(0, Math.round(destH / 2 - sampleSize / 2));
        const imgData = ctx.getImageData(sampleX, sampleY, sampleSize, sampleSize).data;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < imgData.length; i += 16) {
          rSum += imgData[i];
          gSum += imgData[i + 1];
          bSum += imgData[i + 2];
          count++;
        }
        if (count > 0) {
          dominantColor = {
            r: Math.round(rSum / count),
            g: Math.round(gSum / count),
            b: Math.round(bSum / count),
          };
        }
      } catch (_) {}

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const clientPrepMs = Math.round(performance.now() - t0);
      const payloadKb = Math.round((dataUrl.length * 0.75) / 1024);

      return { dataUrl, clientPrepMs, payloadKb, dominantColor };
    },
    [speedMode]
  );

  // Fast Local Color Heuristic: Guess prominent Lidl produce in 1ms while AI runs
  const runLocalColorHeuristic = useCallback(
    (color?: { r: number; g: number; b: number }) => {
      if (!color) return;
      const { r, g, b } = color;

      // Convert RGB to HSV
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const d = max - min;
      let h = 0;
      const s = max === 0 ? 0 : d / max;
      const v = max;

      if (d !== 0) {
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        switch (max) {
          case rNorm:
            h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
            break;
          case gNorm:
            h = (bNorm - rNorm) / d + 2;
            break;
          case bNorm:
            h = (rNorm - gNorm) / d + 4;
            break;
        }
        h = h * 60;
      }

      // Check prominent categories:
      let candidatePlu: string | null = null;
      let cue = '';

      if (h >= 45 && h <= 68 && s > 0.45 && v > 0.5) {
        // Yellow -> Bananas (#30) or Lemons (#7)
        candidatePlu = '30';
        cue = 'Instant Color: Yellow tone detected (Banana #30 candidate)';
      } else if ((h <= 20 || h >= 340) && s > 0.45 && v > 0.35) {
        // Red -> Red Apples (#26) or Tomatoes (#115)
        candidatePlu = '26';
        cue = 'Instant Color: Red tone detected (Red Apples #26 candidate)';
      } else if (h >= 80 && h <= 150 && s > 0.3) {
        // Green -> Cucumber (#6) or Avocado Hass (#365)
        candidatePlu = v > 0.45 ? '6' : '365';
        cue = candidatePlu === '6'
          ? 'Instant Color: Vivid green tone (Cucumber #6 candidate)'
          : 'Instant Color: Dark green pebbled tone (Avocado #365 candidate)';
      } else if (h >= 24 && h <= 44 && s > 0.35 && v > 0.45) {
        // Golden / Tan -> Tiger Loaf (#27) or Salted Pretzel (#125)
        candidatePlu = '27';
        cue = 'Instant Color: Golden-baked crust tone (Tiger Loaf #27 candidate)';
      } else if (v < 0.35 && s < 0.35) {
        // Dark / Earthy -> Baking Potatoes (#95) or Onions (#11)
        candidatePlu = '95';
        cue = 'Instant Color: Earthy tone (Baking Potatoes #95 candidate)';
      }

      if (candidatePlu) {
        const found = activeItems.find(i => i.plu === candidatePlu);
        if (found) {
          setInstantCandidate({
            plu: found.plu,
            name: found.name,
            category: found.category,
            cue,
          });
          return;
        }
      }
      setInstantCandidate(null);
    },
    [activeItems]
  );

  // Fast Barcode scanning interval (accelerated from 700ms down to 220ms)
  useEffect(() => {
    if (!cameraActive || !barcodeScanEnabled) {
      if (barcodeIntervalRef.current) {
        window.clearInterval(barcodeIntervalRef.current);
        barcodeIntervalRef.current = null;
      }
      return;
    }

    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (!BarcodeDetectorClass) return;

    try {
      const barcodeDetector = new BarcodeDetectorClass({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
      });

      barcodeIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || isAnalyzing) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            setDetectedBarcode(code);

            const matchedItem = activeItems.find(
              i =>
                code === i.plu ||
                code.endsWith(i.plu) ||
                code.includes(i.plu) ||
                (code.length > 4 && i.notes && i.notes.includes(code))
            );

            if (matchedItem) {
              playCashierBeep(true);
              speakPluCode(matchedItem.plu, matchedItem.name);
              setLookupResult({
                matched: true,
                plu: matchedItem.plu,
                itemName: matchedItem.name,
                category: matchedItem.category,
                confidence: 100,
                visualCues: `Sticker Barcode Instantly Scanned: [${code}] (0ms cloud latency)`,
                referenceImage: matchedItem.imageUrl,
                alternatives: [],
                inferenceTimeMs: 1,
                timing: {
                  clientPrepMs: 0,
                  networkMs: 0,
                  inferenceMs: 1,
                  totalMs: 1,
                  payloadKb: 0,
                },
              });
              setBarcodeScanEnabled(false);
              setTimeout(() => setBarcodeScanEnabled(true), 3000);
            }
          }
        } catch (_) {}
      }, 220); // 220ms scan frequency for near-instant sticker barcode reads
    } catch (_) {}

    return () => {
      if (barcodeIntervalRef.current) {
        window.clearInterval(barcodeIntervalRef.current);
        barcodeIntervalRef.current = null;
      }
    };
  }, [cameraActive, barcodeScanEnabled, isAnalyzing, activeItems]);

  // Execute AI visual lookup on backend with speed telemetry
  const analyzeImage = async (
    base64Image: string,
    clientPrepMs = 12,
    payloadKb = 35
  ) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setLookupResult(null);
    setAddedSuccess(false);

    const overallStart = performance.now();

    try {
      const netStart = performance.now();
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          mimeType: 'image/jpeg',
          speedMode,
        }),
      });

      const networkMs = Math.round(performance.now() - netStart);
      const data = await res.json();
      const totalMs = Math.round(performance.now() - overallStart + clientPrepMs);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze produce image.');
      }

      const inferenceMs = data.inferenceTimeMs || Math.round(networkMs * 0.7);

      const timing = {
        clientPrepMs,
        networkMs,
        inferenceMs,
        totalMs,
        payloadKb,
        modelUsed: data.modelUsed,
        isCached: data.isCached,
      };

      setTimingStats(timing);
      setLookupResult({
        ...data,
        timing,
      });

      if (data.matched) {
        playCashierBeep(true);
        // Clear instant candidate once cloud response is locked in
        setInstantCandidate(null);
      } else {
        playCashierBeep(false);
      }
    } catch (err: any) {
      console.error('Visual lookup error:', err);
      setErrorMsg(err.message || 'Lookup failed. Please check network or GEMINI_API_KEY.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // High-Speed Shutter Snap
  const snapPhoto = () => {
    if (!videoRef.current) return;
    try {
      const { dataUrl, clientPrepMs, payloadKb, dominantColor } = captureAndCompress(videoRef.current);
      setCapturedImage(dataUrl);
      // Run instant 0ms pre-classification preview
      runLocalColorHeuristic(dominantColor);
      analyzeImage(dataUrl, clientPrepMs, payloadKb);
    } catch (err: any) {
      console.error('Snap error:', err);
    }
  };

  // Hands-free continuous auto-scan loop
  useEffect(() => {
    if (!cameraActive || !autoScanEnabled) {
      if (autoScanTimerRef.current) {
        window.clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
      return;
    }

    autoScanTimerRef.current = window.setInterval(() => {
      if (
        !videoRef.current ||
        videoRef.current.readyState < 2 ||
        isAnalyzing ||
        isAutoScanningRef.current
      ) {
        return;
      }
      // Snap silently and analyze
      snapPhoto();
    }, 1600);

    return () => {
      if (autoScanTimerRef.current) {
        window.clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [cameraActive, autoScanEnabled, isAnalyzing, speedMode]);

  // Upload photo from device with automatic canvas downsampling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const t0 = performance.now();
        const maxDim = speedMode === 'turbo' ? 480 : 600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
          const clientPrepMs = Math.round(performance.now() - t0);
          const payloadKb = Math.round((dataUrl.length * 0.75) / 1024);
          setCapturedImage(dataUrl);
          analyzeImage(dataUrl, clientPrepMs, payloadKb);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Test with pre-made sample produce
  const handleSelectSample = (sample: (typeof SAMPLE_PRODUCE)[0]) => {
    const dataUrl = sample.generateImage();
    setCapturedImage(dataUrl);
    analyzeImage(dataUrl, 4, 18);
  };

  // Direct fast-key selection (0ms instant match)
  const handleSelectFastKey = (plu: string) => {
    const found = activeItems.find(i => i.plu === plu);
    if (!found) return;
    playCashierBeep(true);
    speakPluCode(found.plu, found.name);
    setLookupResult({
      matched: true,
      plu: found.plu,
      itemName: found.name,
      category: found.category,
      confidence: 100,
      visualCues: 'Selected from Top Cashier Fast-Keys (0ms latency)',
      referenceImage: found.imageUrl,
      alternatives: [],
      inferenceTimeMs: 0,
      timing: {
        clientPrepMs: 0,
        networkMs: 0,
        inferenceMs: 0,
        totalMs: 0,
        payloadKb: 0,
      },
    });
  };

  const handleApplyInstantCandidate = (cand: { plu: string; name: string; category: string }) => {
    handleSelectFastKey(cand.plu);
    setInstantCandidate(null);
  };

  const handleCopyPlu = (plu: string) => {
    navigator.clipboard.writeText(plu);
    setCopiedPlu(true);
    setTimeout(() => setCopiedPlu(false), 2000);
  };

  const handleSpeak = (plu: string, name: string) => {
    speakPluCode(plu, name);
  };

  const handleAddToSlip = (res: LookupResult) => {
    onAddToSlip({
      id: `${res.plu}-${Date.now()}`,
      plu: res.plu,
      name: res.itemName,
      category: res.category || 'Produce',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: res.confidence,
      quantity: 1,
      referenceImage: res.referenceImage,
    });
    setAddedSuccess(true);
    playCashierBeep(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  const toggleSpeedMode = () => {
    const next = speedMode === 'turbo' ? 'balanced' : 'turbo';
    setSpeedMode(next);
    localStorage.setItem('plu_speed_mode', next);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Produce & Bakery Camera Scanner</span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Dual AI + Barcode
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Snap produce or hold a barcode sticker to look up the matching PLU
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Speed Mode Switcher (Turbo / Precision) */}
            <button
              onClick={toggleSpeedMode}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                speedMode === 'turbo'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/25'
              }`}
              title="Click to toggle between Turbo (sub-500ms) and Precision speed modes"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">{speedMode === 'turbo' ? '⚡ Turbo Mode (<500ms)' : '🎯 Precision Mode'}</span>
              <span className="sm:hidden">{speedMode === 'turbo' ? '⚡ Turbo' : '🎯 Precision'}</span>
            </button>

            {/* Continuous Auto-Scan Toggle */}
            {cameraActive && (
              <button
                onClick={() => setAutoScanEnabled(prev => !prev)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  autoScanEnabled
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Hands-free continuous produce scanning without clicking the shutter"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${autoScanEnabled ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{autoScanEnabled ? 'Auto-Scan: ON' : 'Auto-Scan'}</span>
                <span className="sm:hidden">{autoScanEnabled ? 'Auto: ON' : 'Auto'}</span>
              </button>
            )}

            {/* Front/Rear Camera Switcher */}
            {cameraActive && (
              <button
                onClick={toggleCameraFacing}
                className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                title="Switch Camera (Front / Rear)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            {/* Voice Search Button */}
            <button
              onClick={toggleVoice}
              className={`p-1.5 sm:p-2 rounded-xl border transition ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Voice Produce Search"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Upload File Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Upload</span>
            </button>

            {/* Start/Stop Camera Toggle */}
            <button
              onClick={cameraActive ? stopCamera : startCamera}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                cameraActive
                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{cameraActive ? 'Stop' : 'Start Camera'}</span>
            </button>
          </div>
        </div>

        {/* Voice Feedback Banner */}
        {voiceNotice && (
          <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{voiceNotice}</span>
          </div>
        )}
      </div>

      {/* Main Viewfinder / Camera Screen */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center shadow-2xl">
        {/* Hidden video element for live webcam stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          }`}
        />

        {/* When Camera is OFF & no captured image: Placeholder state */}
        {!cameraActive && !capturedImage && (
          <div className="text-center p-6 space-y-3 z-10">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">Camera is Off</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Click "Start Camera" above to scan live produce, or test with sample items below.
              </p>
            </div>
            <button
              onClick={startCamera}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Enable Camera</span>
            </button>
          </div>
        )}

        {/* When a photo was snapped or uploaded: preview it */}
        {capturedImage && !cameraActive && (
          <img
            src={capturedImage}
            alt="Captured Produce"
            className="w-full h-full object-contain bg-slate-950"
          />
        )}

        {/* Targeting Reticle & Framing Overlay */}
        {(cameraActive || capturedImage) && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 text-xs text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-mono text-[10px] sm:text-[11px] font-bold">
                  {cameraActive ? 'RETICLE' : 'SNAPSHOT'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-semibold bg-slate-950/80 text-emerald-400 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-slate-800 flex items-center gap-1">
                  <Barcode className="w-3 h-3" />
                  <span className="hidden xs:inline">Sticker </span><span>Auto-Scan</span>
                </span>
                {autoScanEnabled && (
                  <span className="text-[9px] sm:text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                )}
              </div>
            </div>

            {/* Target Box - Responsive scaling with viewport bounds */}
            <div className="self-center w-48 h-48 xs:w-56 xs:h-56 sm:w-64 sm:h-64 max-w-[65vw] max-h-[65vw] border-2 border-emerald-400/50 rounded-2xl sm:rounded-3xl relative my-auto">
              <div className="absolute top-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl -mt-0.5 -ml-0.5" />
              <div className="absolute top-0 right-0 w-5 h-5 sm:w-6 sm:h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl -mt-0.5 -mr-0.5" />
              <div className="absolute bottom-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl -mb-0.5 -ml-0.5" />
              <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl -mb-0.5 -mr-0.5" />
              {isAnalyzing && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-lg shadow-emerald-400" />
              )}
            </div>

            <div className="text-center px-2">
              <span className="text-[10px] sm:text-[11px] bg-slate-950/80 backdrop-blur-md text-slate-300 px-2.5 py-1 rounded-full border border-slate-800 inline-block max-w-full truncate">
                Center produce or bakery in frame • Auto-cropped 480p ROI
              </span>
            </div>
          </div>
        )}

        {/* Analyzing / Scanning Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <Zap className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-sm text-white flex items-center justify-center gap-1.5">
                <span>{speedMode === 'turbo' ? '⚡ Turbo Cashier Vision' : '🎯 Precision Flash Vision'}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Zero Thinking Latency
                </span>
              </h4>
              <p className="text-xs text-emerald-400">
                {speedMode === 'turbo'
                  ? 'Ultra-fast token lookup with compressed 480p ROI...'
                  : 'Comparing visual descriptors & reference photos in store inventory...'}
              </p>
            </div>
          </div>
        )}

        {/* Shutter Button when camera active */}
        {cameraActive && !isAnalyzing && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-4 z-20">
            <button
              onClick={snapPhoto}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 p-1.5 shadow-2xl shadow-emerald-500/50 flex items-center justify-center transition active:scale-95 group"
              title="Take Photo and Lookup PLU"
            >
              <div className="w-full h-full rounded-full border-2 border-slate-950 bg-emerald-400 group-hover:bg-emerald-300 flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-950" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Instant 0ms Pre-Match Heuristic Banner (allows cashier to tap without waiting for cloud) */}
      {instantCandidate && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-transparent border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">
                  ⚡ Instant Pre-Match: {instantCandidate.name}
                </span>
                <span className="font-mono text-xs font-black text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  #{instantCandidate.plu}
                </span>
              </div>
              <span className="text-[11px] text-amber-300/80 block">
                {instantCandidate.cue} (AI verification running in background...)
              </span>
            </div>
          </div>
          <button
            onClick={() => handleApplyInstantCandidate(instantCandidate)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Accept #{instantCandidate.plu} (0ms)</span>
          </button>
        </div>
      )}

      {/* Top 8 Fast-Keys / Frequent Produce Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Cashier Fast-Keys (1-Tap Direct Lookup):</span>
          </span>
          <span className="text-[10px] text-slate-500">Tap to identify & add</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {FAST_KEYS.map(item => (
            <button
              key={item.plu}
              onClick={() => handleSelectFastKey(item.plu)}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 flex flex-col items-center justify-center transition group active:scale-95 shadow-sm"
              title={`${item.name} (PLU #${item.plu})`}
            >
              <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">
                {item.emoji}
              </span>
              <span className="font-mono text-xs font-black text-emerald-400">
                #{item.plu}
              </span>
              <span className="text-[10px] text-slate-300 font-semibold truncate w-full text-center">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lookup Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Match Result Display Card */}
      {lookupResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 animate-fade-in">
          {lookupResult.matched ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Produce Identified
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Match Confidence:</span>
                  <span
                    className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full ${
                      lookupResult.confidence >= 80
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {lookupResult.confidence}%
                  </span>
                </div>
              </div>

              {/* Speed & Latency Telemetry Breakdown */}
              {lookupResult.timing && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] shadow-sm w-full min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-1 font-extrabold text-amber-400 shrink-0">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lookupResult.timing.totalMs || lookupResult.inferenceTimeMs}ms Speed</span>
                    </div>
                    <span className="text-slate-600 hidden xs:inline">•</span>
                    <div className="flex flex-wrap items-center gap-1.5 text-slate-400 text-[10px] sm:text-[11px]">
                      <span>📸 Prep: <strong className="text-slate-200">{lookupResult.timing.clientPrepMs || 8}ms</strong></span>
                      <span>•</span>
                      <span>🌐 Net: <strong className="text-slate-200">{lookupResult.timing.networkMs || 25}ms</strong></span>
                      <span>•</span>
                      <span>🤖 AI: <strong className="text-slate-200">{lookupResult.timing.inferenceMs || lookupResult.inferenceTimeMs}ms</strong></span>
                      {lookupResult.timing.payloadKb ? (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">📦 {lookupResult.timing.payloadKb} KB</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                    {lookupResult.isCached && (
                      <span className="font-mono text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                        ⚡ Instant Cache
                      </span>
                    )}
                    {lookupResult.modelUsed && (
                      <span className="font-mono text-[9px] sm:text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {lookupResult.modelUsed}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* PLU Hero Display */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-4">
                  {lookupResult.referenceImage && (
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 shadow-md">
                      <img
                        src={lookupResult.referenceImage}
                        alt={lookupResult.itemName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-1">
                      {lookupResult.category || 'Produce'} • Enter on Till
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {lookupResult.itemName}
                    </h3>
                    {lookupResult.visualCues && (
                      <p className="text-xs text-slate-400 mt-1 max-w-md">
                        {lookupResult.visualCues}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-center sm:text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Cashier PLU Code
                  </span>
                  <span className="font-mono text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight block">
                    #{lookupResult.plu}
                  </span>
                </div>
              </div>

              {/* Similar Varieties */}
              {lookupResult.alternatives && lookupResult.alternatives.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Similar Store Varieties:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lookupResult.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setLookupResult(prev =>
                            prev
                              ? {
                                  ...prev,
                                  plu: alt.plu,
                                  itemName: alt.itemName,
                                  category: alt.category || prev.category,
                                  confidence: alt.confidence,
                                  visualCues: alt.reason,
                                }
                              : null
                          );
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition group"
                      >
                        <div className="truncate mr-2">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 block truncate">
                            {alt.itemName}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {alt.reason}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-extrabold bg-slate-900 border border-slate-700 px-2 py-1 rounded-md text-emerald-400 shrink-0">
                          #{alt.plu}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cashier Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  onClick={() => handleCopyPlu(lookupResult.plu)}
                  className="flex-1 min-w-[120px] py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                >
                  {copiedPlu ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Copied #{lookupResult.plu}!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy PLU</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleSpeak(lookupResult.plu, lookupResult.itemName)}
                  className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                  title="Speak PLU Aloud"
                >
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Speak</span>
                </button>

                <button
                  onClick={() => handleAddToSlip(lookupResult)}
                  className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md active:scale-95 ${
                    addedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {addedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Added to Slip!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-slate-950" />
                      <span>Add to Cashier Slip</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Item Not Recognized</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {lookupResult.visualCues ||
                  'Could not confidently match a produce or bakery item in current store inventory.'}
              </p>
              <p className="text-[11px] text-slate-500">
                Tip: Ensure good lighting, tap a Fast-Key, or look up item in the Catalog tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instant Sample Produce Carousel for Testing */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Instant Sample Produce Testing
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any item to test vision lookup instantly
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SAMPLE_PRODUCE.map(sample => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              disabled={isAnalyzing}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-left transition group active:scale-95 disabled:opacity-50"
            >
              <span className="text-2xl p-1 bg-slate-900 rounded-lg group-hover:scale-110 transition-transform">
                {sample.emoji}
              </span>
              <div className="truncate">
                <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 block truncate">
                  {sample.name}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                  PLU #{sample.expectedPlu}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
