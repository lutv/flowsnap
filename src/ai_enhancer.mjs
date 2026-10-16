import fs from 'node:fs';
import path from 'node:path';

export class AIEnhancer {
  constructor(options = {}) {
    this.provider = options.provider || 'gemini';
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.model = options.model || (this.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');
    this.endpoint = options.endpoint || 'http://localhost:11434';
  }

  async enhanceSteps(steps, docTitle = 'SOP Sistem') {
    if (!this.apiKey && this.provider !== 'ollama') {
      console.log('\x1b[33m[FlowSnap AI]\x1b[0m Tidak ada API key. Menggunakan heurisitc natural language generator...');
      return this.fallbackHeuristic(steps);
    }

    console.log(`\x1b[36m[FlowSnap AI]\x1b[0m Memproses ${steps.length} langkah dengan model ${this.model} (${this.provider})...`);
    const prompt = this.buildPrompt(steps, docTitle);

    try {
      let aiText = '';
      if (this.provider === 'gemini') {
        aiText = await this.callGemini(prompt);
      } else if (this.provider === 'openai') {
        aiText = await this.callOpenAI(prompt);
      } else if (this.provider === 'ollama') {
        aiText = await this.callOllama(prompt);
      }

      const parsed = this.parseAIResponse(aiText);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return steps.map((s, idx) => {
          const aiItem = parsed.find(p => p.step === s.step) || parsed[idx] || {};
          return {
            ...s,
            aiTitle: aiItem.title || s.label,
            aiDescription: aiItem.description || `Klik pada elemen "${s.label}"`,
            aiValidation: aiItem.validation || 'Pastikan halaman termuat dengan benar.'
          };
        });
      }
    } catch (err) {
      console.warn(`\x1b[31m[FlowSnap AI Error]\x1b[0m ${err.message}. Menggunakan fallback generator.`);
    }

    return this.fallbackHeuristic(steps);
  }

  buildPrompt(steps, docTitle) {
    const rawSteps = steps.map(s => ({
      step: s.step,
      type: s.type,
      label: s.label,
      tag: s.tag,
      url: s.url
    }));

    return `Kamu adalah Technical Documentation Expert & Systems Analyst tingkat enterprise.
Tugasmu adalah mengubah jejak klik dan input user (${docTitle}) menjadi SOP teknis profesional berbahasa Indonesia yang jelas, ringkas, dan bebas basa-basi klise.

Daftar Aksi Mentah:
${JSON.stringify(rawSteps, null, 2)}

Format respon WAJIB berupa JSON array valid tanpa markdown formatting tambahan di luar JSON:
[
  {
    "step": 1,
    "title": "Judul Langkah yang Kontekstual & Lugas (contoh: Masuk ke Pengaturan Models)",
    "description": "Instruksi tindakan operasional dalam kalimat aktif profesional yang memandu pelaksana.",
    "validation": "Kondisi hasil yang harus terverifikasi setelah tindakan selesai."
  }
]`;
  }

  async callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async callOpenAI(prompt) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async callOllama(prompt) {
    const url = `${this.endpoint}/api/generate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.response || '';
  }

  parseAIResponse(text) {
    try {
      const clean = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const data = JSON.parse(clean);
      return Array.isArray(data) ? data : (data.steps || data.sop || []);
    } catch {
      return null;
    }
  }

  fallbackHeuristic(steps) {
    return steps.map((s) => {
      let title = `Langkah ${s.step}: Akses "${s.label}"`;
      let desc = `Klik elemen \`<${s.tag}>\` dengan label **"${s.label}"**.`;
      let val = 'Pastikan tampilan layar berubah sesuai tindakan.';

      if (s.label.toLowerCase().includes('new') || s.label.toLowerCase().includes('create')) {
        title = `Langkah ${s.step}: Buat Record Baru (${s.label})`;
        desc = `Pilih tombol **"${s.label}"** untuk membuka formulir pembuatan data baru.`;
        val = 'Formulir isian kosong berhasil dibuka.';
      } else if (s.label.toLowerCase().includes('save') || s.label.toLowerCase().includes('simpan')) {
        title = `Langkah ${s.step}: Simpan Data`;
        desc = `Klik tombol **"${s.label}"** untuk menyimpan parameter ke basis data.`;
        val = 'Data tersimpan tanpa notifikasi kesalahan.';
      } else if (s.type === 'submit_input') {
        title = `Langkah ${s.step}: Pengisian Data Field`;
        desc = `Ketik nilai pada bidang **"${s.label}"** lalu tekan Enter.`;
        val = 'Nilai field terisi dan tersimpan.';
      }

      return {
        ...s,
        aiTitle: title,
        aiDescription: desc,
        aiValidation: val
      };
    });
  }
}
