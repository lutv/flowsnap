import fs from 'node:fs';
import path from 'node:path';

export class GuideGenerator {
  constructor(outDir, options = {}) {
    this.outDir = path.resolve(process.cwd(), outDir);
    this.title = options.title || 'SOP & Panduan Alur Kerja';
    this.format = options.format || 'detailed';
  }

  generate(steps = null) {
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

  buildHTML(steps) {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.title}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --accent: #2563eb;
      --accent-neon: #ff0055;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    body {
      margin: 0;
      padding: 24px;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    header { margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
    h1 { font-size: 26px; margin: 0 0 8px 0; color: #ffffff; }
    .meta { color: var(--text-muted); font-size: 13px; }
    .step-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 28px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .step-header {
      padding: 16px 20px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .step-badge {
      background: var(--accent-neon);
      color: white;
      font-weight: bold;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .step-title { font-size: 16px; font-weight: 600; margin: 0; }
    .step-body { padding: 20px; }
    .step-desc { margin-bottom: 16px; color: #cbd5e1; font-size: 14px; }
    .img-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
    @media(min-width: 800px) {
      .img-grid.dual { grid-template-columns: 1fr 1fr; }
    }
    .img-box {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: #020617;
    }
    .img-box h4 {
      margin: 0;
      padding: 8px 12px;
      font-size: 12px;
      background: rgba(255,255,255,0.05);
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }
    .img-box img { width: 100%; display: block; cursor: zoom-in; }
    .img-box img:hover { opacity: 0.95; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${this.title}</h1>
      <div class="meta">Total: ${steps.length} Langkah • Dibuat otomatis via FlowSnap Engine</div>
    </header>

    ${steps.map(s => `
      <div class="step-card">
        <div class="step-header">
          <div class="step-badge">${s.step}</div>
          <h2 class="step-title">${s.aiTitle || this.formatActionLabel(s)}</h2>
        </div>
        <div class="step-body">
          <div class="step-desc">${s.aiDescription || `Klik pada elemen <strong>${s.label}</strong> (<small>${s.url}</small>)`}</div>
          <div class="img-grid ${s.resultFile ? 'dual' : ''}">
            <div class="img-box">
              <h4>🎯 TARGET AKSI (KLIK)</h4>
              <img src="${s.actionFile}" alt="Aksi ${s.step}" onclick="window.open(this.src)">
            </div>
            ${s.resultFile ? `
            <div class="img-box">
              <h4>✅ HASIL SETELAH AKSI</h4>
              <img src="${s.resultFile}" alt="Hasil ${s.step}" onclick="window.open(this.src)">
            </div>` : ''}
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;
  }
}
