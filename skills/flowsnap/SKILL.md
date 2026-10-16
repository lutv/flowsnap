---
name: flowsnap
description: >-
  Autonomous UI Action Recorder & Intelligent SOP Synthesizer.
  Use when the user wants to record web application workflows (e.g. Odoo, internal dashboards),
  generate professional SOP documentation (Markdown & interactive HTML with zoomable lightbox),
  capture dual-capture action/result screenshots, auto-redact sensitive passwords/tokens,
  or synthesize raw clicks into enterprise procedures using AI.
---

# 📸 FlowSnap Agent Skill

FlowSnap adalah engine perekam aksi UI otonom dan penyusun SOP (Standar Operasional Prosedur) teknis otomatis dengan fitur **Dual-Capture (Action + Result)** dan **Auto-Redaction** data sensitif.

---

## 🎯 Kapan Menggunakan Skill Ini?

Aktifkan skill ini ketika:
1. User meminta pembuatan panduan alur kerja, dokumentasi sistem, atau SOP aplikasi web (misal: Odoo, ERP, CRM, portal internal).
2. Perlu merekam jejak langkah klik, input form, atau dialog modal secara visual tanpa mengekspos kata sandi atau data rahasia.
3. Ingin meregenerasi atau menyempurnakan dokumentasi Markdown (`GUIDE.md`) dan Web Viewer interaktif (`index.html`) dari jejak rekaman yang ada.
4. Menjalankan skenario otomatisasi UI headless untuk QA atau dokumentasi regresi.

---

## 🛠️ Cara Interaksi Agent dengan FlowSnap

Agent dapat menggunakan FlowSnap melalui dua cara:
1. **MCP Tools** (direkomendasikan jika MCP server terpasang).
2. **CLI Runner** (eksekusi perintah langsung di terminal).

### 1. Daftar Tools MCP FlowSnap
- `flowsnap_record_automated`: Menjalankan perekaman headless otomatis berdasarkan daftar aksi JSON.
- `flowsnap_generate_sop`: Re-generate `GUIDE.md` dan `index.html` dari folder rekaman.
- `flowsnap_ai_enhance`: Mensintesis jejak klik mentah menjadi narasi SOP tingkat enterprise (Gemini/OpenAI/Ollama).
- `flowsnap_list_profiles`: Melihat daftar instance/profil yang tersimpan.
- `flowsnap_set_profile`: Menambahkan profil target URL baru.
- `flowsnap_validate`: Menjalankan validasi kesiapan Playwright & Chromium.

### 2. Perintah CLI FlowSnap
- **Mulai Sesi Interaktif**:
  ```bash
  ./bin/flowsnap.mjs start --url <TARGET_URL> --out <OUTPUT_DIR> --title "<JUDUL_SOP>"
  ```
- **Sintesis dengan AI**:
  ```bash
  ./bin/flowsnap.mjs ai-enhance --out <OUTPUT_DIR> --provider gemini
  ```
- **Re-generate Dokumen**:
  ```bash
  ./bin/flowsnap.mjs generate --out <OUTPUT_DIR>
  ```
- **Validasi Diagnostik**:
  ```bash
  npm test
  # atau:
  ./bin/flowsnap.mjs validate
  ```

---

## 🔒 Jaminan Auto-Redaction & Keamanan Privasi
FlowSnap secara otomatis menyamarkan:
- Input password (`type="password"`)
- Field dengan atribut `autocomplete="*password*"` atau `autocomplete="cc-*"`
- Elemen bertanda `data-flowsnap-redact` atau class `.flowsnap-redact`
- Field dengan nama/id/placeholder sensitif (`password`, `token`, `secret`, `api_key`, `pin`, `cvv`, `rekening`)
Nilai tidak akan pernah ditulis ke manifes `steps.json` maupun teks dokumentasi, dan secara visual diburamkan (`filter: blur(10px)`) saat screenshot diambil.

---

## 📁 Struktur Output yang Dihasilkan
Folder output rekaman selalu berisi:
- `steps.json`: Metadata langkah teknis berurutan (tipe aksi, selector, URL, file screenshot).
- `GUIDE.md`: Dokumen SOP standar berformat Markdown dengan petunjuk langkah aktif.
- `index.html`: Web Viewer interaktif mandiri yang dilengkapi fitur **Lightbox Zoom modal** dan **Print-to-PDF stylesheet**.
- `step_00X_01_action_*.png`: Tangkapan layar target aksi dengan border neon merah + badge bulat.
- `step_00X_02_result_*.png`: Tangkapan layar hasil perubahan tampilan setelah aksi selesai.
