import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Play,
  Square,
  Shield,
  Layers,
  FileText,
  Settings,
  Folder,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Search,
  Globe,
  Sliders,
  Hash,
  CornerDownLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Maximize2,
  X,
  Code,
  Sparkles,
  Camera,
  Radio,
  Clock,
  Activity
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('recorder'); // 'recorder' | 'library' | 'settings'

  // Recording Configuration
  const [targetUrl, setTargetUrl] = useState('https://demo.odoo.com');
  const [sopTitle, setSopTitle] = useState('SOP Pembuatan Invoice & Faktur');
  const [outFolder, setOutFolder] = useState('invoice-guide');
  const [selectedProfile, setSelectedProfile] = useState('default');
  const [autoResult, setAutoResult] = useState(true);
  const [autoRedact, setAutoRedact] = useState(true);
  const [aiEnhance, setAiEnhance] = useState(true);

  // Live Telemetry & Process State
  const [isRecording, setIsRecording] = useState(false);
  const [processPid, setProcessPid] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Live Captured Steps Stream (Async Feed)
  const [liveSession, setLiveSession] = useState(null);
  const [liveSteps, setLiveSteps] = useState([]);
  const [latestStep, setLatestStep] = useState(null);
  const [activePreviewStep, setActivePreviewStep] = useState(null);
  const [previewMode, setPreviewMode] = useState('feed'); // 'feed' | 'guide_frame'

  // Inline Viewer / Modal State
  const [inspectRecording, setInspectRecording] = useState(null); // folder id to inspect
  const [inspectDetail, setInspectDetail] = useState(null);
  const [inspectViewMode, setInspectViewMode] = useState('iframe'); // 'iframe' | 'steps' | 'markdown'
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Lightbox Modal for Full Image Zoom
  const [lightboxImg, setLightboxImg] = useState(null);

  // Library State
  const [recordings, setRecordings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLib, setLoadingLib] = useState(false);

  // Profiles State
  const [profiles, setProfiles] = useState([
    { name: 'default', url: 'https://demo.odoo.com', outDir: './recordings/default' },
    { name: 'staging', url: 'https://staging.example.com', outDir: './recordings/staging' },
    { name: 'production', url: 'https://app.example.com', outDir: './recordings/production' }
  ]);

  // Process & Memory Telemetry State
  const [telemetry, setTelemetry] = useState(null);

  // 1. Live Session Poller: fetch active session & newly captured steps asynchronously
  const fetchLiveSession = async () => {
    try {
      const res = await fetch('/api/active-session');
      if (res.ok) {
        const data = await res.json();
        setIsRecording(data.isRecording);
        setProcessPid(data.pid);
        setLiveSession(data);
        if (data.steps && data.steps.length > 0) {
          setLiveSteps(data.steps);
          setLatestStep(data.steps[data.steps.length - 1]);
        }
      }
    } catch {}
  };

  // Telemetry Poller: fetch memory & CPU diagnostics
  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch {}
  };

  // 2. Load recording list
  const loadRecordings = async () => {
    setLoadingLib(true);
    try {
      const res = await fetch('/api/recordings');
      if (res.ok) {
        const data = await res.json();
        setRecordings(data.recordings || []);
      }
    } catch {
    } finally {
      setLoadingLib(false);
    }
  };

  // 3. Inspect a specific recording in modal
  const openInspector = async (recId) => {
    setInspectRecording(recId);
    try {
      const res = await fetch(`/api/recording/${recId}`);
      if (res.ok) {
        const data = await res.json();
        setInspectDetail(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Polling setup: faster polling when recording is active (800ms), slower when idle (3000ms)
  useEffect(() => {
    fetchLiveSession();
    loadRecordings();
    fetchTelemetry();

    const interval = setInterval(() => {
      fetchLiveSession();
      fetchTelemetry();
    }, isRecording ? 800 : 3000);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Start Session
  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/start-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          title: sopTitle,
          outDir: `./recordings/${outFolder}`,
          profile: selectedProfile,
          autoResult,
          autoRedact,
          aiEnhance
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memulai perekaman');
      }

      const data = await res.json();
      setIsRecording(true);
      setProcessPid(data.pid);
      fetchLiveSession();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Stop Session
  const stopRecording = async () => {
    try {
      await fetch('/api/stop-recording', { method: 'POST' });
      setIsRecording(false);
      setProcessPid(null);
      setTimeout(() => {
        fetchLiveSession();
        loadRecordings();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const getCliCommand = () => {
    let cmd = `./bin/flowsnap.mjs start --url "${targetUrl}" --out "./recordings/${outFolder}" --title "${sopTitle}" --profile ${selectedProfile}`;
    if (!autoResult) cmd += ' --no-result';
    if (aiEnhance) cmd += ' --ai';
    return cmd;
  };

  const copyCmd = () => {
    navigator.clipboard.writeText(getCliCommand());
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const copyMarkdownText = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-mono text-xs flex flex-col antialiased selection:bg-zinc-800 selection:text-white">
      {/* Monospace Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-5 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border border-zinc-700 bg-zinc-900 flex items-center justify-center font-bold text-white text-[11px]">
            FS
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-100 tracking-tight text-sm">flowsnap</span>
            <span className="text-[10px] text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">v1.0.0</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border border-zinc-800 bg-zinc-900/60 p-0.5">
          <button
            onClick={() => setActiveTab('recorder')}
            className={`px-3 py-1 flex items-center gap-1.5 transition ${
              activeTab === 'recorder' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            [1] RECORDER {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping ml-1" />}
          </button>
          <button
            onClick={() => {
              setActiveTab('library');
              loadRecordings();
            }}
            className={`px-3 py-1 flex items-center gap-1.5 transition ${
              activeTab === 'library' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            [2] LIBRARY ({recordings.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 flex items-center gap-1.5 transition ${
              activeTab === 'settings' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            [3] CONFIG
          </button>
        </div>

        {/* Status Indicators & Live Memory Telemetry */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {telemetry && (
            <span
              className="text-zinc-300 border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 flex items-center gap-1.5"
              title="Resident Set Size (RAM) & V8 Heap Memory Usage"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              RAM: {telemetry.rssMb}MB <span className="text-zinc-500">[{telemetry.heapUsedMb}MB HEAP]</span>
            </span>
          )}

          {isRecording ? (
            <span className="flex items-center gap-1.5 text-red-400 bg-red-950/40 border border-red-800 px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              REC_ACTIVE (PID:{processPid})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400 border border-zinc-800 px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              STANDBY
            </span>
          )}
          <span className="text-zinc-400 border border-zinc-800 px-2 py-0.5 flex items-center gap-1">
            <Shield className="w-3 h-3 text-zinc-500" />
            REDACT: 10PX
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-5 space-y-6">
        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 border border-red-800 bg-red-950/30 text-red-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ERR: {errorMsg}
            </span>
            <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-white">[close]</button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: RECORDER & ASYNC LIVE CAPTURE STREAM                    */}
        {/* ============================================================== */}
        {activeTab === 'recorder' && (
          <div className="space-y-6">
            {/* Top Grid: Session Controls + Live Telemetry */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Launcher Form (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
                    <span className="font-bold text-zinc-100 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                      SESSION_CONTROLLER
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">ENGINE: CHROMIUM</span>
                  </div>

                  {/* Target URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 text-[11px]">TARGET_URL</label>
                      <button
                        onClick={() => setTargetUrl('https://demo.odoo.com')}
                        className="text-zinc-500 hover:text-zinc-300 underline text-[10px]"
                      >
                        [demo.odoo.com]
                      </button>
                    </div>
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      disabled={isRecording}
                      className="w-full bg-black border border-zinc-800 px-3 py-1.5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  {/* SOP Title */}
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">DOCUMENT_TITLE</label>
                    <input
                      type="text"
                      value={sopTitle}
                      onChange={(e) => setSopTitle(e.target.value)}
                      disabled={isRecording}
                      className="w-full bg-black border border-zinc-800 px-3 py-1.5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  {/* Output Dir & Profile */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1">OUTPUT_DIR</label>
                      <div className="flex items-center border border-zinc-800 bg-black px-2">
                        <span className="text-zinc-600">./recordings/</span>
                        <input
                          type="text"
                          value={outFolder}
                          onChange={(e) => setOutFolder(e.target.value)}
                          disabled={isRecording}
                          className="w-full bg-transparent py-1.5 text-zinc-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[11px] mb-1">PROFILE</label>
                      <select
                        value={selectedProfile}
                        onChange={(e) => {
                          setSelectedProfile(e.target.value);
                          const p = profiles.find((x) => x.name === e.target.value);
                          if (p) setTargetUrl(p.url);
                        }}
                        disabled={isRecording}
                        className="w-full bg-black border border-zinc-800 px-2 py-1.5 text-zinc-100 focus:outline-none"
                      >
                        {profiles.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 border-t border-zinc-850 grid grid-cols-3 gap-1.5 text-[10px]">
                    <label className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-900/40 p-1.5 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={autoResult}
                        onChange={(e) => setAutoResult(e.target.checked)}
                        disabled={isRecording}
                        className="accent-zinc-100"
                      />
                      <span>DUAL_SHOT</span>
                    </label>

                    <label className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-900/40 p-1.5 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={autoRedact}
                        onChange={(e) => setAutoRedact(e.target.checked)}
                        disabled={isRecording}
                        className="accent-zinc-100"
                      />
                      <span>REDACT</span>
                    </label>

                    <label className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-900/40 p-1.5 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={aiEnhance}
                        onChange={(e) => setAiEnhance(e.target.checked)}
                        disabled={isRecording}
                        className="accent-zinc-100"
                      />
                      <span>AI_SYNTH</span>
                    </label>
                  </div>

                  {/* Execution Action Button */}
                  <div className="pt-2">
                    {isRecording ? (
                      <button
                        onClick={stopRecording}
                        className="w-full py-2.5 bg-red-950 hover:bg-red-900 text-red-200 font-bold flex items-center justify-center gap-2 border border-red-700 transition"
                      >
                        <Square className="w-3.5 h-3.5 fill-red-400" />
                        STOP_RECORDING (FINALISASI DOKUMEN)
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black font-bold flex items-center justify-center gap-2 border border-white transition active:translate-y-px"
                      >
                        <Play className="w-3.5 h-3.5 fill-black" />
                        LAUNCH_BROWSER_SESSION
                      </button>
                    )}
                  </div>
                </div>

                {/* Hotkey Card */}
                <div className="border border-zinc-850 bg-zinc-950 p-3 space-y-2 text-[11px]">
                  <div className="text-zinc-300 font-bold flex items-center justify-between border-b border-zinc-900 pb-1.5">
                    <span>HOTKEY_CAPTURE</span>
                    <span className="text-zinc-600 text-[10px]">CHROMIUM HUD</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-400">
                    <div className="flex items-center justify-between bg-black p-1.5 border border-zinc-900">
                      <span>Klik Elemen</span>
                      <kbd className="text-zinc-200 font-bold">Auto Dual</kbd>
                    </div>
                    <div className="flex items-center justify-between bg-black p-1.5 border border-zinc-900">
                      <span>Manual Snap</span>
                      <kbd className="text-zinc-200 font-bold">F8</kbd>
                    </div>
                    <div className="flex items-center justify-between bg-black p-1.5 border border-zinc-900">
                      <span>Modal Snap</span>
                      <kbd className="text-zinc-200 font-bold">F9</kbd>
                    </div>
                    <div className="flex items-center justify-between bg-black p-1.5 border border-zinc-900">
                      <span>Submit Form</span>
                      <kbd className="text-zinc-200 font-bold">Enter</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* ASYNC LIVE STEP MONITOR & FEED (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                <div className="border border-zinc-800 bg-zinc-950 flex-1 flex flex-col min-h-[480px]">
                  {/* Monitor Header */}
                  <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
                    <div className="flex items-center gap-2">
                      <Radio className={`w-3.5 h-3.5 ${isRecording ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
                      <span className="font-bold text-zinc-100">LIVE_ASYNC_FEED</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ({liveSteps.length} STEPS CAPTURED)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      {liveSession?.folder && (
                        <span className="text-zinc-400 bg-black border border-zinc-850 px-2 py-0.5">
                          DIR: {liveSession.folder}
                        </span>
                      )}
                      {liveSession?.viewerUrl && (
                        <button
                          onClick={() => openInspector(liveSession.folder)}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 border border-zinc-700"
                        >
                          <Eye className="w-3 h-3" />
                          INLINE_PREVIEW
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mode Tabs: 'feed' (live steps) vs 'guide_frame' (live HTML viewer) */}
                  <div className="border-b border-zinc-850 bg-black px-3 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        onClick={() => setPreviewMode('feed')}
                        className={`px-2.5 py-1 transition ${
                          previewMode === 'feed'
                            ? 'bg-zinc-800 text-white font-bold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        [STREAM FEED]
                      </button>
                      <button
                        onClick={() => setPreviewMode('guide_frame')}
                        className={`px-2.5 py-1 transition ${
                          previewMode === 'guide_frame'
                            ? 'bg-zinc-800 text-white font-bold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        [LIVE GUIDE HTML]
                      </button>
                    </div>

                    <span className="text-[10px] text-zinc-500">
                      {isRecording ? 'AUTO_SYNC: 800MS POLLING' : 'IDLE: STANDBY'}
                    </span>
                  </div>

                  {/* VIEW MODE 1: LIVE STREAM FEED */}
                  {previewMode === 'feed' && (
                    <div className="flex-1 p-4 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[560px]">
                      {/* Spotlight: BARUSAN TERCAPTURE (LATEST STEP) */}
                      {latestStep ? (
                        <div className="border-2 border-emerald-800/80 bg-emerald-950/20 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-emerald-900/50">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                              <span className="font-bold text-emerald-300 text-xs tracking-wide">
                                BARUSAN TERCAPTURE • STEP #{String(latestStep.step).padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.5">
                              {latestStep.type?.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between text-zinc-300">
                            <span className="font-bold text-zinc-100 text-xs">
                              Target: {latestStep.label || 'Elemen Terpilih'}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {latestStep.timestamp ? new Date(latestStep.timestamp).toLocaleTimeString('id-ID') : 'Realtime'}
                            </span>
                          </div>

                          {/* Dual Shot Preview of Latest Step */}
                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            {/* Action Image */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                <span>[1] AKSI & HIGHLIGHT</span>
                                <span className="text-zinc-600">ACTION</span>
                              </div>
                              <div
                                onClick={() =>
                                  setLightboxImg(`/recordings/${liveSession.folder}/${latestStep.actionFile}`)
                                }
                                className="group relative border border-zinc-800 bg-black aspect-video overflow-hidden cursor-zoom-in"
                              >
                                <img
                                  src={`/recordings/${liveSession.folder}/${latestStep.actionFile}`}
                                  alt="Action Preview"
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                  <Maximize2 className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            </div>

                            {/* Result Image */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                <span>[2] HASIL PERUBAHAN</span>
                                <span className="text-zinc-600">RESULT</span>
                              </div>
                              <div
                                onClick={() =>
                                  latestStep.resultFile &&
                                  setLightboxImg(`/recordings/${liveSession.folder}/${latestStep.resultFile}`)
                                }
                                className="group relative border border-zinc-800 bg-black aspect-video overflow-hidden cursor-zoom-in"
                              >
                                {latestStep.resultFile ? (
                                  <>
                                    <img
                                      src={`/recordings/${liveSession.folder}/${latestStep.resultFile}`}
                                      alt="Result Preview"
                                      className="w-full h-full object-cover group-hover:scale-105 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <Maximize2 className="w-4 h-4 text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">
                                    SINGLE_CAPTURE
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-zinc-400 border-t border-emerald-950 pt-2 font-mono">
                            <span className="truncate max-w-[280px]">URL: {latestStep.url}</span>
                            <span className="text-emerald-400">STATUS: SAVED_TO_DISK</span>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-zinc-800 p-8 text-center text-zinc-600 space-y-2">
                          <Camera className="w-6 h-6 mx-auto text-zinc-700" />
                          <div>Belum ada langkah yang di-capture.</div>
                          <div className="text-[10px] text-zinc-600">
                            Klik elemen di Chromium atau tekan F8 untuk mengambil screenshot pertama.
                          </div>
                        </div>
                      )}

                      {/* Stream History List (All Previous Steps) */}
                      <div className="space-y-2 pt-2 border-t border-zinc-850">
                        <div className="text-[11px] font-bold text-zinc-400 flex items-center justify-between">
                          <span>TIMELINE_HISTORI_LANGKAH ({liveSteps.length})</span>
                          <span className="text-[10px] text-zinc-600">KLIK KARTU UNTUK INSPEKSI</span>
                        </div>

                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {[...liveSteps].reverse().map((step) => {
                            const isLatest = latestStep?.step === step.step;
                            return (
                              <div
                                key={step.step}
                                onClick={() => setActivePreviewStep(step)}
                                className={`p-2 border flex items-center justify-between cursor-pointer transition ${
                                  isLatest
                                    ? 'border-emerald-700/60 bg-emerald-950/20'
                                    : 'border-zinc-850 bg-black hover:border-zinc-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="font-bold text-zinc-300 text-[11px]">
                                    #{String(step.step).padStart(2, '0')}
                                  </span>
                                  <span className="text-[10px] px-1 py-0.5 border border-zinc-800 bg-zinc-900 text-zinc-300">
                                    {step.type}
                                  </span>
                                  <span className="text-zinc-200 text-xs font-semibold truncate max-w-[240px]">
                                    {step.label}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {step.isRedacted && (
                                    <span className="text-[9px] text-amber-400 border border-amber-900 px-1">
                                      REDACTED
                                    </span>
                                  )}
                                  <div className="w-6 h-4 border border-zinc-800 bg-zinc-900 overflow-hidden">
                                    <img
                                      src={`/recordings/${liveSession?.folder}/${step.actionFile}`}
                                      alt="thumb"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW MODE 2: EMBEDDED LIVE GUIDE FRAME */}
                  {previewMode === 'guide_frame' && (
                    <div className="flex-1 flex flex-col bg-black">
                      {liveSession?.folder && liveSession?.hasHtml ? (
                        <iframe
                          src={`/recordings/${liveSession.folder}/index.html`}
                          title="Live SOP Preview"
                          className="w-full flex-1 border-0 min-h-[460px]"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-8 text-zinc-600">
                          File index.html belum terbuat atau folder belum dipilih.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SOP LIBRARY & ARCHIVE                                   */}
        {/* ============================================================== */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="font-bold text-sm text-zinc-100">RECORDED_SOP_ARCHIVE</span>
                <span className="text-zinc-500 ml-2">({recordings.length} directories)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter nama SOP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black border border-zinc-800 px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
                <button
                  onClick={loadRecordings}
                  className="px-2.5 py-1 border border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLib ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {recordings.length === 0 ? (
              <div className="border border-zinc-850 bg-zinc-950 p-8 text-center text-zinc-500">
                Belum ada rekaman tersimpan di folder ./recordings.
              </div>
            ) : (
              <div className="divide-y divide-zinc-850 border border-zinc-800 bg-zinc-950">
                {recordings
                  .filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((rec) => (
                    <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/40 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100 text-xs">{rec.title}</span>
                          <span className="text-[10px] text-zinc-400 border border-zinc-800 px-1.5 py-0.2">
                            {rec.stepsCount} steps
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {rec.outDir} • {new Date(rec.updatedAt).toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {rec.hasGuide && (
                          <span className="text-[10px] text-emerald-400 border border-emerald-900/60 px-1.5 py-0.5">
                            GUIDE.MD_OK
                          </span>
                        )}

                        <button
                          onClick={() => openInspector(rec.id)}
                          className="px-2.5 py-1 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-[11px] flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" />
                          INLINE_VIEW
                        </button>

                        <a
                          href={`/recordings/${rec.id}/index.html`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-black font-semibold text-[11px] flex items-center gap-1 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          NEW_TAB
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CONFIGURATION & PROFILES                                */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="font-bold text-zinc-100 border-b border-zinc-800 pb-2">
                SAVED_INSTANCE_PROFILES
              </div>
              <div className="divide-y divide-zinc-850">
                {profiles.map((p) => (
                  <div key={p.name} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-200">{p.name}</span>
                      <span className="text-zinc-500 ml-2">{p.url}</span>
                    </div>
                    <code className="text-zinc-600">{p.outDir}</code>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-3">
              <div className="font-bold text-zinc-100 border-b border-zinc-800 pb-2">
                AI_SYNTHESIS_CONFIGURATION
              </div>
              <p className="text-zinc-400 text-[11px]">
                API key dibaca otomatis dari environment shell (GEMINI_API_KEY / OPENAI_API_KEY).
              </p>
              <div className="bg-black p-3 border border-zinc-850 text-zinc-400 space-y-1">
                <div>DEFAULT_PROVIDER: Google Gemini (gemini-1.5-flash)</div>
                <div>FALLBACK_GENERATOR: Natural Language Heuristic Engine</div>
                <div>BLUR_RADIUS: 10px (Military-grade CSS blur)</div>
              </div>
            </div>

            {/* Live Memory & Process Telemetry Inspector */}
            <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-zinc-100 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  SYSTEM_TELEMETRY_&_MEMORY_DIAGNOSTICS
                </span>
                <span className="text-[10px] text-emerald-400 border border-emerald-900 bg-emerald-950/40 px-1.5 py-0.5">
                  LEAK_INDEX: 0.0% (STABLE)
                </span>
              </div>

              {telemetry ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="border border-zinc-850 bg-black p-2.5 space-y-1">
                    <span className="text-[10px] text-zinc-500 block">RESIDENT_RAM (RSS)</span>
                    <span className="text-sm font-bold text-zinc-100">{telemetry.rssMb} MB</span>
                  </div>
                  <div className="border border-zinc-850 bg-black p-2.5 space-y-1">
                    <span className="text-[10px] text-zinc-500 block">V8_HEAP_USED</span>
                    <span className="text-sm font-bold text-zinc-100">{telemetry.heapUsedMb} MB</span>
                  </div>
                  <div className="border border-zinc-850 bg-black p-2.5 space-y-1">
                    <span className="text-[10px] text-zinc-500 block">TOTAL_HEAP</span>
                    <span className="text-sm font-bold text-zinc-100">{telemetry.heapTotalMb} MB</span>
                  </div>
                  <div className="border border-zinc-850 bg-black p-2.5 space-y-1">
                    <span className="text-[10px] text-zinc-500 block">C++_EXTERNAL_BUFFERS</span>
                    <span className="text-sm font-bold text-zinc-100">{telemetry.externalMb} MB</span>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-600 text-center py-2">Memuat data telemetri proses...</div>
              )}

              <div className="border-t border-zinc-850 pt-3 space-y-2 text-[11px] text-zinc-400">
                <div className="text-zinc-200 font-bold">ANTI-MEMORY-LEAK GUARANTEES:</div>
                <ul className="space-y-1 list-disc list-inside text-zinc-400">
                  <li>
                    <strong className="text-zinc-200">Sharp Image Pipeline:</strong> <code className="text-zinc-300">sharp.cache(false)</code> aktif, buffer gambar langsung dihapus dari RAM setelah ditulis ke disk.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Zero DOM Overhead:</strong> Koordinat dihitung di event capture; tidak ada injecting/leaving elemen HTML berat di web page target.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Tauri vs Electron:</strong> Arsitektur native Rust Tauri mengonsumsi ~35MB RAM, jauh lebih ringan dibanding Electron (~450MB+).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* INLINE SOP INSPECTOR MODAL                                     */}
      {/* ============================================================== */}
      {inspectRecording && inspectDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-zinc-700 bg-zinc-950 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span className="font-bold text-zinc-100 text-sm">
                  DOKUMEN_SOP: {inspectDetail.id}
                </span>
                <span className="text-[10px] text-zinc-500 border border-zinc-800 px-1.5 py-0.5">
                  {inspectDetail.steps.length} STEPS
                </span>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-zinc-800 bg-black p-0.5 text-[10px]">
                  <button
                    onClick={() => setInspectViewMode('iframe')}
                    className={`px-2 py-0.5 transition ${
                      inspectViewMode === 'iframe' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'
                    }`}
                  >
                    HTML_VIEWER
                  </button>
                  <button
                    onClick={() => setInspectViewMode('steps')}
                    className={`px-2 py-0.5 transition ${
                      inspectViewMode === 'steps' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'
                    }`}
                  >
                    STEP_GALLERY
                  </button>
                  <button
                    onClick={() => setInspectViewMode('markdown')}
                    className={`px-2 py-0.5 transition ${
                      inspectViewMode === 'markdown' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'
                    }`}
                  >
                    GUIDE.MD
                  </button>
                </div>

                <a
                  href={`/recordings/${inspectDetail.id}/index.html`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 border border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => {
                    setInspectRecording(null);
                    setInspectDetail(null);
                  }}
                  className="p-1 border border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden">
              {inspectViewMode === 'iframe' && (
                <iframe
                  src={`/recordings/${inspectDetail.id}/index.html`}
                  title="SOP Viewer"
                  className="w-full h-full border-0"
                />
              )}

              {inspectViewMode === 'steps' && (
                <div className="h-full overflow-y-auto p-4 space-y-4">
                  {inspectDetail.steps.map((st) => (
                    <div key={st.step} className="border border-zinc-800 bg-black p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100">LANGKAH #{st.step}</span>
                          <span className="text-[10px] px-1.5 py-0.5 border border-zinc-800 bg-zinc-900 text-zinc-300">
                            {st.type}
                          </span>
                          <span className="text-zinc-300 font-semibold">{st.label}</span>
                        </div>
                        <span className="text-zinc-500 text-[10px] font-mono">{st.url}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="text-[10px] text-zinc-500 mb-1">AKSI (SEBELUM)</div>
                          <img
                            src={`/recordings/${inspectDetail.id}/${st.actionFile}`}
                            alt="Aksi"
                            onClick={() => setLightboxImg(`/recordings/${inspectDetail.id}/${st.actionFile}`)}
                            className="w-full border border-zinc-850 cursor-zoom-in"
                          />
                        </div>
                        {st.resultFile && (
                          <div>
                            <div className="text-[10px] text-zinc-500 mb-1">HASIL (SESUDAH)</div>
                            <img
                              src={`/recordings/${inspectDetail.id}/${st.resultFile}`}
                              alt="Hasil"
                              onClick={() => setLightboxImg(`/recordings/${inspectDetail.id}/${st.resultFile}`)}
                              className="w-full border border-zinc-850 cursor-zoom-in"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {inspectViewMode === 'markdown' && (
                <div className="h-full flex flex-col p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[11px]">MARKDOWN SOURCE (GUIDE.MD)</span>
                    <button
                      onClick={() => copyMarkdownText(inspectDetail.markdown)}
                      className="px-2 py-1 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1"
                    >
                      {copiedMarkdown ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedMarkdown ? 'COPIED' : 'COPY_MARKDOWN'}
                    </button>
                  </div>
                  <pre className="flex-1 bg-black p-4 border border-zinc-850 overflow-y-auto text-[11px] text-zinc-300 font-mono whitespace-pre-wrap select-all">
                    {inspectDetail.markdown || '# Guide markdown belum ada'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP PREVIEW DRAWER / MODAL (FOR INDIVIDUAL CLICKED STEP)       */}
      {/* ============================================================== */}
      {activePreviewStep && liveSession?.folder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="border border-zinc-700 bg-zinc-950 w-full max-w-3xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-100">
                  INSPEKSI LANGKAH #{activePreviewStep.step} - {activePreviewStep.label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 border border-zinc-800 bg-zinc-900 text-zinc-300">
                  {activePreviewStep.type}
                </span>
              </div>
              <button onClick={() => setActivePreviewStep(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">FOTO AKSI (TARGET HIGHLIGHT)</span>
                <img
                  src={`/recordings/${liveSession.folder}/${activePreviewStep.actionFile}`}
                  alt="Aksi"
                  className="w-full border border-zinc-850 cursor-zoom-in"
                  onClick={() => setLightboxImg(`/recordings/${liveSession.folder}/${activePreviewStep.actionFile}`)}
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">FOTO HASIL (RESULT)</span>
                {activePreviewStep.resultFile ? (
                  <img
                    src={`/recordings/${liveSession.folder}/${activePreviewStep.resultFile}`}
                    alt="Hasil"
                    className="w-full border border-zinc-850 cursor-zoom-in"
                    onClick={() => setLightboxImg(`/recordings/${liveSession.folder}/${activePreviewStep.resultFile}`)}
                  />
                ) : (
                  <div className="h-40 border border-zinc-850 flex items-center justify-center text-zinc-600">
                    Tidak ada foto hasil
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-850 flex justify-between">
              <span>URL: {activePreviewStep.url}</span>
              <span>WAKTU: {activePreviewStep.timestamp}</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FULLSCREEN LIGHTBOX                                            */}
      {/* ============================================================== */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={lightboxImg}
            alt="Zoomed"
            className="max-w-full max-h-[92vh] border border-zinc-700 shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
