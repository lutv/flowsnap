import React, { useState } from 'react';
import {
  Camera,
  Play,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Settings,
  FolderOpen,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Sliders,
  Layers,
  Key,
  Globe,
  Plus,
  RefreshCw,
  Search,
  Zap,
  Info
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('recorder'); // 'recorder' | 'library' | 'settings'

  // Recorder Form State
  const [targetUrl, setTargetUrl] = useState('https://demo.odoo.com');
  const [sopTitle, setSopTitle] = useState('SOP Pembuatan Invoice & Faktur Pelanggan');
  const [selectedProfile, setSelectedProfile] = useState('default');
  const [autoResult, setAutoResult] = useState(true);
  const [autoRedact, setAutoRedact] = useState(true);
  const [aiEnhance, setAiEnhance] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Profiles State
  const [profiles, setProfiles] = useState([
    { name: 'default', url: 'https://demo.odoo.com', outDir: './recordings/default' },
    { name: 'staging', url: 'https://staging.example.com', outDir: './recordings/staging' },
    { name: 'production', url: 'https://app.example.com', outDir: './recordings/production' }
  ]);

  // Library / Recordings Mock State
  const [searchQuery, setSearchQuery] = useState('');
  const [recordings, setRecordings] = useState([
    {
      id: 'rec-1',
      title: 'SOP Pembuatan Invoice & Faktur Pelanggan',
      stepsCount: 8,
      date: 'Hari ini, 12:45',
      outDir: './recordings/invoice-guide',
      url: 'https://demo.odoo.com',
      aiEnhanced: true,
      thumbnail: 'step_001_01_action_create_invoice.png'
    },
    {
      id: 'rec-2',
      title: 'Panduan Konfigurasi Hak Akses User Odoo',
      stepsCount: 5,
      date: 'Kemarin, 16:20',
      outDir: './recordings/user-access',
      url: 'https://staging.example.com',
      aiEnhanced: true,
      thumbnail: 'step_001_01_action_settings.png'
    }
  ]);

  // AI & App Settings
  const [geminiKey, setGeminiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [blurRadius, setBlurRadius] = useState(10);

  const getCliCommand = () => {
    let cmd = `./bin/flowsnap.mjs start --url "${targetUrl}" --title "${sopTitle}" --profile ${selectedProfile}`;
    if (!autoResult) cmd += ' --no-result';
    if (aiEnhance) cmd += ` --ai --provider ${selectedProvider}`;
    return cmd;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/20 ring-1 ring-white/20">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-white">FlowSnap</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                Studio Desktop v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous SOP Recorder & Synthesizer</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('recorder')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'recorder'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Studio Recorder
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'library'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            SOP Library
            <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full">
              {recordings.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Profiles & AI
          </button>
        </nav>

        {/* Engine Status Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Playwright Ready
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Redact Active
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8">
        {/* TAB 1: STUDIO RECORDER */}
        {activeTab === 'recorder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Recording Configuration */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-pink-500 fill-pink-500" />
                    Mulai Sesi Perekaman Alur Baru
                  </h2>
                  <span className="text-xs text-slate-400">Mode Interaktif Playwright</span>
                </div>

                <div className="space-y-4">
                  {/* Target URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Target Web App URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-colors"
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-slate-500">Preset Cepat:</span>
                      <button
                        onClick={() => setTargetUrl('https://demo.odoo.com')}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 hover:bg-slate-700 transition"
                      >
                        Odoo Demo
                      </button>
                      <button
                        onClick={() => setTargetUrl('https://staging.example.com')}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 hover:bg-slate-700 transition"
                      >
                        Staging ERP
                      </button>
                    </div>
                  </div>

                  {/* SOP Document Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Judul Dokumen SOP
                    </label>
                    <input
                      type="text"
                      value={sopTitle}
                      onChange={(e) => setSopTitle(e.target.value)}
                      placeholder="e.g. Panduan Verifikasi Pengajuan Cuti Karyawan"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Profile Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Pilih Profil Instance
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {profiles.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setSelectedProfile(p.name);
                            setTargetUrl(p.url);
                          }}
                          className={`px-3 py-2 rounded-xl text-left border transition-all ${
                            selectedProfile === p.name
                              ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          <div className="font-semibold text-xs capitalize">{p.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{p.url}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Features Toggles */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 cursor-pointer hover:border-slate-700 transition">
                      <input
                        type="checkbox"
                        checked={autoResult}
                        onChange={(e) => setAutoResult(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Dual-Capture</div>
                        <div className="text-[10px] text-slate-500">Aksi + Hasil layar</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 cursor-pointer hover:border-slate-700 transition">
                      <input
                        type="checkbox"
                        checked={autoRedact}
                        onChange={(e) => setAutoRedact(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Auto-Redact</div>
                        <div className="text-[10px] text-slate-500">Blur password & token</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 cursor-pointer hover:border-slate-700 transition">
                      <input
                        type="checkbox"
                        checked={aiEnhance}
                        onChange={(e) => setAiEnhance(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">AI SOP Synthesis</div>
                        <div className="text-[10px] text-slate-500">Narasi teknis otomatis</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Primary Launch Button */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Browser Chromium akan otomatis terbuka & merekam jejak klik.
                  </div>
                  <button
                    onClick={() => {
                      alert(`Menjalankan perekaman:\n${getCliCommand()}\n\n(Di desktop Tauri, ini otomatis membuka browser session!)`);
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-pink-500/25 flex items-center gap-2 transition-all transform active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Mulai Rekam Alur (Start)
                  </button>
                </div>
              </div>

              {/* CLI Command Preview Box */}
              <div className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Equivalent CLI Command
                  </span>
                  <button
                    onClick={() => copyToClipboard(getCliCommand())}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCmd ? 'Tersalin!' : 'Salin Perintah'}
                  </button>
                </div>
                <code className="block bg-slate-950 p-2.5 rounded-lg text-xs font-mono text-pink-300 break-all select-all">
                  {getCliCommand()}
                </code>
              </div>
            </div>

            {/* Right 1 Col: Hotkey Cheat-Sheet & Info */}
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Shortcut Kontrol Browser
                </h3>
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/60">
                    <span className="text-slate-300">Klik Elemen</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">Mouse Left</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/60">
                    <span className="text-slate-300">Instant Screen Snap</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold">F8</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/60">
                    <span className="text-slate-300">Modal Dialog Snap</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold">F9</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/60">
                    <span className="text-slate-300">Submit Input Form</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">Enter</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Floating HUD</span>
                    <span className="text-[11px] text-emerald-400 font-semibold">Pojok Kanan Bawah</span>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Border merah neon + badge bulat penanda klik akan otomatis terpasang pada gambar tanpa mengotori layar aslinya.
                  </span>
                </div>
              </div>

              {/* Fast Status Card */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Narration Engine
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Setiap jejak klik mentah otomatis disintesis menjadi bahasa SOP profesional tingkat enterprise.
                </p>
                <div className="text-[11px] text-slate-400">
                  Model Aktif: <span className="font-semibold text-white">Gemini 1.5 Flash (Default)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SOP LIBRARY & VIEWER */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Dokumen Panduan & SOP Tersimpan</h2>
                <p className="text-xs text-slate-400">Kelola dan review hasil rekaman interaktif FlowSnap</p>
              </div>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari SOP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recordings
                .filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {rec.stepsCount} Langkah
                        </span>
                        <span className="text-xs text-slate-500">{rec.date}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{rec.title}</h3>
                      <p className="text-xs text-slate-400 font-mono mb-4">{rec.url}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-mono">{rec.outDir}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => alert(`Membuka Web Viewer interaktif di: ${rec.outDir}/index.html`)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Buka Viewer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROFILES & AI SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8">
            {/* Instance Profiles Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    Manajemen Profil Target Instance
                  </h3>
                  <p className="text-xs text-slate-400">Atur kredensial dan URL Odoo (Dev, Staging, Production)</p>
                </div>
                <button
                  onClick={() => {
                    const name = prompt('Nama Profil Baru (misal: client-a):');
                    const url = prompt('Target URL (misal: https://odoo.client.com):');
                    if (name && url) {
                      setProfiles([...profiles, { name, url, outDir: `./recordings/${name}` }]);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Profil
                </button>
              </div>

              <div className="divide-y divide-slate-800/80">
                {profiles.map((p) => (
                  <div key={p.name} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white capitalize">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{p.url}</div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {p.outDir}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Synthesizer Settings */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-pink-400" />
                  Pengaturan API Key & Model AI
                </h3>
                <p className="text-xs text-slate-400">Pilih provider untuk menyusun narasi operasional otomatis</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['gemini', 'openai', 'ollama'].map((prov) => (
                  <button
                    key={prov}
                    onClick={() => setSelectedProvider(prov)}
                    className={`p-3 rounded-xl border text-center font-semibold text-xs capitalize transition ${
                      selectedProvider === prov
                        ? 'border-pink-500 bg-pink-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {prov === 'gemini' ? 'Google Gemini' : prov === 'openai' ? 'OpenAI' : 'Ollama (Lokal)'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {selectedProvider.toUpperCase()} API Key (Opsional)
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy... / sk-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Jika kosong, FlowSnap otomatis menggunakan Heuristic Natural Language Generator bawaan tanpa biaya.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
