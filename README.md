# 📸 FlowSnap

**Autonomous UI Action Recorder & Intelligent SOP Synthesizer**  
*Open-source, 100% lokal, privasi aman, gratis tanpa batas dokumen.*

FlowSnap adalah alternatif mandiri lokal untuk alat dokumentasi alur kerja seperti Scribe dan Tango. Berjalan sepenuhnya di komputer lokal tanpa mengirim tangkapan layar ke cloud publik pihak ketiga.

---

## ✨ Fitur Unggulan

1. **Dual-Capture Otomatis (Aksi + Hasil)**:
   - **Action**: Menyorot elemen yang harus diklik (tombol, link, menu, input) dengan border merah neon + badge bulat penanda klik.
   - **Result**: Otomatis menangkap perubahan tampilan layar setelah aksi diproses (modal terbuka, form tersimpan, tabel termuat).
2. **Multi-Trigger Fleksibel**:
   - **Klik Mouse**: Capture pasangan Action & Result.
   - **Input Enter**: Otomatis menangkap isian form / search bar.
   - **Hotkey `F8`**: Instant Screen Capture kapan saja.
   - **Hotkey `F9`**: Active Modal Dialog Capture.
   - **Floating HUD Bar**: Tombol kontrol di pojok browser yang otomatis sembunyi saat capture agar hasil gambar tetap bersih.
3. **Multi-Instance & Profile Support**:
   - Cocok untuk bekerja dengan banyak instance Odoo (Staging, Development, Production) atau web app apa pun.
   - Session login tersimpan secara persisten per profil.
4. **AI-Powered SOP Generator**:
   - Terintegrasi dengan **Google Gemini**, **OpenAI**, dan **Ollama (Lokal & Offline)**.
   - Mengubah jejak klik mentah menjadi panduan operasional (SOP) tingkat enterprise.
5. **Pre-flight Check**:
   - Otomatis mendeteksi ketersediaan Playwright dan Chromium.

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Kloning & Pemasangan Dependensi
```bash
git clone https://github.com/your-username/flowsnap.git
cd flowsnap
npm install
```

### 2. Mulai Merekam Alur
```bash
# Mulai dengan target default
./bin/flowsnap.mjs start

# Atau tentukan URL target dan folder penyimpanan:
./bin/flowsnap.mjs start --url https://staging-legal.odoo.com --out ./recordings/setup-stage --title "SOP Setup Stage"
```

### 3. Rekam & Sintesis dengan AI (Gemini / OpenAI)
```bash
export GEMINI_API_KEY="AIzaSy..."
./bin/flowsnap.mjs start --out ./recordings/setup-stage --ai --provider gemini
```

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

- [x] **Fase 1 (CLI Core Engine)**: Browser automation, dual-capture, floating HUD, Markdown & HTML viewer.
- [ ] **Fase 2 (Native Desktop App via Tauri + Rust)**:
  - GUI minimalis modern untuk setting target URL, profiles, hotkeys, dan output format.
  - Native global hotkey capture lintas aplikasi desktop (bukan hanya browser).
  - Built-in visual editor untuk blur data sensitif (password, token, rekening).
  - One-click export ke PDF & Word (.docx) berstandar rekayasa perangkat lunak modern.

---

## 📄 Lisensi
MIT License. Bebas digunakan dan dimodifikasi untuk kebutuhan internal tim maupun open-source.
