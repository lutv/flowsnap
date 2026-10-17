import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Disable internal caching in sharp to guarantee zero memory retention
sharp.cache(false);

export class ActionRecorder {
  constructor(page, options = {}) {
    this.page = page;
    this.outDir = path.resolve(process.cwd(), options.outDir || './recordings');
    this.autoResult = options.autoResult !== false;
    this.postWaitMs = options.postWaitMs || 800;
    this.redaction = options.redaction || { enabled: true, blurRadius: 10 };
    this.onStepCaptured = options.onStepCaptured || (() => {});
    
    this.stepCounter = 0;
    this.recordedSteps = [];
    this.isCapturing = false;
    this.eventQueue = [];

    fs.mkdirSync(this.outDir, { recursive: true });
  }

  async attach() {
    await this.page.exposeFunction('onFlowSnapEvent', async (eventData) => {
      this.eventQueue.push(eventData);
      this.processQueue();
    });

    await this.page.exposeFunction('onFlowSnapToggleResult', async (state) => {
      this.autoResult = state;
      console.log(`\x1b[36m[FlowSnap Settings]\x1b[0m Auto Result Capture: \x1b[1m${this.autoResult ? 'ON' : 'OFF'}\x1b[0m`);
    });

    await this.page.addInitScript(this.getClientScript());
  }

  async processQueue() {
    if (this.isCapturing || this.eventQueue.length === 0) return;
    this.isCapturing = true;

    while (this.eventQueue.length > 0) {
      const data = this.eventQueue.shift();
      try {
        await this.handleBrowserEvent(data);
      } catch (err) {
        console.error('Error saat capture action:', err.message);
      }
    }

    this.isCapturing = false;
  }

