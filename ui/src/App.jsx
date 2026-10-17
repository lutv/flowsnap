import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('recorder'); // 'recorder' | 'library' | 'settings'

  // Recording State
  const [targetUrl, setTargetUrl] = useState('https://demo.odoo.com');
  const [sopTitle, setSopTitle] = useState('SOP Pembuatan Invoice & Faktur');
  const [outFolder, setOutFolder] = useState('invoice-guide');
  const [selectedProfile, setSelectedProfile] = useState('default');
  const [autoResult, setAutoResult] = useState(true);
  const [autoRedact, setAutoRedact] = useState(true);
  const [aiEnhance, setAiEnhance] = useState(true);

  // Live Process State
  const [isRecording, setIsRecording] = useState(false);
  const [processPid, setProcessPid] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

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

  // Check server status periodically
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setIsRecording(data.isRecording);
        setProcessPid(data.pid);
      }
    } catch {}
  };

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

  useEffect(() => {
    checkStatus();
    loadRecordings();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

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
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const stopRecording = async () => {
    try {
      await fetch('/api/stop-recording', { method: 'POST' });
      setIsRecording(false);
      setProcessPid(null);
      setTimeout(loadRecordings, 1500);
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

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-mono text-xs flex flex-col antialiased selection:bg-zinc-800 selection:text-white">
      {/* Monospace Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-5 py-3 flex items-center justify-between">
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
            [1] RECORDER
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

        {/* Status Indicators */}
        <div className="flex items-center gap-3 text-[11px]">
          {isRecording ? (
            <span className="flex items-center gap-1.5 text-red-400 bg-red-950/40 border border-red-800 px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
              REC_ACTIVE (PID:{processPid})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400 border border-zinc-800 px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              IDLE
            </span>
          )}
          <span className="text-zinc-500 border border-zinc-800 px-2 py-0.5">
            REDACT: ON
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 p-3 border border-red-800 bg-red-950/30 text-red-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ERR: {errorMsg}
            </span>
            <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-white">[close]</button>
          </div>
        )}

        {/* TAB 1: RECORDER */}
        {activeTab === 'recorder' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Form & Controller */}
            <div className="md:col-span-2 space-y-5">
              <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <span className="font-bold text-zinc-100 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-400" />
                    SESSION_LAUNCHER
                  </span>
                  <span className="text-[10px] text-zinc-500">ENGINE: PLAYWRIGHT</span>
                </div>

                {/* Target URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400">TARGET_URL</label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        onClick={() => setTargetUrl('https://demo.odoo.com')}
                        className="text-zinc-500 hover:text-zinc-300 underline"
                      >
                        [demo.odoo.com]
                      </button>
                      <button
                        onClick={() => setTargetUrl('https://staging.example.com')}
                        className="text-zinc-500 hover:text-zinc-300 underline"
                      >
                        [staging.example]
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    disabled={isRecording}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* SOP Title */}
                <div>
                  <label className="block text-zinc-400 mb-1">DOCUMENT_TITLE</label>
                  <input
                    type="text"
                    value={sopTitle}
                    onChange={(e) => setSopTitle(e.target.value)}
                    disabled={isRecording}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Output Folder Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">OUTPUT_DIR</label>
                    <div className="flex items-center border border-zinc-800 bg-black px-2">
                      <span className="text-zinc-600">./recordings/</span>
                      <input
                        type="text"
                        value={outFolder}
                        onChange={(e) => setOutFolder(e.target.value)}
                        disabled={isRecording}
                        className="w-full bg-transparent py-2 text-zinc-100 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">PROFILE</label>
                    <select
                      value={selectedProfile}
                      onChange={(e) => {
                        setSelectedProfile(e.target.value);
                        const p = profiles.find((x) => x.name === e.target.value);
                        if (p) setTargetUrl(p.url);
                      }}
                      disabled={isRecording}
                      className="w-full bg-black border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                    >
                      {profiles.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name.toUpperCase()} ({p.url})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Option Toggles */}
                <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/40 p-2 cursor-pointer hover:border-zinc-700">
                    <input
                      type="checkbox"
                      checked={autoResult}
                      onChange={(e) => setAutoResult(e.target.checked)}
                      disabled={isRecording}
                      className="accent-zinc-100"
                    />
                    <span>DUAL_CAPTURE</span>
                  </label>

                  <label className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/40 p-2 cursor-pointer hover:border-zinc-700">
                    <input
                      type="checkbox"
                      checked={autoRedact}
                      onChange={(e) => setAutoRedact(e.target.checked)}
                      disabled={isRecording}
                      className="accent-zinc-100"
                    />
                    <span>AUTO_REDACT</span>
                  </label>

                  <label className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/40 p-2 cursor-pointer hover:border-zinc-700">
                    <input
                      type="checkbox"
                      checked={aiEnhance}
                      onChange={(e) => setAiEnhance(e.target.checked)}
                      disabled={isRecording}
                      className="accent-zinc-100"
                    />
                    <span>AI_SYNTHESIS</span>
                  </label>
                </div>

                {/* Execution Button */}
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  {isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="w-full py-2.5 bg-red-900 hover:bg-red-800 text-white font-bold flex items-center justify-center gap-2 border border-red-700 transition"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      STOP_RECORDING (SELESAIKAN DOKUMEN)
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black font-bold flex items-center justify-center gap-2 border border-white transition active:translate-y-px"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      LAUNCH_BROWSER_SESSION (BUKA CHROMIUM)
                    </button>
                  )}
                </div>
              </div>

              {/* Terminal CLI Command Box */}
              <div className="border border-zinc-850 bg-zinc-950 p-3">
                <div className="flex items-center justify-between mb-1.5 text-[10px] text-zinc-500">
                  <span>CLI_EQUIVALENT</span>
                  <button onClick={copyCmd} className="text-zinc-400 hover:text-white flex items-center gap-1">
                    {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedCmd ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <code className="text-[11px] text-zinc-300 break-all select-all block bg-black p-2 border border-zinc-900">
                  {getCliCommand()}
                </code>
              </div>
            </div>

            {/* Right Column: Hotkey & System Telemetry */}
            <div className="space-y-5">
              <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                <div className="text-zinc-100 font-bold border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-zinc-400" />
                  HOTKEY_REFERENCE
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Click Action</span>
                    <kbd className="px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 text-zinc-200">Mouse1</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Instant Screen</span>
                    <kbd className="px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 text-zinc-200 font-bold">F8</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Modal Dialog</span>
                    <kbd className="px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 text-zinc-200 font-bold">F9</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Input Submit</span>
                    <kbd className="px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 text-zinc-200">Enter</kbd>
                  </div>
                </div>
              </div>

              {/* Behavior Note */}
              <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-[11px] text-zinc-400">
                <div className="text-zinc-200 font-bold">ENGINE_NOTES</div>
                <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
                  <li>Chromium terbuka di jendela terpisah dengan viewport asli.</li>
                  <li>Target klik ditandai kotak merah + nomor urut secara otomatis.</li>
                  <li>Password & kredensial disensor blur 10px saat capture.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIBRARY */}
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
                  placeholder="Filter SOP..."
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
                        <a
                          href={`/recordings/${rec.id}/index.html`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-zinc-100 hover:bg-white text-black font-semibold text-[11px] flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          OPEN_VIEWER
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONFIG */}
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
                API key dibaca otomatis dari environment variabel shell (GEMINI_API_KEY / OPENAI_API_KEY).
              </p>
              <div className="bg-black p-3 border border-zinc-850 text-zinc-400 space-y-1">
                <div>DEFAULT_PROVIDER: Google Gemini (gemini-1.5-flash)</div>
                <div>FALLBACK_GENERATOR: Natural Language Heuristic Engine</div>
                <div>BLUR_RADIUS: 10px (Military-grade CSS blur)</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
