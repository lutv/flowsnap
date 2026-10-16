# 📸 FlowSnap

**Autonomous UI Action Recorder & Intelligent SOP Synthesizer**  
*Open-source, 100% lokal, privasi aman, gratis tanpa batas dokumen.*

FlowSnap adalah alternatif mandiri lokal untuk alat dokumentasi alur kerja seperti Scribe dan Tango. Berjalan sepenuhnya di komputer lokal tanpa mengirim tangkapan layar ke cloud publik pihak ketiga.

---

## ✨ Fitur Unggulan

1. **Dual-Capture Otomatis (Aksi + Hasil)**:
   - **Action**: Menyorot elemen yang harus diklik (tombol, link, menu, input) dengan border merah neon + badge bulat penanda klik.
   - **Result**: Otomatis menangkap perubahan tampilan layar setelah aksi diproses (modal terbuka, form tersimpan, tabel termuat).
2. **Auto-Redaction & Privasi Keamanan**:
   - Otomatis menyamarkan input kata sandi (`type="password"`), token API, PIN, CVV, dan nomor rekening.
   - Mengaburkan elemen sensitif di DOM (`filter: blur(10px)`) tepat saat tangkapan layar diambil.
   - Menghindari kebocoran data rahasia pada penamaan file gambar dan manifes `steps.json`.
3. **Interactive Web Viewer & Print Stylesheet**:
   - Dilengkapi **In-Place Lightbox Zoom**: Klik tangkapan layar untuk melihat detail gambar resolusi penuh tanpa membuka tab baru (ESC untuk menutup).
   - Bar navigasi cepat (`#step-1`, `#step-2`) untuk melompat antar langkah.
   - `@media print` bawaan agar dokumen siap dicetak atau disimpan ke PDF via browser (Ctrl+P) dengan tata letak putih bersih.
4. **Multi-Trigger Fleksibel**:
   - **Klik Mouse**: Capture pasangan Action & Result.
   - **Input Enter**: Otomatis menangkap isian form / search bar (dengan masking data sensitif).
   - **Hotkey `F8`**: Instant Screen Capture kapan saja.
   - **Hotkey `F9`**: Active Modal Dialog Capture.
   - **Floating HUD Bar**: Tombol kontrol di pojok browser yang otomatis sembunyi saat capture agar hasil gambar tetap bersih.
5. **Multi-Instance & Profile Support**:
   - Cocok untuk bekerja dengan banyak instance Odoo (Staging, Development, Production) atau web app apa pun.
   - Session login tersimpan secara persisten per profil.
6. **AI-Powered SOP Generator**:
   - Terintegrasi dengan **Google Gemini**, **OpenAI**, dan **Ollama (Lokal & Offline)**.
   - Mengubah jejak klik mentah menjadi panduan operasional (SOP) tingkat enterprise.
7. **Model Context Protocol (MCP) & AI Agent Skill**:
   - Dilengkapi **MCP Server bawaan** (`flowsnap-mcp`) dan **Agent Skill** agar AI Coding Assistant (Antigravity, Claude Desktop, Cursor) dapat merekam dan menyusun SOP secara otonom.

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Kloning & Pemasangan Dependensi
```bash
git clone https://github.com/your-username/flowsnap.git
cd flowsnap
npm install
```

### 2. Validasi & Pengujian Otomatis
Sebelum mulai merekam alur kerja, validasi kesiapan seluruh engine FlowSnap:
```bash
# Jalankan validasi end-to-end otomatis (diagnostik & simulasi browser headless)
npm test

# Atau jalankan seluruh suite unit & e2e test:
npm run test:all
```

### 3. Mulai Merekam Alur
```bash
# Mulai dengan target default
./bin/flowsnap.mjs start

# Atau tentukan URL target dan folder penyimpanan:
./bin/flowsnap.mjs start --url https://staging-legal.odoo.com --out ./recordings/setup-stage --title "SOP Setup Stage"
```

### 4. Rekam & Sintesis dengan AI (Gemini / OpenAI)
```bash
export GEMINI_API_KEY="AIzaSy..."
./bin/flowsnap.mjs start --out ./recordings/setup-stage --ai --provider gemini
```

---

## 🤖 Integrasi AI Agents (MCP Server & Skill)

FlowSnap dapat dikontrol langsung oleh AI Agent favorit Anda (Antigravity, Claude Desktop, Cursor, Windsurf).

### 1. Pasang MCP Server ke AI Agent
Tambahkan konfigurasi berikut ke file konfigurasi MCP agent Anda:

**Untuk Antigravity (`~/.gemini/config/mcp_config.json`)**:
```json
{
  "mcpServers": {
    "flowsnap": {
      "command": "node",
      "args": ["/absolute/path/to/flowsnap/bin/flowsnap-mcp.mjs"]
    }
  }
}
```

**Untuk Claude Desktop (`claude_desktop_config.json`) & Cursor (`mcp.json`)**:
Gunakan struktur `mcpServers` yang sama seperti di atas.

### 2. Tools MCP yang Disediakan
- `flowsnap_record_automated`: Perekaman alur UI headless otomatis dari daftar aksi JSON.
- `flowsnap_generate_sop`: Re-generate dokumen `GUIDE.md` & `index.html` dari folder rekaman.
- `flowsnap_ai_enhance`: Sintesis langkah rekaman menjadi SOP teknis formal via AI.
- `flowsnap_list_profiles` & `flowsnap_get_profile`: Membaca konfigurasi instance/profil.
- `flowsnap_validate`: Pre-flight diagnostik Playwright & browser.

### 3. Agent Skill (`SKILL.md`)
Buku panduan instruksi agent tersedia di folder:
- Local Project: [skills/flowsnap/SKILL.md](skills/flowsnap/SKILL.md)
- Antigravity Workspace: `.agents/skills/flowsnap/SKILL.md`

---

## 🛠️ Manajemen Profil Instance

```bash
# Tambah profil baru
./bin/flowsnap.mjs profile add prod https://legal.gankapital.com

# Lihat profil
./bin/flowsnap.mjs profiles

# Jalankan profil tertentu
./bin/flowsnap.mjs start --profile prod --out ./recordings/prod-guide
```

---

## 🤖 AI SOP Generator Standalone (`ai-enhance`)

Sempurnakan panduan yang sudah direkam tanpa perlu merekam ulang:
```bash
# Menggunakan Gemini (Default)
./bin/flowsnap.mjs ai-enhance --out ./recordings/setup-stage --provider gemini --ai-key YOUR_KEY

# Atau menggunakan Ollama (Lokal & Gratis)
./bin/flowsnap.mjs ai-enhance --out ./recordings/setup-stage --provider ollama
```

---

## 🗺️ Roadmap Menuju Native Desktop App

- [x] **Fase 1 (CLI Core Engine & Multi-Agent MCP)**:
  - Browser automation, dual-capture, floating HUD.
  - Interactive Lightbox Web Viewer & Print-ready stylesheet.
  - Military-grade Auto-Redaction untuk password dan kredensial sensitif.
  - Built-in MCP Server (`flowsnap-mcp`) & Antigravity/Claude Agent Skill.
- [ ] **Fase 2 (Native Desktop App via Tauri v2 + Rust)**:
  - GUI minimalis modern untuk setting target URL, profiles, hotkeys, dan output viewer.
  - Native global hotkey capture lintas aplikasi desktop (bukan hanya browser).
  - Built-in visual canvas editor untuk blur data sensitif manual tambahan.
  - One-click export ke PDF & Word (.docx).

---

## 📄 Lisensi
MIT License. Bebas digunakan dan dimodifikasi untuk kebutuhan internal tim maupun open-source.