  async waitForIdle(timeoutMs = 15000) {
    const start = Date.now();
    while (this.isCapturing || this.eventQueue.length > 0) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timeout menunggu ActionRecorder idle (${timeoutMs}ms)`);
      }
      await new Promise(r => setTimeout(r, 50));
    }
  }

  async handleBrowserEvent(data) {
    try {
      this.stepCounter++;
      const stepPad = String(this.stepCounter).padStart(3, '0');
      const safeLabel = (data.label || 'action')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32) || 'action';

      // 1. CAPTURE ACTION (BEFORE / TARGET)
      const actionFilename = `step_${stepPad}_01_action_${safeLabel}.png`;
      const actionFilePath = path.join(this.outDir, actionFilename);

      // Instant clean screenshot (No DOM pollution)
      const cleanBuffer = await this.captureCleanBuffer();

      // Annotate precise bounding box + badge via Backend Sharp Engine
      if (data.coords && data.type !== 'manual_screen') {
        await this.annotateActionScreenshot(cleanBuffer, data.coords, this.stepCounter, actionFilePath);
      } else {
        fs.writeFileSync(actionFilePath, cleanBuffer);
      }

      console.log(`\x1b[33m[Step ${this.stepCounter}.1 ACTION]\x1b[0m ${data.type.toUpperCase()}: "${data.label}" -> \x1b[34m${actionFilename}\x1b[0m`);

      // 2. CAPTURE RESULT (AFTER)
      let resultFilename = null;
      if (this.autoResult && data.type !== 'manual_screen') {
        await this.page.waitForTimeout(this.postWaitMs);

        const resPad = String(this.stepCounter).padStart(3, '0');
        resultFilename = `step_${resPad}_02_result_${safeLabel}.png`;
        const resultFilePath = path.join(this.outDir, resultFilename);

        const resultBuffer = await this.captureCleanBuffer();
        fs.writeFileSync(resultFilePath, resultBuffer);
        console.log(`\x1b[32m[Step ${this.stepCounter}.2 RESULT]\x1b[0m Hasil -> \x1b[34m${resultFilename}\x1b[0m`);
      }

      const stepRecord = {
        step: this.stepCounter,
        type: data.type,
        label: data.label,
        tag: data.tag,
        url: data.url,
        actionFile: actionFilename,
        resultFile: resultFilename,
        isRedacted: !!data.isRedacted,
        timestamp: new Date().toISOString()
      };

      this.recordedSteps.push(stepRecord);
      this.saveManifest();
      this.onStepCaptured(stepRecord, this.recordedSteps);
    } catch (err) {
      console.error('Error saat capture action:', err.message);
    }
  }

  async captureCleanBuffer() {
    // Hide HUD and apply blur redaction before taking screenshot
    await this.page.evaluate((redactionCfg) => {
      const hud = document.getElementById('flowsnap-floating-hud');
      if (hud) hud.style.display = 'none';

      const ripple = document.getElementById('flowsnap-user-ripple');
      if (ripple) ripple.style.display = 'none';

      if (redactionCfg?.enabled !== false && window.__flowSnapApplyRedaction) {
        window.__flowSnapApplyRedaction(redactionCfg?.blurRadius || 10);
      }
    }, this.redaction).catch(() => {});

    await this.page.waitForTimeout(30);
    const buffer = await this.page.screenshot({ fullPage: false });

    // Restore HUD and remove redaction styles after capture
    await this.page.evaluate(() => {
      const hud = document.getElementById('flowsnap-floating-hud');
      if (hud) hud.style.display = 'flex';

      if (window.__flowSnapClearRedaction) {
        window.__flowSnapClearRedaction();
      }
    }).catch(() => {});

    return buffer;
  }

  async annotateActionScreenshot(rawBuffer, coords, stepNumber, outputPath) {
    try {
      const meta = await sharp(rawBuffer).metadata();
      const imgW = meta.width;
      const imgH = meta.height;

      // Coordinate scaling based on viewport dimension vs screenshot resolution
      const winW = coords.winW || imgW;
      const winH = coords.winH || imgH;
      const scaleX = winW > 0 ? imgW / winW : 1;
      const scaleY = winH > 0 ? imgH / winH : 1;

      let boxX = Math.round(coords.x * scaleX);
      let boxY = Math.round(coords.y * scaleY);
      let boxW = Math.round(coords.width * scaleX);
      let boxH = Math.round(coords.height * scaleY);

      let svgElements = '';

      if (boxW > 4 && boxH > 4) {
        // High-precision bounding box with small padding
        const pad = 4;
        const x = Math.max(2, boxX - pad);
        const y = Math.max(2, boxY - pad);
        const w = Math.min(imgW - x - 2, boxW + (pad * 2));
        const h = Math.min(imgH - y - 2, boxH + (pad * 2));

        // Position badge safely: if near top edge, place below box
        const badgeX = x;
        const badgeY = y > 24 ? y - 10 : y + h + 10;

        svgElements = `
          <filter id="fs-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.85"/>
          </filter>
          <!-- Red Precision Bounding Box -->
          <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="#ff0055" stroke-width="3.5" filter="url(#fs-glow)" />
          <!-- Inner Crisp Border -->
          <rect x="${x + 1}" y="${y + 1}" width="${Math.max(0, w - 2)}" height="${Math.max(0, h - 2)}" rx="5" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.4" />
          <!-- Step Number Badge Circle -->
          <circle cx="${badgeX}" cy="${badgeY}" r="13" fill="#ff0055" stroke="#ffffff" stroke-width="1.5" filter="url(#fs-glow)" />
          <!-- Step Number Text -->
          <text x="${badgeX}" y="${badgeY + 4.5}" fill="#ffffff" font-size="11" font-weight="900" text-anchor="middle" font-family="system-ui, -apple-system, monospace">${stepNumber}</text>
        `;
      } else {
        // Fallback: draw target bullseye on click coordinates
        const clickX = Math.round((coords.clickX || coords.x) * scaleX);
        const clickY = Math.round((coords.clickY || coords.y) * scaleY);

        svgElements = `
          <filter id="fs-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.85"/>
          </filter>
          <circle cx="${clickX}" cy="${clickY}" r="22" fill="rgba(255, 0, 85, 0.15)" stroke="#ff0055" stroke-width="3" filter="url(#fs-glow)" />
          <circle cx="${clickX}" cy="${clickY}" r="5" fill="#ff0055" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="${clickX + 16}" cy="${clickY - 16}" r="12" fill="#ff0055" stroke="#ffffff" stroke-width="1.5" filter="url(#fs-glow)" />
          <text x="${clickX + 16}" y="${clickY - 12}" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle" font-family="system-ui, monospace">${stepNumber}</text>
        `;
      }

      const svgOverlay = `<svg width="${imgW}" height="${imgH}" xmlns="http://www.w3.org/2000/svg">${svgElements}</svg>`;

      await sharp(rawBuffer)
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .png({ compressionLevel: 7 })
        .toFile(outputPath);
    } catch (err) {
      console.error('[ActionRecorder] Error annotating action image with sharp:', err.message);
      fs.writeFileSync(outputPath, rawBuffer);
    }
  }

  saveManifest() {
    fs.writeFileSync(
      path.join(this.outDir, 'steps.json'),
      JSON.stringify(this.recordedSteps, null, 2),
      'utf-8'
    );
  }

  getClientScript() {
    return () => {
      function isSensitiveElement(el) {
        if (!el) return false;
        if (el.type === 'password') return true;
        const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
        if (ac.includes('password') || ac.includes('cc-')) return true;
        if (el.hasAttribute('data-flowsnap-redact') || el.classList?.contains('flowsnap-redact')) return true;
        const nameAndId = `${el.name || ''} ${el.id || ''} ${el.getAttribute('placeholder') || ''}`.toLowerCase();
        return /password|token|secret|apikey|api_key|pin|cvv|rekening|card_number|credit_card/.test(nameAndId);
      }

      window.__flowSnapApplyRedaction = (blurRadius = 10) => {
        if (document.getElementById('flowsnap-redaction-styles')) return;
        const style = document.createElement('style');
        style.id = 'flowsnap-redaction-styles';
        style.textContent = `
          input[type="password"],
          input[autocomplete*="password"],
          input[autocomplete*="cc-"],
          [data-flowsnap-redact],
          .flowsnap-redact,
          input[name*="password" i],
          input[name*="token" i],
          input[name*="secret" i],
          input[name*="api_key" i],
          input[name*="apikey" i],
          input[name*="pin" i],
          input[name*="cvv" i],
          input[name*="rekening" i],
          input[id*="password" i],
          input[id*="token" i],
          input[id*="secret" i],
          textarea[name*="secret" i],
          textarea[name*="token" i] {
            filter: blur(${blurRadius}px) !important;
            background: repeating-linear-gradient(45deg, #0f172a, #0f172a 8px, #1e293b 8px, #1e293b 16px) !important;
            color: transparent !important;
            text-shadow: none !important;
            user-select: none !important;
            border: 1px dashed #64748b !important;
          }
        `;
        document.head.appendChild(style);
      };

      window.__flowSnapClearRedaction = () => {
        const style = document.getElementById('flowsnap-redaction-styles');
        if (style) style.remove();
      };

      function getDesc(el) {
        if (!el) return 'element';
        if (isSensitiveElement(el)) {
          if (el.getAttribute('placeholder')) return el.getAttribute('placeholder');
          if (el.name) return el.name;
          if (el.id) return `#${el.id}`;
          return 'sensitive_field';
        }
        const text = (el.innerText || el.textContent || '').trim().split('\n')[0].slice(0, 40);
        if (text) return text;
        if (el.getAttribute('placeholder')) return el.getAttribute('placeholder');
        if (el.getAttribute('title')) return el.getAttribute('title');
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        if (el.name) return el.name;
        if (el.id) return `#${el.id}`;
        return el.tagName.toLowerCase();
      }

      function showInstantRipple(clientX, clientY) {
        const ripple = document.createElement('div');
        ripple.id = 'flowsnap-user-ripple';
        ripple.style.position = 'fixed';
        ripple.style.left = `${clientX - 12}px`;
        ripple.style.top = `${clientY - 12}px`;
        ripple.style.width = '24px';
        ripple.style.height = '24px';
        ripple.style.borderRadius = '50%';
        ripple.style.backgroundColor = 'rgba(255, 0, 85, 0.35)';
        ripple.style.border = '2px solid #ff0055';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '2147483647';
        ripple.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
        document.body.appendChild(ripple);

        requestAnimationFrame(() => {
          ripple.style.transform = 'scale(2.2)';
          ripple.style.opacity = '0';
          setTimeout(() => ripple.remove(), 200);
        });
      }

      // 1. POINTERDOWN LISTENER (Capture exact coordinates at the earliest instant)
      document.addEventListener('pointerdown', (e) => {
        const target = e.target;
        if (!target) return;
        if (target.closest('#flowsnap-floating-hud')) return;

        const rect = target.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const coords = {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          clickX: Math.round(e.clientX),
          clickY: Math.round(e.clientY),
          winW: window.innerWidth,
          winH: window.innerHeight,
          dpr
        };

        // Instant visual feedback for human operator in browser
        showInstantRipple(e.clientX, e.clientY);

        if (window.onFlowSnapEvent) {
          window.onFlowSnapEvent({
            type: 'click',
            label: getDesc(target),
            tag: target.tagName.toLowerCase(),
            url: window.location.href,
            coords
          });
        }
      }, true);

      // 2. SHORTCUTS & INPUT SUBMITS
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F8') {
          e.preventDefault();
          window.onFlowSnapEvent && window.onFlowSnapEvent({
            type: 'manual_screen',
            label: 'current_screen_view',
            tag: 'window',
            url: window.location.href
          });
        } else if (e.key === 'F9') {
          e.preventDefault();
          window.onFlowSnapEvent && window.onFlowSnapEvent({
            type: 'modal_dialog',
            label: 'active_modal_view',
            tag: 'modal',
            url: window.location.href
          });
        } else if (e.key === 'Enter' && e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          const isSens = isSensitiveElement(e.target);
          const rawVal = e.target.value;
          const displayVal = isSens ? '••••••••' : rawVal;
          const rect = e.target.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;

          const coords = {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            clickX: Math.round(rect.left + rect.width / 2),
            clickY: Math.round(rect.top + rect.height / 2),
            winW: window.innerWidth,
            winH: window.innerHeight,
            dpr
          };

          if (rawVal) {
            setTimeout(() => {
              window.onFlowSnapEvent && window.onFlowSnapEvent({
                type: 'submit_input',
                label: `input_${getDesc(e.target)}_${displayVal.slice(0, 20)}`,
                tag: e.target.tagName.toLowerCase(),
                url: window.location.href,
                isRedacted: isSens,
                coords
              });
            }, 60);
          }
        }
      }, true);

      // 3. FLOATING HUD
      function injectHUD() {
        if (document.getElementById('flowsnap-floating-hud')) return;

        const hud = document.createElement('div');
        hud.id = 'flowsnap-floating-hud';
        hud.style.position = 'fixed';
        hud.style.bottom = '16px';
        hud.style.right = '16px';
        hud.style.backgroundColor = 'rgba(15, 23, 42, 0.94)';
        hud.style.backdropFilter = 'blur(8px)';
        hud.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        hud.style.borderRadius = '30px';
        hud.style.padding = '6px 14px';
        hud.style.display = 'flex';
        hud.style.alignItems = 'center';
        hud.style.gap = '8px';
        hud.style.zIndex = '2147483647';
        hud.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        hud.style.userSelect = 'none';
        hud.style.fontFamily = 'system-ui, -apple-system, sans-serif';

        hud.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="width:10px; height:10px; border-radius:50%; background:#ef4444; box-shadow:0 0 8px #ef4444;"></span>
            <span style="color:#ffffff; font-size:12px; font-weight:700;">FLOWSNAP</span>
          </div>
          <div style="width:1px; height:18px; background:rgba(255,255,255,0.2);"></div>
          <button id="fs-btn-snap" style="background:#2563eb; color:#fff; border:none; border-radius:20px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer;" title="Capture Layar (F8)">📸 Snap (F8)</button>
          <button id="fs-btn-toggle" style="background:#10b981; color:#fff; border:none; border-radius:20px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer;" title="Toggle Auto Result">Result: ON</button>
          <span style="background:rgba(56, 189, 248, 0.15); color:#38bdf8; border:1px solid rgba(56, 189, 248, 0.3); border-radius:20px; padding:3px 8px; font-size:11px; font-weight:600;" title="Auto Redaction Password & Data Sensitif Aktif">🛡️ Redact</span>
        `;

        document.body.appendChild(hud);

        document.getElementById('fs-btn-snap').onclick = (e) => {
          e.stopPropagation();
          window.onFlowSnapEvent && window.onFlowSnapEvent({
            type: 'manual_screen',
            label: 'current_screen_view',
            tag: 'window',
            url: window.location.href
          });
        };

        let resultOn = true;
        const toggleBtn = document.getElementById('fs-btn-toggle');
        toggleBtn.onclick = (e) => {
          e.stopPropagation();
          resultOn = !resultOn;
          toggleBtn.textContent = resultOn ? 'Result: ON' : 'Result: OFF';
          toggleBtn.style.backgroundColor = resultOn ? '#10b981' : '#64748b';
          window.onFlowSnapToggleResult && window.onFlowSnapToggleResult(resultOn);
        };
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectHUD);
      } else {
        injectHUD();
      }
    };
  }
}
