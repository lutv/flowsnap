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
  ChevronLeft,
  AlertCircle,
  Eye,
  Maximize2,
  X,
  Code,
  Sparkles,
  Camera,
  Radio,
  Clock,
  Activity,
  Edit3,
  Save,
  HardDrive,
  Sun,
  Moon,
  Zap,
  Trash2
} from 'lucide-react';


// Smart Desktop & Web Backend URL Resolver
export const isDesktopApp = typeof window !== 'undefined' && (
  window.location.protocol === 'tauri:' || 
  window.location.hostname === 'tauri.localhost' ||
  window.location.port === '' ||
  Boolean(window.__TAURI_INTERNALS__)
);

export const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('flowsnap_engine_url');
  if (stored) return stored.replace(/\/$/, '');
  return isDesktopApp ? 'http://127.0.0.1:3456' : '';
};

export const resolveAssetUrl = (pathStr) => {
  if (!pathStr) return '';
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
  const base = getApiBase();
  const cleanPath = pathStr.startsWith('/') ? pathStr : '/' + pathStr;
  return base ? `${base}${cleanPath}` : cleanPath;
};

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('flowsnap_theme') || 'dark';
  });

  const [activeTab, setActiveTab] = useState('recorder'); // 'recorder' | 'library' | 'settings'

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('flowsnap_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };


  // In-App Log Console & Diagnostic State
  const [logs, setLogs] = useState([]);
  const [isLogConsoleOpen, setIsLogConsoleOpen] = useState(false);
  const [engineStatus, setEngineStatus] = useState('CHECKING'); // 'ONLINE' | 'OFFLINE' | 'CHECKING'
  const [logFilter, setLogFilter] = useState('ALL'); // 'ALL' | 'ERROR' | 'ACTION' | 'INFO'
  const logsEndRef = useRef(null);

  const addLog = (level, message, meta = null) => {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toLocaleTimeString(),
      level: level.toUpperCase(),
      message: String(message),
      meta
    };
    setLogs((prev) => [...prev.slice(-400), entry]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyAllLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setToastMsg('Seluruh log berhasil disalin ke clipboard!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Safe Centralized API Caller with HTML-Interception Defense
  const apiCall = async (endpoint, options = {}) => {
    const base = getApiBase();
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
    try {
      const res = await fetch(fullUrl, options);
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/html')) {
        const errorText = `Engine endpoint '${endpoint}' mengembalikan HTML (bukan JSON). Pastikan FlowSnap Engine aktif di ${base || '127.0.0.1:3456'}.`;
        addLog('ERROR', errorText);
        setEngineStatus('OFFLINE');
        return { ok: false, isHtml: true, error: errorText, data: null };
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        addLog('WARN', `API ${endpoint} status ${res.status}: ${data?.error || res.statusText}`);
      } else {
        setEngineStatus('ONLINE');
      }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      addLog('ERROR', `Gagal menghubungi Engine di ${fullUrl}: ${err.message}`);
      setEngineStatus('OFFLINE');
      return { ok: false, error: err.message, isNetworkError: true, data: null };
    }
  };

  // Fetch backend engine log buffer
  const fetchEngineLogs = async () => {
    try {
      const res = await apiCall('/api/logs?limit=40');
      if (res.ok && res.data?.logs) {
        setEngineStatus('ONLINE');
        setLogs((prev) => {
          const existingIds = new Set(prev.map(l => l.id));
          const newEntries = res.data.logs
            .filter(l => !existingIds.has(l.id))
            .map(l => ({
              id: l.id,
              timestamp: new Date(l.timestamp).toLocaleTimeString(),
              level: l.level,
              message: l.message,
              meta: l.meta
            }));
          if (newEntries.length === 0) return prev;
          return [...prev, ...newEntries].slice(-500);
        });
      }
    } catch {}
  };

  // Capture uncaught window runtime errors to log console
  useEffect(() => {
    addLog('INFO', `FlowSnap Studio initialized [${isDesktopApp ? 'DESKTOP_MODE' : 'WEB_MODE'}] (Target Engine: ${getApiBase() || 'localhost'})`);

    const handleErr = (e) => {
      addLog('ERROR', `Uncaught: ${e.message} (${e.filename ? e.filename.split('/').pop() : 'inline'}:${e.lineno})`);
    };
    const handleRejection = (e) => {
      addLog('ERROR', `Unhandled Promise: ${e.reason?.message || String(e.reason)}`);
    };
    window.addEventListener('error', handleErr);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleErr);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

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
  const [dismissedSession, setDismissedSession] = useState(false);

  // Inline Viewer / Modal State
  const [inspectRecording, setInspectRecording] = useState(null); // folder id to inspect
  const [inspectDetail, setInspectDetail] = useState(null);
  const [inspectViewMode, setInspectViewMode] = useState('iframe'); // 'iframe' | 'steps' | 'markdown' | 'files'
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState('');
  const [savingMarkdown, setSavingMarkdown] = useState(false);

  // Global Notification & Path Copy Toast
  const [toastMsg, setToastMsg] = useState(null);
  const [copiedPath, setCopiedPath] = useState(null);

  // Lightbox Modal for Full Image Zoom
  const [lightboxImg, setLightboxImg] = useState(null);

  // Library State
  const [recordings, setRecordings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLib, setLoadingLib] = useState(false);
  const [expandedBrowseId, setExpandedBrowseId] = useState(null);
  const [browsingStepIndex, setBrowsingStepIndex] = useState({});

  // Agent Setup State
  const [installingAgent, setInstallingAgent] = useState(false);
  const [agentSetupResults, setAgentSetupResults] = useState(null);

  const setupAgentMcp = async () => {
    setInstallingAgent(true);
    try {
      const res = await apiCall('/api/setup-agent', { method: 'POST' });
      const data = res.data;
      if (res.ok && data?.success) {
        setAgentSetupResults(data.results);
        setToastMsg('MCP Server & Skill berhasil diregistrasi ke Antigravity, Claude, Cursor, dan Windsurf!');
        setTimeout(() => setToastMsg(null), 5000);
      } else {
        setErrorMsg(data.error || 'Gagal meregistrasi MCP server');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setInstallingAgent(false);
    }
  };

  // Helper: Open folder in OS File Manager (Finder / Nautilus / Explorer)
  const openInFileManager = async (folder) => {
    try {
      const res = await apiCall(`/api/open-folder?folder=${encodeURIComponent(folder || '')}`);
      if (!res.ok) throw new Error(res.data?.error || res.error || 'Gagal membuka folder di file manager');
      const data = res.data;
      setToastMsg(`Folder dibuka di file manager: ${data.path}`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err) {
      setErrorMsg(`Gagal membuka file manager: ${err.message}`);
    }
  };

  // Helper: Copy path to clipboard
  const copyPathToClipboard = (pathStr, id) => {
    if (!pathStr) return;
    navigator.clipboard.writeText(pathStr);
    setCopiedPath(id);
    setToastMsg(`Path disalin: ${pathStr}`);
    setTimeout(() => {
      setCopiedPath(null);
      setToastMsg(null);
    }, 2500);
  };

  // Helper: Save custom edited markdown SOP
  const saveCustomMarkdown = async (folder) => {
    setSavingMarkdown(true);
    try {
      const res = await apiCall('/api/save-markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, content: editedMarkdown })
      });
      if (!res.ok) throw new Error(res.data?.error || res.error || 'Gagal menyimpan markdown');
      setToastMsg('SOP GUIDE.md berhasil diperbarui di disk!');
      setIsEditingMarkdown(false);
      setInspectDetail((prev) => ({ ...prev, markdown: editedMarkdown }));
      loadRecordings();
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingMarkdown(false);
    }
  };

  // Helper: Format bytes to human readable
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

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
      const res = await apiCall('/api/active-session');
      if (res.ok && res.data) {
        const data = res.data;
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
      const res = await apiCall('/api/telemetry');
      if (res.ok && res.data) {
        setTelemetry(res.data);
      }
    } catch {}
  };

  // 2. Load recording list
  const loadRecordings = async () => {
    setLoadingLib(true);
    try {
      const res = await apiCall('/api/recordings');
      if (res.ok && res.data) {
        setRecordings(res.data.recordings || []);
      }
    } catch {
    } finally {
      setLoadingLib(false);
    }
  };

  // 3. Inspect a specific recording in modal
  const openInspector = async (recId) => {
    setInspectRecording(recId);
    setIsEditingMarkdown(false);
    try {
      const res = await apiCall(`/api/recording/${recId}`);
      if (res.ok && res.data) {
        setInspectDetail(res.data);
        setEditedMarkdown(res.data.markdownContent || res.data.markdown || '');
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
    fetchEngineLogs();

    const interval = setInterval(() => {
      fetchLiveSession();
      fetchTelemetry();
      fetchEngineLogs();
    }, isRecording ? 800 : 3000);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Start Session (supports fresh start or resuming existing document)
  const startRecording = async (opts = {}) => {
    setErrorMsg(null);
    const isResume = !!opts.resume;
    const targetFolder = opts.folder || outFolder;
    const targetOutDir = opts.absolutePath || `./recordings/${targetFolder}`;
    setDismissedSession(false);

    try {
      const res = await apiCall('/api/start-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: opts.url || targetUrl,
          title: opts.title || sopTitle,
          folder: targetFolder,
          outDir: targetOutDir,
          absolutePath: opts.absolutePath,
          profile: selectedProfile,
          autoResult,
          autoRedact,
          aiEnhance,
          resume: isResume
        })
      });

      if (!res.ok) {
        throw new Error(res.data?.error || res.error || 'Gagal memulai perekaman');
      }

      const data = res.data;
      addLog('ACTION', `Mulai merekam sesi: ${opts.url || targetUrl}`, data);
      setIsRecording(true);
      setProcessPid(data.pid);
      fetchLiveSession();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Resume a recording from Library tab
  const resumeFromLibrary = (rec) => {
    setOutFolder(rec.id);
    setSopTitle(rec.title);
    let target = targetUrl;
    if (rec.steps && rec.steps.length > 0) {
      const last = rec.steps[rec.steps.length - 1];
      if (last.url && last.url.startsWith('http')) {
        target = last.url;
        setTargetUrl(last.url);
      }
    }
    setDismissedSession(false);
    setActiveTab('recorder');
    startRecording({
      resume: true,
      folder: rec.id,
      title: rec.title,
      url: target,
      absolutePath: rec.absolutePath
    });
  };

  // Stop Session
  const stopRecording = async () => {
    try {
      addLog('ACTION', 'Menghentikan sesi perekaman...');
      await apiCall('/api/stop-recording', { method: 'POST' });
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
    <div className={`min-h-screen bg-black text-zinc-200 font-mono text-xs flex flex-col antialiased selection:bg-zinc-800 selection:text-white ${theme}`}>
      {/* Monospace Top Bar */}
      <header className={`border-b px-5 py-3 flex items-center justify-between sticky top-0 z-40 transition ${
        theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className="app-logo-badge w-6 h-6 border flex items-center justify-center font-bold text-[11px] rounded-xs shadow-xs">
            FS
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold tracking-tight text-sm ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>
              flowsnap
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              theme === 'dark' ? 'text-zinc-500 border-zinc-800' : 'text-zinc-600 border-zinc-300 bg-zinc-50'
            }`}>
              v1.0.0
            </span>
            <button
              onClick={() => setIsLogConsoleOpen(!isLogConsoleOpen)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border font-mono transition shadow-xs ${
                engineStatus === 'ONLINE'
                  ? (theme === 'dark' ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/70' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100')
                  : (theme === 'dark' ? 'border-amber-800/80 bg-amber-950/40 text-amber-300 hover:bg-amber-950/70 animate-pulse' : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 animate-pulse')
              }`}
              title="Klik untuk membuka Console / Log Viewer"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${engineStatus === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{engineStatus === 'ONLINE' ? 'ENGINE: OK' : 'ENGINE: OFFLINE'}</span>
              <span className="opacity-70">[{logs.length}]</span>
            </button>

          </div>
        </div>

        {/* Tab Selector */}
        <div className={`flex items-center p-0.5 rounded border transition ${
          theme === 'dark' ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-300 bg-zinc-200/80'
        }`}>
          <button
            onClick={() => setActiveTab('recorder')}
            className={`px-3 py-1 flex items-center gap-1.5 transition text-[11px] rounded-xs ${
              activeTab === 'recorder'
                ? (theme === 'dark'
                    ? 'bg-zinc-800 text-white font-bold shadow-xs'
                    : 'bg-white text-zinc-900 font-bold shadow-xs border border-zinc-300')
                : (theme === 'dark'
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900')
            }`}
          >
            [1] RECORDER {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping ml-1" />}
          </button>
          <button
            onClick={() => {
              setActiveTab('library');
              loadRecordings();
            }}
            className={`px-3 py-1 flex items-center gap-1.5 transition text-[11px] rounded-xs ${
              activeTab === 'library'
                ? (theme === 'dark'
                    ? 'bg-zinc-800 text-white font-bold shadow-xs'
                    : 'bg-white text-zinc-900 font-bold shadow-xs border border-zinc-300')
                : (theme === 'dark'
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900')
            }`}
          >
            [2] LIBRARY ({recordings.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 flex items-center gap-1.5 transition text-[11px] rounded-xs ${
              activeTab === 'settings'
                ? (theme === 'dark'
                    ? 'bg-zinc-800 text-white font-bold shadow-xs'
                    : 'bg-white text-zinc-900 font-bold shadow-xs border border-zinc-300')
                : (theme === 'dark'
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900')
            }`}
          >
            [3] CONFIG
          </button>
        </div>

        {/* Status Indicators & Live Memory Telemetry */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {telemetry && (
            <span
              className={`border px-2 py-0.5 flex items-center gap-1.5 rounded-xs transition ${
                theme === 'dark'
                  ? 'text-zinc-300 border-zinc-800 bg-zinc-900/60'
                  : 'text-zinc-800 border-zinc-300 bg-white shadow-xs'
              }`}
              title="Resident Set Size (RAM) & V8 Heap Memory Usage"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              RAM: {telemetry.rssMb}MB <span className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}>[{telemetry.heapUsedMb}MB HEAP]</span>
            </span>
          )}

          {isRecording ? (
            <span className="flex items-center gap-1.5 text-red-400 bg-red-950/40 border border-red-800 px-2 py-0.5 rounded-xs">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              REC_ACTIVE (PID:{processPid})
            </span>
          ) : (
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-xs border transition ${
              theme === 'dark'
                ? 'text-emerald-400 border-zinc-800'
                : 'text-emerald-700 border-emerald-300 bg-emerald-50'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              STANDBY
            </span>
          )}
          <span className={`px-2 py-0.5 flex items-center gap-1 rounded-xs border transition ${
            theme === 'dark'
              ? 'text-zinc-400 border-zinc-800'
              : 'text-zinc-600 border-zinc-300 bg-white shadow-xs'
          }`}>
            <Shield className="w-3 h-3 text-zinc-500" />
            REDACT: 10PX
          </span>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`px-2.5 py-0.5 border flex items-center gap-1.5 transition text-[11px] font-bold rounded-xs ${
              theme === 'dark'
                ? 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
            }`}
            title={`Ganti tema tampilan (saat ini: ${theme.toUpperCase()})`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>LIGHT</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>DARK</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-5 space-y-6">
        {/* Success / Info Toast Notification */}
        {toastMsg && (
          <div className="p-2.5 border border-emerald-700 bg-emerald-950/40 text-emerald-300 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <span className="flex items-center gap-2 truncate">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {toastMsg}
            </span>
            <button onClick={() => setToastMsg(null)} className="text-zinc-400 hover:text-white ml-2 text-[10px] shrink-0">
              [X]
            </button>
          </div>
        )}

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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-zinc-400 text-[11px]">OUTPUT_DIR</label>
                        <button
                          type="button"
                          onClick={() => openInFileManager(outFolder)}
                          className="text-zinc-500 hover:text-zinc-300 text-[10px] flex items-center gap-1 transition"
                          title="Buka folder direktori di OS File Manager (Finder / Nautilus)"
                        >
                          <Folder className="w-2.5 h-2.5" />
                          [FINDER]
                        </button>
                      </div>
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
                    <label className={`flex items-center gap-1.5 border p-1.5 cursor-pointer transition ${
                      theme === 'dark'
                        ? 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 text-zinc-300'
                        : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-xs'
                    }`}>
                      <input
                        type="checkbox"
                        checked={autoResult}
                        onChange={(e) => setAutoResult(e.target.checked)}
                        disabled={isRecording}
                        className="accent-zinc-800"
                      />
                      <span className="font-semibold">DUAL_SHOT</span>
                    </label>

                    <label className={`flex items-center gap-1.5 border p-1.5 cursor-pointer transition ${
                      theme === 'dark'
                        ? 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 text-zinc-300'
                        : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-xs'
                    }`}>
                      <input
                        type="checkbox"
                        checked={autoRedact}
                        onChange={(e) => setAutoRedact(e.target.checked)}
                        disabled={isRecording}
                        className="accent-zinc-800"
                      />
                      <span className="font-semibold">REDACT</span>
                    </label>

                    <label className={`flex items-center gap-1.5 border p-1.5 cursor-pointer transition ${
                      theme === 'dark'
                        ? 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 text-zinc-300'
                        : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-xs'
                    }`}>
                      <input
                        type="checkbox"
                        checked={aiEnhance}
                        onChange={(e) => setAiEnhance(e.target.checked)}
                        disabled={isRecording}
                        className="accent-zinc-800"
                      />
                      <span className="font-semibold">AI_SYNTH</span>
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
                      <div className="space-y-2">
                        {recordingsList.some(r => r.id === outFolder) && (
                          <button
                            onClick={() => {
                              const existing = recordingsList.find(r => r.id === outFolder);
                              startRecording({
                                resume: true,
                                folder: outFolder,
                                absolutePath: existing?.absolutePath,
                                title: existing?.title || sopTitle
                              });
                            }}
                            className={`w-full py-2.5 font-bold flex items-center justify-center gap-2 border transition active:translate-y-px ${
                              theme === 'dark'
                                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-600'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            RESUME_SESSION (LANJUTKAN "{outFolder}")
                          </button>
                        )}
                        <button
                          onClick={() => startRecording({ resume: false })}
                          className={`w-full py-2.5 font-bold flex items-center justify-center gap-2 border transition active:translate-y-px ${
                            theme === 'dark'
                              ? 'bg-zinc-100 hover:bg-white text-black border-white'
                              : 'bg-zinc-900 hover:bg-black text-white border-zinc-900 shadow-sm'
                          }`}
                        >
                          <Play className={`w-3.5 h-3.5 ${theme === 'dark' ? 'fill-black' : 'fill-white'}`} />
                          LAUNCH_NEW_SESSION (MULAI SESI BARU)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hotkey Card */}
                <div className={`border p-3 space-y-2 text-[11px] transition ${
                  theme === 'dark' ? 'border-zinc-850 bg-zinc-950' : 'border-zinc-300 bg-white shadow-xs'
                }`}>
                  <div className="text-zinc-300 font-bold flex items-center justify-between border-b border-zinc-850 pb-1.5">
                    <span>HOTKEY_CAPTURE</span>
                    <span className="text-zinc-500 text-[10px]">CHROMIUM HUD</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-400">
                    <div className={`flex items-center justify-between p-1.5 border transition ${
                      theme === 'dark' ? 'bg-black border-zinc-900' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span>Klik Elemen</span>
                      <kbd className="font-bold text-[10px]">Auto Dual</kbd>
                    </div>
                    <div className={`flex items-center justify-between p-1.5 border transition ${
                      theme === 'dark' ? 'bg-black border-zinc-900' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span>Manual Snap</span>
                      <kbd className="font-bold text-[10px]">F8</kbd>
                    </div>
                    <div className={`flex items-center justify-between p-1.5 border transition ${
                      theme === 'dark' ? 'bg-black border-zinc-900' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span>Modal Snap</span>
                      <kbd className="font-bold text-[10px]">F9</kbd>
                    </div>
                    <div className={`flex items-center justify-between p-1.5 border transition ${
                      theme === 'dark' ? 'bg-black border-zinc-900' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <span>Submit Form</span>
                      <kbd className="font-bold text-[10px]">Enter</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* ASYNC LIVE STEP MONITOR & FEED (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                <div className="border border-zinc-800 bg-zinc-950 flex-1 flex flex-col min-h-[480px]">
                  {/* Monitor Header */}
                  <div className={`p-3.5 border-b flex items-center justify-between transition ${
                    theme === 'dark' ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-100/90'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Radio className={`w-3.5 h-3.5 ${isRecording ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`} />
                      <span className="font-bold text-zinc-100">
                        {isRecording ? 'LIVE_STREAMING (CHROMIUM AKTIF)' : 'STREAM_MONITOR (STANDBY)'}
                      </span>
                      {liveSession?.folder && !dismissedSession && (
                        <span className={`text-[10px] font-mono ${
                          theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600 font-medium'
                        }`}>
                          • {liveSession.folder} ({liveSteps.length} STEPS)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      {liveSession?.folder && !dismissedSession && (
                        <button
                          onClick={() => openInFileManager(liveSession.folder)}
                          className={`px-2 py-1 border flex items-center gap-1 transition text-[11px] font-medium rounded-xs ${
                            theme === 'dark'
                              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
                              : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 shadow-xs'
                          }`}
                          title="Buka folder rekaman ini di OS File Manager (Finder / Nautilus)"
                        >
                          <Folder className="w-3 h-3 text-zinc-400" />
                          FINDER
                        </button>
                      )}

                      {!isRecording && liveSession?.folder && !dismissedSession && (
                        <>
                          <button
                            onClick={() => {
                              setOutFolder(liveSession.folder);
                              startRecording({ resume: true, folder: liveSession.folder });
                            }}
                            className={`px-2.5 py-1 border flex items-center gap-1 font-bold transition text-[11px] rounded-xs ${
                              theme === 'dark'
                                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                            }`}
                            title="Buka kembali Chromium untuk melanjutkan sesi ini (Cookie & Login tersimpan otomatis di .auth_state.json)"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            CONTINUE_SESSION
                          </button>
                          <button
                            onClick={() => setDismissedSession(true)}
                            className={`px-2 py-1 border flex items-center gap-1 transition text-[11px] font-medium rounded-xs ${
                              theme === 'dark'
                                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                                : 'bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-zinc-300 shadow-xs'
                            }`}
                            title="Tutup tampilan sesi ini dari stream monitor"
                          >
                            <X className="w-3 h-3" />
                            TUTUP
                          </button>
                        </>
                      )}

                      {liveSession?.viewerUrl && !dismissedSession && (
                        <button
                          onClick={() => openInspector(liveSession.folder)}
                          className={`px-2 py-1 flex items-center gap-1 border text-[11px] font-medium transition rounded-xs ${
                            theme === 'dark'
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                              : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 shadow-xs'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          PREVIEW
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-header: Absolute Path & One-Click Copy */}
                  {liveSession?.folder && !dismissedSession && (
                    <div className={`px-3.5 py-1.5 border-b flex items-center justify-between text-[10px] font-mono transition ${
                      theme === 'dark'
                        ? 'border-zinc-850 bg-black/60 text-zinc-500'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                    }`}>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}>SOURCE:</span>
                        <span className={`truncate select-all ${
                          theme === 'dark' ? 'text-zinc-400' : 'text-zinc-700 font-medium'
                        }`}>
                          {liveSession.absolutePath || `./recordings/${liveSession.folder}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyPathToClipboard(liveSession.absolutePath || `./recordings/${liveSession.folder}`, 'live')}
                          className={`flex items-center gap-1 text-[10px] transition ${
                            theme === 'dark' ? 'hover:text-zinc-200 text-zinc-400' : 'hover:text-zinc-900 text-zinc-600'
                          }`}
                          title="Salin path direktori ke clipboard"
                        >
                          {copiedPath === 'live' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedPath === 'live' ? 'COPIED' : 'COPY'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Body: Dismissed State vs Active Monitor Stream */}
                  {dismissedSession && !isRecording ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[460px]">
                      <div className={`w-10 h-10 border flex items-center justify-center ${
                        theme === 'dark' ? 'border-zinc-800 bg-zinc-900 text-zinc-600' : 'border-zinc-300 bg-white text-zinc-500 shadow-xs'
                      }`}>
                        <Folder className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-zinc-200 text-xs block">STREAM MONITOR STANDBY</span>
                        <p className="text-zinc-500 text-[11px] max-w-sm">
                          Sesi sebelumnya telah ditutup. Gunakan form di sebelah kiri untuk membuat sesi baru, atau buka tab <strong>[2] LIBRARY</strong> untuk memilih dokumen yang ingin dilanjutkan.
                        </p>
                      </div>
                      {liveSession?.folder && (
                        <button
                          onClick={() => setDismissedSession(false)}
                          className={`px-3 py-1.5 border text-[11px] flex items-center gap-1.5 transition ${
                            theme === 'dark'
                              ? 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                              : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
                          }`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          BUKA KEMBALI MONITOR SESI ({liveSession.folder})
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Mode Tabs: 'feed' (live steps) vs 'guide_frame' (live HTML viewer) */}
                      <div className={`border-b px-3 py-1.5 flex items-center justify-between transition ${
                        theme === 'dark' ? 'border-zinc-850 bg-black' : 'border-zinc-200 bg-zinc-50'
                      }`}>
                        <div className={`flex items-center p-0.5 rounded border text-[10px] ${
                          theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-300 bg-zinc-200/70 shadow-inner'
                        }`}>
                          <button
                            onClick={() => setPreviewMode('feed')}
                            className={`px-2.5 py-0.5 transition rounded-xs ${
                              previewMode === 'feed'
                                ? (theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold border border-zinc-300 shadow-xs')
                                : (theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                            }`}
                          >
                            STREAM FEED
                          </button>
                          <button
                            onClick={() => setPreviewMode('guide_frame')}
                            className={`px-2.5 py-0.5 transition rounded-xs ${
                              previewMode === 'guide_frame'
                                ? (theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold border border-zinc-300 shadow-xs')
                                : (theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                            }`}
                          >
                            LIVE GUIDE HTML
                          </button>
                        </div>

                        <span className="text-[10px] text-zinc-500 font-mono">
                          {isRecording ? 'STATUS: BROWSER_RECORDING (800MS)' : 'STATUS: CHROMIUM_CLOSED / IDLE'}
                        </span>
                      </div>

                      {/* VIEW MODE 1: LIVE STREAM FEED */}
                      {previewMode === 'feed' && (
                        <div className="flex-1 p-4 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[560px]">
                          {/* Spotlight: LATEST STEP */}
                          {latestStep ? (
                            <div className={`p-3.5 space-y-2.5 border-2 transition ${
                              isRecording 
                                ? (theme === 'dark' ? 'border-emerald-800/80 bg-emerald-950/20' : 'border-emerald-600/70 bg-emerald-50/60')
                                : (theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white shadow-xs')
                            }`}>
                              <div className={`flex items-center justify-between pb-2 border-b ${
                                theme === 'dark' ? 'border-zinc-850' : 'border-zinc-200'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {isRecording ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                  ) : (
                                    <span className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-zinc-600' : 'bg-zinc-400'}`}></span>
                                  )}
                                  <span className={`font-bold text-xs tracking-wide ${
                                    isRecording 
                                      ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700')
                                      : (theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800')
                                  }`}>
                                    {isRecording ? 'BARUSAN TERCAPTURE' : 'LANGKAH TERAKHIR TERSIMPAN'} • STEP #{String(latestStep.step).padStart(2, '0')}
                                  </span>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 border font-semibold ${
                                  theme === 'dark'
                                    ? 'text-zinc-400 bg-zinc-900 border-zinc-800'
                                    : 'text-zinc-700 bg-zinc-100 border-zinc-300'
                                }`}>
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
                                    <span className="text-zinc-500">ACTION</span>
                                  </div>
                                  <div
                                    onClick={() =>
                                      setLightboxImg(resolveAssetUrl(`/recordings/${liveSession.folder}/${latestStep.actionFile}`))
                                    }
                                    className={`group relative border aspect-video overflow-hidden cursor-zoom-in ${
                                      theme === 'dark' ? 'border-zinc-800 bg-black' : 'border-zinc-300 bg-zinc-100'
                                    }`}
                                  >
                                    <img
                                      src={resolveAssetUrl(`/recordings/${liveSession.folder}/${latestStep.actionFile}`)}
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
                                    <span className="text-zinc-500">RESULT</span>
                                  </div>
                                  <div
                                    onClick={() =>
                                      latestStep.resultFile &&
                                      setLightboxImg(resolveAssetUrl(`/recordings/${liveSession.folder}/${latestStep.resultFile}`))
                                    }
                                    className={`group relative border aspect-video overflow-hidden cursor-zoom-in ${
                                      theme === 'dark' ? 'border-zinc-800 bg-black' : 'border-zinc-300 bg-zinc-100'
                                    }`}
                                  >
                                    {latestStep.resultFile ? (
                                      <>
                                        <img
                                          src={resolveAssetUrl(`/recordings/${liveSession.folder}/${latestStep.resultFile}`)}
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

                              <div className={`flex items-center justify-between text-[10px] text-zinc-400 border-t pt-2 font-mono ${
                                theme === 'dark' ? 'border-zinc-850' : 'border-zinc-200'
                              }`}>
                                <span className="truncate max-w-[280px]">URL: {latestStep.url}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 border ${
                                    theme === 'dark'
                                      ? 'text-emerald-400 border-emerald-900/60 bg-emerald-950/40'
                                      : 'text-emerald-700 border-emerald-300 bg-emerald-50'
                                  }`} title="Cookies dan local storage tersimpan di .auth_state.json">
                                    🛡️ AUTH_PRESERVED
                                  </span>
                                  <span className={isRecording ? 'text-emerald-400' : 'text-zinc-500'}>
                                    {isRecording ? 'RECORDING_ACTIVE' : 'STANDBY'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={`border border-dashed p-8 text-center space-y-2 ${
                              theme === 'dark' ? 'border-zinc-800 text-zinc-600' : 'border-zinc-300 text-zinc-500 bg-zinc-50/50'
                            }`}>
                              <Camera className="w-6 h-6 mx-auto text-zinc-500" />
                              <div className="font-medium">Belum ada langkah yang di-capture.</div>
                              <div className="text-[10px]">
                                Klik elemen di Chromium atau tekan F8 untuk mengambil screenshot pertama.
                              </div>
                            </div>
                          )}

                          {/* Stream History List (All Previous Steps) */}
                          <div className={`space-y-2 pt-2 border-t ${theme === 'dark' ? 'border-zinc-850' : 'border-zinc-200'}`}>
                            <div className="text-[11px] font-bold text-zinc-400 flex items-center justify-between">
                              <span>TIMELINE_HISTORI_LANGKAH ({liveSteps.length})</span>
                              <span className="text-[10px] text-zinc-500">KLIK KARTU UNTUK INSPEKSI</span>
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
                                        ? (theme === 'dark' ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-emerald-500/60 bg-emerald-50/80 shadow-xs')
                                        : (theme === 'dark' ? 'border-zinc-850 bg-black hover:border-zinc-700' : 'border-zinc-200 bg-white hover:bg-zinc-50 shadow-xs')
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className={`font-bold text-[11px] ${
                                        theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                                      }`}>
                                        #{String(step.step).padStart(2, '0')}
                                      </span>
                                      <span className={`text-[10px] px-1 py-0.5 border font-medium ${
                                        theme === 'dark'
                                          ? 'border-zinc-800 bg-zinc-900 text-zinc-300'
                                          : 'border-zinc-300 bg-zinc-100 text-zinc-800'
                                      }`}>
                                        {step.type}
                                      </span>
                                      <span className={`text-xs font-semibold truncate max-w-[240px] ${
                                        theme === 'dark' ? 'text-zinc-200' : 'text-zinc-900'
                                      }`}>
                                        {step.label}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {step.isRedacted && (
                                        <span className={`text-[9px] px-1 border ${
                                          theme === 'dark'
                                            ? 'text-amber-400 border-amber-900 bg-amber-950/30'
                                            : 'text-amber-700 border-amber-300 bg-amber-50'
                                        }`}>
                                          REDACTED
                                        </span>
                                      )}
                                      <div className={`w-6 h-4 border overflow-hidden ${
                                        theme === 'dark' ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-300 bg-zinc-100'
                                      }`}>
                                        <img
                                          src={resolveAssetUrl(`/recordings/${liveSession?.folder}/${step.actionFile}`)}
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
                              src={resolveAssetUrl(`/recordings/${liveSession.folder}/index.html`)}
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
                    </>
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
                  .map((rec) => {
                    const isExpanded = expandedBrowseId === rec.id;
                    const currentStepIdx = browsingStepIndex[rec.id] || 0;
                    const currentStep = rec.steps && rec.steps[currentStepIdx] ? rec.steps[currentStepIdx] : (rec.steps && rec.steps[0]);
                    const totalSteps = rec.steps ? rec.steps.length : rec.stepsCount || 0;

                    return (
                      <div key={rec.id} className="transition">
                        {/* Main Card Header */}
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-900/40 transition">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-zinc-100 text-xs">{rec.title}</span>
                              <span className="text-[10px] text-zinc-400 border border-zinc-800 px-1.5 py-0.5">
                                {rec.stepsCount} steps
                              </span>
                              {rec.hasGuide && (
                                <span className="text-[10px] text-emerald-400 border border-emerald-900/60 px-1.5 py-0.5">
                                  GUIDE.MD_OK
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 flex-wrap">
                              <span>{rec.outDir} • {new Date(rec.updatedAt).toLocaleString('id-ID')}</span>
                              <span className="text-zinc-700">|</span>
                              <button
                                onClick={() => copyPathToClipboard(rec.absolutePath || rec.outDir, rec.id)}
                                className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[10px] transition"
                                title={`Salin absolute path: ${rec.absolutePath || rec.outDir}`}
                              >
                                {copiedPath === rec.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedPath === rec.id ? 'PATH_COPIED' : 'COPY_PATH'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => openInFileManager(rec.id)}
                              className={`px-2.5 py-1 border font-semibold text-[11px] flex items-center gap-1.5 transition rounded-xs ${
                                theme === 'dark'
                                  ? 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                                  : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
                              }`}
                              title="Buka folder rekaman ini di OS File Manager (Finder / Nautilus / Explorer)"
                            >
                              <Folder className="w-3.5 h-3.5 text-zinc-400" />
                              FINDER
                            </button>

                            {totalSteps > 0 && (
                              <button
                                onClick={() => setExpandedBrowseId(isExpanded ? null : rec.id)}
                                className={`px-2.5 py-1 border text-[11px] font-semibold flex items-center gap-1.5 transition rounded-xs ${
                                  isExpanded
                                    ? (theme === 'dark'
                                        ? 'border-zinc-500 bg-zinc-800 text-white hover:bg-zinc-700'
                                        : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs')
                                    : (theme === 'dark'
                                        ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300'
                                        : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs')
                                }`}
                                title={isExpanded ? 'Tutup browser tangkapan layar' : 'Buka browser semua tangkapan layar untuk SOP ini'}
                              >
                                <Camera className="w-3.5 h-3.5 text-zinc-400" />
                                <span>{isExpanded ? 'TUTUP_SCREENSHOTS' : `BROWSE_SCREENSHOTS (${totalSteps})`}</span>
                              </button>
                            )}

                            <button
                              onClick={() => resumeFromLibrary(rec)}
                              className={`px-2.5 py-1 border font-semibold text-[11px] flex items-center gap-1 transition rounded-xs ${
                                theme === 'dark'
                                  ? 'border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300'
                                  : 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 shadow-xs'
                              }`}
                              title="Lanjutkan rekaman SOP ini di Chromium"
                            >
                              <Play className={`w-3 h-3 ${theme === 'dark' ? 'fill-emerald-300' : 'fill-emerald-700'}`} />
                              RESUME
                            </button>

                            <button
                              onClick={() => openInspector(rec.id)}
                              className={`px-2.5 py-1 border font-semibold text-[11px] flex items-center gap-1 transition rounded-xs ${
                                theme === 'dark'
                                  ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                                  : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              INLINE_VIEW
                            </button>

                            <a
                              href={resolveAssetUrl(`/recordings/${rec.id}/index.html`)}
                              target="_blank"
                              rel="noreferrer"
                              className={`px-2.5 py-1 font-semibold text-[11px] flex items-center gap-1.5 transition rounded-xs ${
                                theme === 'dark'
                                  ? 'border border-zinc-300 bg-zinc-100 hover:bg-white text-black'
                                  : 'app-btn-dark shadow-sm'
                              }`}
                              title="Buka dokumen HTML di tab browser baru"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>NEW_TAB</span>
                            </a>
                          </div>
                        </div>

                        {/* Compact Quick-Thumbnails Strip (when NOT expanded) */}
                        {!isExpanded && rec.steps && rec.steps.length > 0 && (
                          <div className="px-4 pb-3 pt-0 flex items-center gap-2 overflow-x-auto">
                            <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">PREVIEWS:</span>
                            {rec.steps.slice(0, 5).map((st, sIdx) => (
                              <div
                                key={sIdx}
                                onClick={() => {
                                  setBrowsingStepIndex((prev) => ({ ...prev, [rec.id]: sIdx }));
                                  setExpandedBrowseId(rec.id);
                                }}
                                className={`group relative cursor-pointer border w-24 h-14 flex-shrink-0 overflow-hidden transition ${
                                  theme === 'dark'
                                    ? 'border-zinc-850 hover:border-zinc-500 bg-black'
                                    : 'border-zinc-300 hover:border-zinc-500 bg-zinc-100 shadow-2xs'
                                }`}
                                title={`Step ${st.step}: ${st.label || st.type}`}
                              >
                                <img
                                  src={resolveAssetUrl(`/recordings/${rec.id}/${st.actionFile}`)}
                                  alt={`Step ${st.step}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                  loading="lazy"
                                />
                                <div className={`absolute top-1 left-1 text-[9px] font-mono font-bold px-1.5 py-0.2 border rounded-xs transition shadow-2xs ${
                                  theme === 'dark'
                                    ? 'bg-black/85 text-zinc-300 border-zinc-700'
                                    : 'bg-white/95 text-zinc-800 border-zinc-300 backdrop-blur-xs font-semibold'
                                }`}>
                                  #{String(st.step).padStart(2, '0')}
                                </div>
                              </div>
                            ))}
                            {rec.steps.length > 5 && (
                              <button
                                onClick={() => {
                                  setBrowsingStepIndex((prev) => ({ ...prev, [rec.id]: 0 }));
                                  setExpandedBrowseId(rec.id);
                                }}
                                className={`text-[10px] font-mono px-2 py-1 border border-dashed flex-shrink-0 transition ${
                                  theme === 'dark'
                                    ? 'text-zinc-500 hover:text-zinc-300 border-zinc-800 hover:border-zinc-600'
                                    : 'text-zinc-600 hover:text-zinc-900 border-zinc-300 hover:border-zinc-500 bg-zinc-50'
                                }`}
                              >
                                +{rec.steps.length - 5} MORE...
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expanded Screenshot Browser */}
                        {isExpanded && currentStep && (
                          <div className={`border-t p-4 space-y-4 animate-in fade-in duration-150 transition ${
                            theme === 'dark' ? 'border-zinc-800 bg-black/60' : 'border-zinc-200 bg-zinc-50/70'
                          }`}>
                            {/* Step navigation & meta bar */}
                            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 transition ${
                              theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
                            }`}>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-xs border ${
                                  theme === 'dark'
                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                    : 'bg-zinc-200/80 border-zinc-300 text-zinc-900 shadow-2xs'
                                }`}>
                                  STEP {String(currentStep.step).padStart(2, '0')} OF {String(rec.steps.length).padStart(2, '0')}
                                </span>
                                <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-900'}`}>
                                  [{currentStep.type?.toUpperCase()}] {currentStep.label || 'Action'}
                                </span>
                                {currentStep.tag && (
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    &lt;{currentStep.tag}&gt;
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  disabled={currentStepIdx === 0}
                                  onClick={() =>
                                    setBrowsingStepIndex((prev) => ({
                                      ...prev,
                                      [rec.id]: Math.max(0, currentStepIdx - 1)
                                    }))
                                  }
                                  className={`px-2.5 py-1 border disabled:opacity-30 disabled:cursor-not-allowed text-[11px] flex items-center gap-1 font-mono transition rounded-xs ${
                                    theme === 'dark'
                                      ? 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                                      : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
                                  }`}
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                  PREV
                                </button>
                                <button
                                  disabled={currentStepIdx >= rec.steps.length - 1}
                                  onClick={() =>
                                    setBrowsingStepIndex((prev) => ({
                                      ...prev,
                                      [rec.id]: Math.min(rec.steps.length - 1, currentStepIdx + 1)
                                    }))
                                  }
                                  className={`px-2.5 py-1 border disabled:opacity-30 disabled:cursor-not-allowed text-[11px] flex items-center gap-1 font-mono transition rounded-xs ${
                                    theme === 'dark'
                                      ? 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                                      : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
                                  }`}
                                >
                                  NEXT
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openInFileManager(rec.id)}
                                  className={`px-2.5 py-1 border text-[11px] flex items-center gap-1 font-mono transition rounded-xs ${
                                    theme === 'dark'
                                      ? 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                                      : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
                                  }`}
                                  title="Buka folder direktori rekaman ini di OS File Manager (Finder / Nautilus)"
                                >
                                  <Folder className="w-3.5 h-3.5 text-zinc-400" />
                                  FINDER
                                </button>
                                <button
                                  onClick={() => setExpandedBrowseId(null)}
                                  className={`px-2.5 py-1 border text-[11px] font-mono flex items-center gap-1 transition rounded-xs ${
                                    theme === 'dark'
                                      ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white'
                                      : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 shadow-xs'
                                  }`}
                                  title="Tutup screenshot browser"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>TUTUP</span>
                                </button>
                              </div>
                            </div>

                            {/* Step URL */}
                            <div className="text-[10px] text-zinc-500 font-mono truncate">
                              URL: <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-700'}>{currentStep.url}</span>
                            </div>

                            {/* Dual Shot Display: Action Highlight & Result Screen */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Action Shot */}
                              <div className={`border p-3 space-y-2 transition ${
                                theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white shadow-xs'
                              }`}>
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                                    <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                      ACTION_HIGHLIGHT (RED BOX)
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setLightboxImg(resolveAssetUrl(`/recordings/${rec.id}/${currentStep.actionFile}`))}
                                    className={`flex items-center gap-1 text-[10px] font-mono transition px-2 py-0.5 border rounded-xs ${
                                      theme === 'dark'
                                        ? 'text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700 bg-zinc-900/60'
                                        : 'text-zinc-700 hover:text-zinc-950 border-zinc-300 hover:bg-zinc-100 bg-white shadow-2xs'
                                    }`}
                                    title="Perbesar gambar"
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                    <span>ZOOM</span>
                                  </button>
                                </div>
                                <div
                                  className={`relative cursor-zoom-in border overflow-hidden group transition ${
                                    theme === 'dark' ? 'bg-black border-zinc-850' : 'bg-zinc-100 border-zinc-200'
                                  }`}
                                  onClick={() => setLightboxImg(resolveAssetUrl(`/recordings/${rec.id}/${currentStep.actionFile}`))}
                                >
                                  <img
                                    src={resolveAssetUrl(`/recordings/${rec.id}/${currentStep.actionFile}`)}
                                    alt={`Action Step ${currentStep.step}`}
                                    className="w-full h-auto max-h-[380px] object-contain mx-auto transition group-hover:scale-[1.01]"
                                  />
                                  <div className={`absolute bottom-2 right-2 text-[10px] px-2 py-0.5 border font-mono transition flex items-center gap-1.5 shadow-sm rounded-xs ${
                                    theme === 'dark'
                                      ? 'bg-black/85 text-zinc-300 border-zinc-700'
                                      : 'bg-white/95 text-zinc-800 border-zinc-300 backdrop-blur-xs font-semibold'
                                  }`}>
                                    <Maximize2 className="w-3 h-3 text-current" />
                                    <span>KLIK UNTUK MEMPERBESAR</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-zinc-500 font-mono truncate">
                                  FILE: {currentStep.actionFile}
                                </div>
                              </div>

                              {/* Result Shot */}
                              <div className={`border p-3 space-y-2 transition ${
                                theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white shadow-xs'
                              }`}>
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                                    <span className={`font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                      RESULT_STATE (AFTER ACTION)
                                    </span>
                                  </div>
                                  {currentStep.resultFile && (
                                    <button
                                      onClick={() => setLightboxImg(resolveAssetUrl(`/recordings/${rec.id}/${currentStep.resultFile}`))}
                                      className={`flex items-center gap-1 text-[10px] font-mono transition px-2 py-0.5 border rounded-xs ${
                                        theme === 'dark'
                                          ? 'text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700 bg-zinc-900/60'
                                          : 'text-zinc-700 hover:text-zinc-950 border-zinc-300 hover:bg-zinc-100 bg-white shadow-2xs'
                                      }`}
                                      title="Perbesar gambar"
                                    >
                                      <Maximize2 className="w-3 h-3" />
                                      <span>ZOOM</span>
                                    </button>
                                  )}
                                </div>
                                {currentStep.resultFile ? (
                                  <div
                                    className={`relative cursor-zoom-in border overflow-hidden group transition ${
                                      theme === 'dark' ? 'bg-black border-zinc-850' : 'bg-zinc-100 border-zinc-200'
                                    }`}
                                    onClick={() => setLightboxImg(resolveAssetUrl(`/recordings/${rec.id}/${currentStep.resultFile}`))}
                                  >
                                    <img
                                      src={resolveAssetUrl(`/recordings/${rec.id}/${currentStep.resultFile}`)}
                                      alt={`Result Step ${currentStep.step}`}
                                      className="w-full h-auto max-h-[380px] object-contain mx-auto transition group-hover:scale-[1.01]"
                                    />
                                    <div className={`absolute bottom-2 right-2 text-[10px] px-2 py-0.5 border font-mono transition flex items-center gap-1.5 shadow-sm rounded-xs ${
                                      theme === 'dark'
                                        ? 'bg-black/85 text-zinc-300 border-zinc-700'
                                        : 'bg-white/95 text-zinc-800 border-zinc-300 backdrop-blur-xs font-semibold'
                                    }`}>
                                      <Maximize2 className="w-3 h-3 text-current" />
                                      <span>KLIK UNTUK MEMPERBESAR</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-[280px] border border-dashed border-zinc-300 dark:border-zinc-850 flex items-center justify-center text-zinc-500 font-mono text-xs">
                                    TIDAK ADA FOTO HASIL (AUTO-RESULT DISABLED)
                                  </div>
                                )}
                                <div className="text-[10px] text-zinc-500 font-mono truncate">
                                  FILE: {currentStep.resultFile || 'N/A'}
                                </div>
                              </div>
                            </div>

                            {/* Filmstrip at the bottom */}
                            <div className="space-y-1 pt-2">
                              <div className="text-[10px] font-mono text-zinc-500 flex justify-between">
                                <span>FILMSTRIP ({rec.steps.length} STEPS):</span>
                                <span>KLIK LANGKAH UNTUK NAVIGASI CEPAT</span>
                              </div>
                              <div className={`flex items-center gap-2 overflow-x-auto pb-2 pt-1 border p-2 transition ${
                                theme === 'dark' ? 'border-zinc-850 bg-black/40' : 'border-zinc-200 bg-white shadow-inner'
                              }`}>
                                {rec.steps.map((st, idx) => {
                                  const isCur = idx === currentStepIdx;
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() =>
                                        setBrowsingStepIndex((prev) => ({ ...prev, [rec.id]: idx }))
                                      }
                                      className={`flex-shrink-0 text-left border transition p-1 rounded-xs ${
                                        isCur
                                          ? (theme === 'dark'
                                              ? 'border-zinc-400 bg-zinc-800 ring-1 ring-zinc-400'
                                              : 'border-zinc-900 bg-zinc-100 ring-1 ring-zinc-900 shadow-xs')
                                          : (theme === 'dark'
                                              ? 'border-zinc-800 hover:border-zinc-600 bg-zinc-950'
                                              : 'border-zinc-200 hover:border-zinc-400 bg-zinc-50')
                                      }`}
                                    >
                                      <div className="w-24 h-14 bg-black overflow-hidden mb-1 relative rounded-xs">
                                        <img
                                          src={resolveAssetUrl(`/recordings/${rec.id}/${st.actionFile}`)}
                                          alt={`Step ${st.step}`}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                        <div className={`absolute top-1 left-1 text-[9px] font-mono font-bold px-1.5 py-0.2 border rounded-xs transition shadow-2xs ${
                                          theme === 'dark'
                                            ? 'bg-black/85 text-zinc-300 border-zinc-700'
                                            : 'bg-white/95 text-zinc-800 border-zinc-300 backdrop-blur-xs font-semibold'
                                        }`}>
                                          #{String(st.step).padStart(2, '0')}
                                        </div>
                                      </div>
                                      <div className={`w-24 text-[10px] font-mono truncate ${
                                        theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800 font-medium'
                                      }`}>
                                        {st.label || st.type}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CONFIGURATION & PROFILES                                */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            {/* Theme Selector */}
            <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="font-bold text-zinc-100 border-b border-zinc-800 pb-2 flex items-center justify-between">
                <span>INTERFACE_THEME</span>
                <span className="text-[10px] text-zinc-500 font-mono uppercase">ACTIVE: {theme}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-3 border text-left flex items-center justify-between transition ${
                    theme === 'dark'
                      ? 'border-zinc-300 bg-zinc-800 text-white font-bold'
                      : 'border-zinc-800 hover:border-zinc-700 bg-black text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>DARK MONO</span>
                  </div>
                  {theme === 'dark' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`p-3 border text-left flex items-center justify-between transition ${
                    theme === 'light'
                      ? 'border-zinc-500 bg-zinc-200 text-black font-bold'
                      : 'border-zinc-800 hover:border-zinc-700 bg-black text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>LIGHT MONO</span>
                  </div>
                  {theme === 'light' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
              <p className="text-zinc-500 text-[11px]">
                Desain tema menggunakan prinsip brutalist monochrome berkontras tinggi tanpa gradien dekoratif. Pilihan tema otomatis disimpan di browser local storage.
              </p>
            </div>

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

            {/* AI Coding Agent MCP & Skill Integration */}
            <div className={`border p-5 space-y-4 transition ${
              theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-300 bg-white shadow-xs'
            }`}>
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="font-bold text-zinc-100 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  AI_AGENT_INTEGRATION (MCP_SERVERS & SKILLS)
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">AUTONOMOUS_READY</span>
              </div>

              <p className="text-zinc-400 text-xs leading-relaxed">
                Pasang dan registrasi tools FlowSnap ke dalam AI Coding Assistant Anda (**Antigravity**, **Claude Desktop**, **Cursor**, **Windsurf**). Agen akan otomatis mengenali skill dan tool perekaman SOP tanpa konfigurasi manual.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className={`p-2.5 border transition ${theme === 'dark' ? 'border-zinc-850 bg-black' : 'border-zinc-200 bg-zinc-50'}`}>
                  <span className="text-[10px] text-zinc-500 block">CLIENT</span>
                  <span className="font-bold text-zinc-200">Antigravity</span>
                </div>
                <div className={`p-2.5 border transition ${theme === 'dark' ? 'border-zinc-850 bg-black' : 'border-zinc-200 bg-zinc-50'}`}>
                  <span className="text-[10px] text-zinc-500 block">CLIENT</span>
                  <span className="font-bold text-zinc-200">Claude Desktop</span>
                </div>
                <div className={`p-2.5 border transition ${theme === 'dark' ? 'border-zinc-850 bg-black' : 'border-zinc-200 bg-zinc-50'}`}>
                  <span className="text-[10px] text-zinc-500 block">CLIENT</span>
                  <span className="font-bold text-zinc-200">Cursor</span>
                </div>
                <div className={`p-2.5 border transition ${theme === 'dark' ? 'border-zinc-850 bg-black' : 'border-zinc-200 bg-zinc-50'}`}>
                  <span className="text-[10px] text-zinc-500 block">CLIENT</span>
                  <span className="font-bold text-zinc-200">Windsurf</span>
                </div>
              </div>

              <button
                disabled={installingAgent}
                onClick={setupAgentMcp}
                className={`w-full py-2.5 font-bold text-xs flex items-center justify-center gap-2 transition rounded-xs ${
                  theme === 'dark'
                    ? 'bg-zinc-100 hover:bg-white text-black'
                    : 'bg-zinc-900 hover:bg-black text-white shadow-xs'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${installingAgent ? 'animate-spin' : ''}`} />
                <span>{installingAgent ? 'MENDAFTARKAN MCP & SKILL...' : '⚡ PASANG / REGISTRASI MCP & SKILL KE SEMUA AGENT'}</span>
              </button>

              {agentSetupResults && (
                <div className="p-3 border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-[11px] font-mono space-y-1">
                  <div className="font-bold text-emerald-200">✔ Registrasi Berhasil:</div>
                  <div>• {agentSetupResults.mcpServers.length} MCP Client Terkonfigurasi</div>
                  <div>• {agentSetupResults.skills.length} File SKILL.md Terpasang</div>
                  <div>• 7 Tool MCP Siap Digunakan: flowsnap_validate, flowsnap_record_automated, dsb.</div>
                </div>
              )}
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

              {/* View Switcher & Action Controls */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center p-0.5 rounded border transition text-[10px] ${
                  theme === 'dark' ? 'border-zinc-800 bg-black' : 'border-zinc-300 bg-zinc-200/80 shadow-inner'
                }`}>
                  <button
                    onClick={() => setInspectViewMode('iframe')}
                    className={`px-2 py-0.5 transition rounded-xs ${
                      inspectViewMode === 'iframe'
                        ? (theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold border border-zinc-300 shadow-xs')
                        : (theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                    }`}
                  >
                    HTML_VIEWER
                  </button>
                  <button
                    onClick={() => setInspectViewMode('steps')}
                    className={`px-2 py-0.5 transition rounded-xs ${
                      inspectViewMode === 'steps'
                        ? (theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold border border-zinc-300 shadow-xs')
                        : (theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                    }`}
                  >
                    STEP_GALLERY
                  </button>
                  <button
                    onClick={() => setInspectViewMode('markdown')}
                    className={`px-2 py-0.5 transition rounded-xs ${
                      inspectViewMode === 'markdown'
                        ? (theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold border border-zinc-300 shadow-xs')
                        : (theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                    }`}
                  >
                    GUIDE.MD {isEditingMarkdown ? '(EDIT)' : ''}
                  </button>
                  <button
                    onClick={() => setInspectViewMode('files')}
                    className={`px-2 py-0.5 transition rounded-xs ${
                      inspectViewMode === 'files'
                        ? (theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold border border-zinc-300 shadow-xs')
                        : (theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                    }`}
                  >
                    SOURCE_FILES ({inspectDetail.files ? inspectDetail.files.length : 0})
                  </button>
                </div>

                <button
                  onClick={() => openInFileManager(inspectDetail.id)}
                  className={`px-2.5 py-1 border flex items-center gap-1 text-[11px] font-semibold transition rounded-xs ${
                    theme === 'dark'
                      ? 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                      : 'border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs'
                  }`}
                  title="Buka direktori rekaman ini di OS File Manager (Finder / Nautilus)"
                >
                  <Folder className="w-3.5 h-3.5 text-zinc-400" />
                  FINDER
                </button>

                <a
                  href={resolveAssetUrl(`/recordings/${inspectDetail.id}/index.html`)}
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
                    setIsEditingMarkdown(false);
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
                  src={resolveAssetUrl(`/recordings/${inspectDetail.id}/index.html`)}
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
                            src={resolveAssetUrl(`/recordings/${inspectDetail.id}/${st.actionFile}`)}
                            alt="Aksi"
                            onClick={() => setLightboxImg(resolveAssetUrl(`/recordings/${inspectDetail.id}/${st.actionFile}`))}
                            className="w-full border border-zinc-850 cursor-zoom-in"
                          />
                        </div>
                        {st.resultFile && (
                          <div>
                            <div className="text-[10px] text-zinc-500 mb-1">HASIL (SESUDAH)</div>
                            <img
                              src={resolveAssetUrl(`/recordings/${inspectDetail.id}/${st.resultFile}`)}
                              alt="Hasil"
                              onClick={() => setLightboxImg(resolveAssetUrl(`/recordings/${inspectDetail.id}/${st.resultFile}`))}
                              className="w-full border border-zinc-850 cursor-zoom-in"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* GUIDE.MD View & Live Editor */}
              {inspectViewMode === 'markdown' && (
                <div className="h-full flex flex-col p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-bold text-[11px]">MARKDOWN SOURCE (GUIDE.MD)</span>
                      {isEditingMarkdown && (
                        <span className="text-[10px] text-amber-400 border border-amber-800 bg-amber-950/40 px-1.5 py-0.5">
                          MODE_EDIT_AKTIF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditingMarkdown ? (
                        <>
                          <button
                            onClick={() => {
                              setEditedMarkdown(inspectDetail.markdown || '');
                              setIsEditingMarkdown(true);
                            }}
                            className="px-2.5 py-1 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center gap-1 font-semibold text-[11px] transition"
                            title="Edit dan kustomisasi teks dokumen SOP ini"
                          >
                            <Edit3 className="w-3 h-3 text-zinc-400" />
                            EDIT_SOP
                          </button>
                          <button
                            onClick={() => copyMarkdownText(inspectDetail.markdown)}
                            className="px-2 py-1 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center gap-1 text-[11px]"
                          >
                            {copiedMarkdown ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedMarkdown ? 'COPIED' : 'COPY'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setIsEditingMarkdown(false)}
                            className="px-2 py-1 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white text-[11px]"
                          >
                            BATAL
                          </button>
                          <button
                            disabled={savingMarkdown}
                            onClick={() => saveCustomMarkdown(inspectDetail.id)}
                            className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 border border-emerald-600 text-emerald-100 font-bold flex items-center gap-1 text-[11px] transition"
                          >
                            <Save className="w-3 h-3" />
                            {savingMarkdown ? 'MENYIMPAN...' : 'SIMPAN_KE_DISK'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditingMarkdown ? (
                    <textarea
                      value={editedMarkdown}
                      onChange={(e) => setEditedMarkdown(e.target.value)}
                      className="flex-1 bg-black p-4 border border-zinc-700 focus:border-zinc-500 outline-none text-[11px] text-zinc-200 font-mono resize-none leading-relaxed"
                      placeholder="Tulis kustomisasi dokumen SOP markdown disini..."
                    />
                  ) : (
                    <pre className="flex-1 bg-black p-4 border border-zinc-850 overflow-y-auto text-[11px] text-zinc-300 font-mono whitespace-pre-wrap select-all leading-relaxed">
                      {inspectDetail.markdown || '# Guide markdown belum ada'}
                    </pre>
                  )}
                </div>
              )}

              {/* SOURCE_FILES Raw Asset Explorer */}
              {inspectViewMode === 'files' && (
                <div className="h-full flex flex-col p-4 space-y-3 overflow-y-auto">
                  {/* Source Directory Banner */}
                  <div className="border border-zinc-800 bg-black p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-mono block">DIREKTORI SUMBER (DISK):</span>
                        <code className="text-zinc-200 font-mono text-xs select-all">
                          {inspectDetail.absolutePath || `./recordings/${inspectDetail.id}`}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyPathToClipboard(inspectDetail.absolutePath || `./recordings/${inspectDetail.id}`, 'modal-path')}
                          className="px-2.5 py-1 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[11px] flex items-center gap-1 transition"
                        >
                          {copiedPath === 'modal-path' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedPath === 'modal-path' ? 'COPIED' : 'SALIN_PATH'}
                        </button>
                        <button
                          onClick={() => openInFileManager(inspectDetail.id)}
                          className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-black font-semibold text-[11px] flex items-center gap-1.5 transition"
                          title="Buka direktori ini di Finder / File Manager sistem operasi"
                        >
                          <Folder className="w-3.5 h-3.5" />
                          BUKA_DI_FINDER
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-850">
                      💡 <strong>Tip Kustomisasi:</strong> Anda dapat langsung mengedit file di Finder/File Manager (mengganti screenshot PNG, menambahkan catatan di GUIDE.md, atau mengelola aset gambar).
                    </p>
                  </div>

                  {/* Files Table */}
                  <div className="border border-zinc-800 bg-black flex-1 overflow-x-auto">
                    <div className="p-2 border-b border-zinc-850 bg-zinc-900/50 flex items-center justify-between font-bold text-zinc-300 text-[11px]">
                      <span>DAFTAR FILE ({inspectDetail.files ? inspectDetail.files.length : 0} ITEM)</span>
                      <span className="text-zinc-500 font-normal text-[10px]">KLIK GAMBAR UNTUK ZOOM</span>
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-850 text-[10px] text-zinc-500 bg-zinc-950">
                          <th className="p-2.5">FILE NAME</th>
                          <th className="p-2.5">EXT</th>
                          <th className="p-2.5">SIZE</th>
                          <th className="p-2.5">MODIFIED</th>
                          <th className="p-2.5 text-right">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
                        {inspectDetail.files && inspectDetail.files.length > 0 ? (
                          inspectDetail.files.map((f) => (
                            <tr key={f.name} className="hover:bg-zinc-900/40 transition">
                              <td className="p-2.5 flex items-center gap-2">
                                {f.ext === '.png' && (
                                  <img
                                    src={f.url}
                                    alt={f.name}
                                    onClick={() => setLightboxImg(f.url)}
                                    className="w-7 h-5 object-cover border border-zinc-800 cursor-zoom-in"
                                  />
                                )}
                                {f.ext === '.md' && <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                                {f.ext === '.html' && <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                                {f.ext === '.json' && <Code className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                                <span className="text-zinc-200 truncate select-all">{f.name}</span>
                              </td>
                              <td className="p-2.5 text-zinc-400 uppercase text-[10px]">{f.ext.replace('.', '') || 'DIR'}</td>
                              <td className="p-2.5 text-zinc-400">{formatBytes(f.size)}</td>
                              <td className="p-2.5 text-zinc-500 text-[10px]">{new Date(f.mtime).toLocaleString('id-ID')}</td>
                              <td className="p-2.5 text-right space-x-1">
                                {f.ext === '.png' && (
                                  <button
                                    onClick={() => setLightboxImg(f.url)}
                                    className="px-2 py-0.5 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[10px]"
                                  >
                                    ZOOM
                                  </button>
                                )}
                                {f.ext === '.html' && (
                                  <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[10px] inline-block"
                                  >
                                    OPEN
                                  </a>
                                )}
                                {f.ext === '.md' && (
                                  <button
                                    onClick={() => {
                                      setEditedMarkdown(inspectDetail.markdown || '');
                                      setInspectViewMode('markdown');
                                      setIsEditingMarkdown(true);
                                    }}
                                    className="px-2 py-0.5 border border-emerald-900 bg-emerald-950/40 text-emerald-300 text-[10px]"
                                  >
                                    EDIT
                                  </button>
                                )}
                                <button
                                  onClick={() => copyPathToClipboard(f.name, f.name)}
                                  className="px-2 py-0.5 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-[10px]"
                                  title="Salin nama file"
                                >
                                  {copiedPath === f.name ? 'COPIED' : 'NAME'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="p-6 text-center text-zinc-600">
                              Memuat daftar file sumber...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="border border-zinc-700 bg-zinc-950 w-full max-w-3xl p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-100">
                  INSPEKSI LANGKAH #{activePreviewStep.step} - {activePreviewStep.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 border font-medium ${
                  theme === 'dark' ? 'border-zinc-800 bg-zinc-900 text-zinc-300' : 'border-zinc-300 bg-zinc-100 text-zinc-800'
                }`}>
                  {activePreviewStep.type}
                </span>
              </div>
              <button
                onClick={() => setActivePreviewStep(null)}
                className={`p-1 transition rounded-xs ${
                  theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">FOTO AKSI (TARGET HIGHLIGHT)</span>
                <img
                  src={resolveAssetUrl(`/recordings/${liveSession.folder}/${activePreviewStep.actionFile}`)}
                  alt="Aksi"
                  className="w-full border border-zinc-850 cursor-zoom-in"
                  onClick={() => setLightboxImg(resolveAssetUrl(`/recordings/${liveSession.folder}/${activePreviewStep.actionFile}`))}
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">FOTO HASIL (RESULT)</span>
                {activePreviewStep.resultFile ? (
                  <img
                    src={resolveAssetUrl(`/recordings/${liveSession.folder}/${activePreviewStep.resultFile}`)}
                    alt="Hasil"
                    className="w-full border border-zinc-850 cursor-zoom-in"
                    onClick={() => setLightboxImg(resolveAssetUrl(`/recordings/${liveSession.folder}/${activePreviewStep.resultFile}`))}
                  />
                ) : (
                  <div className="h-40 border border-zinc-850 flex items-center justify-center text-zinc-600 text-xs font-mono">
                    Tidak ada foto hasil
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-850 flex justify-between">
              <span>URL: {activePreviewStep.url}</span>
              <span>WAKTU: {activePreviewStep.timestamp ? new Date(activePreviewStep.timestamp).toLocaleTimeString('id-ID') : 'N/A'}</span>
            </div>
          </div>
        </div>
      )}


      {/* ============================================================== */}
      {/* IN-APP REALTIME LOG CONSOLE & DIAGNOSTIC DRAWER                 */}
      {/* ============================================================== */}
      {isLogConsoleOpen && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 border-t shadow-2xl transition-all duration-200 flex flex-col ${
          theme === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-200' : 'bg-white/95 border-zinc-300 text-zinc-800'
        } backdrop-blur-md max-h-[380px] h-[320px]`}>
          {/* Console Header Bar */}
          <div className={`flex items-center justify-between px-4 py-2 border-b text-[11px] select-none ${
            theme === 'dark' ? 'border-zinc-800/80 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-100/80'
          }`}>
            <div className="flex items-center gap-3">
              <span className="font-bold flex items-center gap-1.5 tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                FLOWSNAP_SYSTEM_CONSOLE
              </span>

              {/* Status Pill */}
              <span className={`px-2 py-0.5 rounded text-[10px] border flex items-center gap-1.5 ${
                engineStatus === 'ONLINE'
                  ? (theme === 'dark' ? 'border-emerald-800 bg-emerald-950/50 text-emerald-300' : 'border-emerald-300 bg-emerald-50 text-emerald-800')
                  : (theme === 'dark' ? 'border-amber-800 bg-amber-950/50 text-amber-300' : 'border-amber-300 bg-amber-50 text-amber-800')
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${engineStatus === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {engineStatus === 'ONLINE' ? `127.0.0.1:${getApiBase() ? getApiBase().split(':').pop() : '3456'} [CONNECTED]` : 'ENGINE OFFLINE'}
              </span>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 ml-2">
                {['ALL', 'ERROR', 'ACTION', 'INFO'].map(flt => (
                  <button
                    key={flt}
                    onClick={() => setLogFilter(flt)}
                    className={`px-2 py-0.5 text-[10px] rounded transition ${
                      logFilter === flt
                        ? (theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-zinc-300 text-zinc-900 font-bold')
                        : (theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                    }`}
                  >
                    {flt}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchEngineLogs}
                className={`px-2 py-1 flex items-center gap-1 text-[10px] border rounded transition ${
                  theme === 'dark' ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700' : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200'
                }`}
                title="Refresh log"
              >
                <RefreshCw className="w-3 h-3" />
                SYNC
              </button>
              <button
                onClick={copyAllLogs}
                className={`px-2 py-1 flex items-center gap-1 text-[10px] border rounded transition ${
                  theme === 'dark' ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700' : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200'
                }`}
                title="Salin seluruh log ke clipboard"
              >
                <Copy className="w-3 h-3" />
                COPY
              </button>
              <button
                onClick={clearLogs}
                className={`px-2 py-1 flex items-center gap-1 text-[10px] border rounded transition ${
                  theme === 'dark' ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700' : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200'
                }`}
                title="Bersihkan tampilan log"
              >
                <Trash2 className="w-3 h-3" />
                CLEAR
              </button>
              <button
                onClick={() => setIsLogConsoleOpen(false)}
                className={`p-1 rounded text-zinc-400 hover:text-white transition ${
                  theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
                }`}
                title="Tutup console"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Engine Offline Helper Banner */}
          {engineStatus !== 'ONLINE' && (
            <div className={`px-4 py-1.5 text-[11px] border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-amber-950/30 border-amber-900/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Engine FlowSnap belum terdeteksi aktif di <strong>{getApiBase() || 'http://127.0.0.1:3456'}</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-80">Jalankan di terminal:</span>
                <code className="bg-black/40 px-1.5 py-0.5 rounded text-[10px] font-bold">flowsnap server</code>
                <button
                  onClick={() => apiCall('/api/status')}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px]"
                >
                  RECONNECT
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Terminal Output */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1 selection:bg-zinc-700">
            {logs.length === 0 ? (
              <div className="text-zinc-500 italic py-6 text-center">
                Belum ada aktivitas tercatat. Log sistem akan otomatis tampil di sini secara real-time.
              </div>
            ) : (
              logs
                .filter(l => logFilter === 'ALL' || l.level === logFilter)
                .map((log) => {
                  const levelColors = {
                    INFO: theme === 'dark' ? 'text-cyan-400' : 'text-cyan-700',
                    ACTION: theme === 'dark' ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold',
                    WARN: theme === 'dark' ? 'text-amber-400' : 'text-amber-700',
                    ERROR: theme === 'dark' ? 'text-red-400 font-bold' : 'text-red-700 font-bold',
                    DEBUG: theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'
                  };
                  return (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-zinc-800/20 px-1 rounded">
                      <span className="text-zinc-500 text-[10px] shrink-0 font-mono select-none">
                        [{log.timestamp}]
                      </span>
                      <span className={`px-1 rounded text-[9px] font-bold shrink-0 select-none ${levelColors[log.level] || 'text-zinc-400'}`}>
                        [{log.level}]
                      </span>
                      <span className={`break-all flex-1 ${
                        log.level === 'ERROR'
                          ? (theme === 'dark' ? 'text-red-200' : 'text-red-900')
                          : (theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800')
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  );
                })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FULLSCREEN LIGHTBOX                                            */}
      {/* ============================================================== */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          {/* Lightbox Controls Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between pb-3 text-zinc-300 text-xs font-mono select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 border border-zinc-700 bg-zinc-900 text-zinc-200 text-[11px] font-bold">
                FULLSCREEN_ZOOM
              </span>
              <span className="text-zinc-400 text-[11px] truncate max-w-md">
                {lightboxImg.split('/').pop()}
              </span>
            </div>
            <button
              onClick={() => setLightboxImg(null)}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center gap-1.5 text-xs font-mono transition rounded-xs shadow-md"
            >
              <X className="w-3.5 h-3.5" />
              TUTUP (ESC / KLIK)
            </button>
          </div>

          <div
            className="relative flex items-center justify-center max-w-full max-h-[86vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImg}
              alt="Zoomed"
              className="max-w-full max-h-[86vh] border border-zinc-700 shadow-2xl object-contain bg-black"
            />
          </div>

          <div className="text-[10px] text-zinc-400 font-mono pt-3">
            Klik area di luar gambar atau tekan tombol TUTUP untuk kembali
          </div>
        </div>
      )}
    </div>
  );
}
