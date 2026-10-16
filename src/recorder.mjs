import fs from 'node:fs';
import path from 'node:path';

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

      await this.page.waitForTimeout(160);
      await this.captureClean(actionFilePath);

      console.log(`\x1b[33m[Step ${this.stepCounter}.1 ACTION]\x1b[0m ${data.type.toUpperCase()}: "${data.label}" -> \x1b[34m${actionFilename}\x1b[0m`);

      // Clear overlay safely
      await this.page.evaluate(() => {
        if (window.__flowSnapClearHighlight) window.__flowSnapClearHighlight();
      }).catch(() => {});

      // 2. CAPTURE RESULT (AFTER)
      let resultFilename = null;
      if (this.autoResult && data.type !== 'manual_screen') {
        await this.page.waitForTimeout(this.postWaitMs);

        const resPad = String(this.stepCounter).padStart(3, '0');
        resultFilename = `step_${resPad}_02_result_${safeLabel}.png`;
        const resultFilePath = path.join(this.outDir, resultFilename);

        await this.captureClean(resultFilePath);
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

  async captureClean(filePath) {
    await this.page.evaluate((redactionCfg) => {
      const hud = document.getElementById('flowsnap-floating-hud');
      if (hud) hud.style.display = 'none';

      if (redactionCfg?.enabled !== false && window.__flowSnapApplyRedaction) {
        window.__flowSnapApplyRedaction(redactionCfg?.blurRadius || 10);
      }
    }, this.redaction).catch(() => {});

    await this.page.waitForTimeout(60);
    await this.page.screenshot({ path: filePath, fullPage: false });

    await this.page.evaluate(() => {
      const hud = document.getElementById('flowsnap-floating-hud');
      if (hud) hud.style.display = 'flex';

      if (window.__flowSnapClearRedaction) {
        window.__flowSnapClearRedaction();
      }
    }).catch(() => {});
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
      let activeHighlight = null;

      window.__flowSnapClearHighlight = () => {
        if (activeHighlight && activeHighlight.parentNode) {
          activeHighlight.parentNode.removeChild(activeHighlight);
          activeHighlight = null;
        }
      };

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

      // 1. CLICK LISTENER
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target) return;
        if (target.closest('#flowsnap-floating-hud') || target.classList.contains('flowsnap-overlay-el')) return;

        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        window.__flowSnapClearHighlight();

        const overlay = document.createElement('div');
        overlay.className = 'flowsnap-overlay-el';
        overlay.style.position = 'fixed';
        overlay.style.left = `${Math.max(0, rect.left - 4)}px`;
        overlay.style.top = `${Math.max(0, rect.top - 4)}px`;
        overlay.style.width = `${rect.width + 8}px`;
        overlay.style.height = `${rect.height + 8}px`;
        overlay.style.border = '3px solid #ff0055';
        overlay.style.borderRadius = '6px';
        overlay.style.boxShadow = '0 0 16px rgba(255, 0, 85, 0.8), inset 0 0 8px rgba(255, 0, 85, 0.2)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '2147483646';

        const badge = document.createElement('div');
        badge.className = 'flowsnap-overlay-el';
        badge.style.position = 'absolute';
        badge.style.top = '-14px';
        badge.style.left = '-14px';
        badge.style.width = '24px';
        badge.style.height = '24px';
        badge.style.backgroundColor = '#ff0055';
        badge.style.color = '#ffffff';
        badge.style.borderRadius = '50%';
        badge.style.fontSize = '12px';
        badge.style.fontWeight = 'bold';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
        badge.textContent = '●';

        overlay.appendChild(badge);
        document.body.appendChild(overlay);
        activeHighlight = overlay;

        if (window.onFlowSnapEvent) {
          window.onFlowSnapEvent({
            type: 'click',
            label: getDesc(target),
            tag: target.tagName.toLowerCase(),
            url: window.location.href
          });
        }
      }, true);

      // 2. SHORTCUTS
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
          if (rawVal) {
            setTimeout(() => {
              window.onFlowSnapEvent && window.onFlowSnapEvent({
                type: 'submit_input',
                label: `input_${getDesc(e.target)}_${displayVal.slice(0, 20)}`,
                tag: e.target.tagName.toLowerCase(),
                url: window.location.href,
                isRedacted: isSens
              });
            }, 200);
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

      if (document.body) injectHUD();
      else window.addEventListener('DOMContentLoaded', injectHUD);
      setInterval(() => {
        if (!document.getElementById('flowsnap-floating-hud') && document.body) injectHUD();
      }, 1500);
    };
  }
}
