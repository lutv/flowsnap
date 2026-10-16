import fs from 'node:fs';
import path from 'node:path';

export class GuideGenerator {
  constructor(outDir, options = {}) {
    this.outDir = path.resolve(process.cwd(), outDir);
    this.title = options.title || 'SOP & Panduan Alur Kerja';
    this.format = options.format || 'detailed';
    fs.mkdirSync(this.outDir, { recursive: true });
  }

  generate(steps = null) {
    fs.mkdirSync(this.outDir, { recursive: true });
    const manifestPath = path.join(this.outDir, 'steps.json');
    const stepList = steps || (fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) : []);

    const mdContent = this.buildMarkdown(stepList);
    const htmlContent = this.buildHTML(stepList);

    fs.writeFileSync(path.join(this.outDir, 'GUIDE.md'), mdContent, 'utf-8');
    fs.writeFileSync(path.join(this.outDir, 'index.html'), htmlContent, 'utf-8');

    return { mdPath: path.join(this.outDir, 'GUIDE.md'), htmlPath: path.join(this.outDir, 'index.html') };
  }

  buildMarkdown(steps) {
    let md = `# ${this.title}\n\n`;
    md += `*Waktu Perekaman: ${new Date().toLocaleString('id-ID')}*\n`;
    md += `*Total Langkah: ${steps.length} langkah operasional*\n\n`;
    md += `> **Catatan Pelaksana**: Panduan ini dihasilkan secara otomatis menggunakan FlowSnap Engine. Ikuti instruksi pada kotak merah neon di setiap langkah.\n\n`;
    md += `---\n\n`;

    steps.forEach((s) => {
      const stepTitle = s.aiTitle || `Langkah ${s.step}: ${this.formatActionLabel(s)}`;
      md += `## ${stepTitle}\n\n`;

      if (s.aiDescription) {
        md += `${s.aiDescription}\n\n`;
      } else {
        md += `- **Tindakan**: Klik elemen \`<${s.tag}>\` dengan teks/label **"${s.label}"**\n`;
        md += `- **Halaman / URL**: \`${s.url}\`\n\n`;
      }

      md += `### 1. Target Aksi (Where to Click):\n\n`;
      md += `![Aksi Langkah ${s.step}](${s.actionFile})\n\n`;

      if (s.resultFile && this.format === 'detailed') {
        md += `### 2. Tampilan Hasil Setelah Aksi (Expected Result):\n\n`;
        md += `![Hasil Langkah ${s.step}](${s.resultFile})\n\n`;
      }

      if (s.aiValidation) {
        md += `> **Validasi Langkah**: ${s.aiValidation}\n\n`;
      }

      md += `---\n\n`;
    });

    return md;
  }

  formatActionLabel(s) {
    if (s.type === 'click') return `Klik "${s.label}"`;
    if (s.type === 'submit_input') return `Isi input "${s.label}"`;
    if (s.type === 'manual_screen') return `Tinjau Halaman Aktif`;
    if (s.type === 'modal_dialog') return `Periksa Dialog Modal`;
    return `Operasi "${s.label}"`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  buildHTML(steps) {
    const escapedTitle = this.escapeHtml(this.title);

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #151e2e;
      --border: #223049;
      --accent: #2563eb;
      --accent-neon: #ff0055;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 80px 16px;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
    }
    .container { max-width: 1040px; margin: 0 auto; }
    
    /* Header */
    header {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
    }
    h1 { font-size: 26px; margin: 0 0 8px 0; color: #ffffff; letter-spacing: -0.5px; }
    .meta { color: var(--text-muted); font-size: 13px; }
    .header-actions { display: flex; gap: 8px; }
    .btn-action {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s, border-color 0.2s;
    }
    .btn-action:hover { background: #334155; border-color: #475569; }

    /* Step Navigation Pills */
    .step-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 24px;
      padding: 10px 14px;
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .step-pill {
      font-size: 12px;
      color: var(--text-muted);
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.04);
      transition: all 0.2s;
    }
    .step-pill:hover {
      background: var(--accent);
      color: #ffffff;
    }

    /* Cards */
    .step-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 28px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
      scroll-margin-top: 24px;
    }
    .step-header {
      padding: 16px 20px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .step-badge {
      background: var(--accent-neon);
      color: white;
      font-weight: 800;
      min-width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      box-shadow: 0 0 10px rgba(255, 0, 85, 0.4);
    }
    .step-title { font-size: 16px; font-weight: 600; margin: 0; }
    .step-body { padding: 20px; }
    .step-desc { margin-bottom: 16px; color: #cbd5e1; font-size: 14px; }
    .step-desc strong { color: #f8fafc; }
    .step-desc small { color: #64748b; font-family: monospace; }
    
    .img-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
    @media(min-width: 820px) {
      .img-grid.dual { grid-template-columns: 1fr 1fr; }
    }
    .img-box {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: #020617;
      position: relative;
    }
    .img-box h4 {
      margin: 0;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .img-box img {
      width: 100%;
      display: block;
      cursor: zoom-in;
      transition: opacity 0.2s;
    }
    .img-box img:hover { opacity: 0.92; }

    /* Lightbox Modal */
    #flowsnap-lightbox {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(2, 6, 23, 0.92);
      backdrop-filter: blur(8px);
      z-index: 999999;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    #flowsnap-lightbox img {
      max-width: 95%;
      max-height: 90vh;
      border-radius: 8px;
      border: 1px solid #334155;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      object-fit: contain;
    }
    #flowsnap-lightbox-close {
      position: absolute;
      top: 16px;
      right: 20px;
      background: #1e293b;
      color: white;
      border: 1px solid #475569;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Print Styles */
    @media print {
      body { background: white !important; color: black !important; padding: 0 !important; }
      .header-actions, .step-nav, #flowsnap-lightbox { display: none !important; }
      .step-card { box-shadow: none !important; border: 1px solid #ccc !important; break-inside: avoid; page-break-inside: avoid; margin-bottom: 18px; }
      .step-header { background: #f1f5f9 !important; border-bottom: 1px solid #ccc !important; }
      .step-title { color: black !important; }
      .step-badge { background: #000 !important; color: #fff !important; }
      .step-desc { color: #333 !important; }
      .img-box { border: 1px solid #ccc !important; background: white !important; }
      .img-box h4 { background: #f8fafc !important; color: #333 !important; border-bottom: 1px solid #ccc !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>${escapedTitle}</h1>
        <div class="meta">Total: ${steps.length} Langkah • Dibuat otomatis via FlowSnap Engine</div>
      </div>
      <div class="header-actions">
        <button class="btn-action" onclick="window.print()">🖨️ Cetak / PDF</button>
      </div>
    </header>

    ${steps.length > 1 ? `
    <nav class="step-nav">
      <span style="font-size:12px; color:var(--text-muted); align-self:center; margin-right:4px;">Navigasi:</span>
      ${steps.map(s => `
        <a href="#step-${s.step}" class="step-pill">#${s.step} ${this.escapeHtml((s.aiTitle || this.formatActionLabel(s)).slice(0, 16))}</a>
      `).join('')}
    </nav>` : ''}

    ${steps.map(s => {
      const stepTitle = this.escapeHtml(s.aiTitle || this.formatActionLabel(s));
      const stepDesc = s.aiDescription
        ? this.escapeHtml(s.aiDescription)
        : `Klik pada elemen <strong>${this.escapeHtml(s.label)}</strong> (<small>${this.escapeHtml(s.url)}</small>)`;

      return `
      <div class="step-card" id="step-${s.step}">
        <div class="step-header">
          <div class="step-badge">${s.step}</div>
          <h2 class="step-title">${stepTitle}</h2>
        </div>
        <div class="step-body">
          <div class="step-desc">${stepDesc}</div>
          <div class="img-grid ${s.resultFile ? 'dual' : ''}">
            <div class="img-box">
              <h4><span>🎯 TARGET AKSI (KLIK)</span> <small style="color:var(--text-muted); font-size:10px;">Klik gambar untuk zoom</small></h4>
              <img src="${s.actionFile}" alt="Aksi ${s.step}" onclick="openLightbox(this.src)">
            </div>
            ${s.resultFile ? `
            <div class="img-box">
              <h4><span>✅ HASIL SETELAH AKSI</span> <small style="color:var(--text-muted); font-size:10px;">Klik gambar untuk zoom</small></h4>
              <img src="${s.resultFile}" alt="Hasil ${s.step}" onclick="openLightbox(this.src)">
            </div>` : ''}
          </div>
        </div>
      </div>
      `;
    }).join('')}
  </div>

  <div id="flowsnap-lightbox" onclick="closeLightbox(event)">
    <button id="flowsnap-lightbox-close" onclick="closeLightbox()">✕</button>
    <img id="flowsnap-lightbox-img" src="" alt="Zoomed view" onclick="event.stopPropagation()">
  </div>

  <script>
    function openLightbox(src) {
      const lb = document.getElementById('flowsnap-lightbox');
      const img = document.getElementById('flowsnap-lightbox-img');
      img.src = src;
      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      const lb = document.getElementById('flowsnap-lightbox');
      lb.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  </script>
</body>
</html>`;
  }
}
