const fs = require('fs');
const path = require('path');

const dir = path.join('app', 'inventory', 'intake');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const pageCode = `'use client';

import { useState } from 'react';
import { Sparkles, ListChecks, Scan, Image, Cpu, Mic, CheckCircle2, ArrowRight, Camera, Wand2, Zap } from 'lucide-react';

export default function AutoIntakePage() {
  const [activeTab, setActiveTab] = useState<'express' | 'step'>('express');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vin: '1FTFW1E84MF12XXXX',
    year: 2021,
    make: 'Ford',
    model: 'F-150 XLT 3.5L V6',
    price: 34000,
    status: 'AVAILABLE',
  });

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'DEMO_MOTORS',
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        alert('Vehicle successfully published to Oracle DB!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err: any) {
      alert('Failed to publish vehicle: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans pb-20">
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-lg">
            <Zap className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-wide">
            AutoIntake <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">AI 2026</span>
          </span>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Sync
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('express')}
            className={\`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 \${activeTab === 'express' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}\`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> AI Express
          </button>
          <button
            onClick={() => setActiveTab('step')}
            className={\`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 \${activeTab === 'step' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}\`}
          >
            <ListChecks className="w-4 h-4" /> Guided Steps
          </button>
        </div>

        {activeTab === 'express' && (
          <section className="space-y-5">
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Step 1: Rapid Capture</h2>
                <span className="text-xs text-blue-400 font-mono">VIN Scanner Ready</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center h-28 bg-slate-700/50 hover:bg-slate-700 rounded-xl border-2 border-dashed border-blue-500/50 hover:border-blue-400 transition">
                  <Scan className="w-7 h-7 text-blue-400 mb-1" />
                  <span className="text-xs font-medium">Scan VIN / Door</span>
                </button>

                <button className="flex flex-col items-center justify-center h-28 bg-slate-700/50 hover:bg-slate-700 rounded-xl border-2 border-dashed border-purple-500/50 hover:border-purple-400 transition">
                  <Image className="w-7 h-7 text-purple-400 mb-1" />
                  <span className="text-xs font-medium">Upload / Snap Photos</span>
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-950/40 via-slate-800 to-slate-800 p-5 rounded-2xl border border-red-500/30 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-red-400" />
                  <h3 className="font-bold text-sm text-slate-200">Voice Intake Engine</h3>
                </div>
                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full font-medium">Say everything at once</span>
              </div>

              <p className="text-xs text-slate-400 mb-4 italic">
                &quot;2021 Ford F-150, 42,000 miles, clean title from Manheim auction, price target $34,000&quot;
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={\`w-14 h-14 text-white rounded-full flex items-center justify-center text-xl shadow-lg shrink-0 transition-all \${isRecording ? 'bg-red-500 animate-ping' : 'bg-red-600 hover:bg-red-500'}\`}
                >
                  <Mic className="w-6 h-6" />
                </button>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white block">{isRecording ? 'Listening...' : 'Tap & Speak details'}</span>
                  <span>AI auto-detects Specs, Mileage, Price & Notes</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs border-b border-slate-700/60 pb-2">
                <span className="text-slate-400 font-medium">Extracted Vehicle Data</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Synced
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-700/30">
                  <span className="text-slate-400">VIN:</span>
                  <span className="font-mono text-blue-300">{formData.vin}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/30">
                  <span className="text-slate-400">Vehicle Specs:</span>
                  <span className="font-semibold text-slate-200">{formData.year} {formData.make} {formData.model}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/30">
                  <span className="text-slate-400">Carfax / Last Mileage:</span>
                  <span className="text-amber-400 font-semibold">41,850 mi <span className="text-[10px] text-slate-400">(Auction 08/2026)</span></span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Target Price:</span>
                  <span className="text-emerald-400 font-semibold">\${formData.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePublish}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-blue-600/30 hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Publish to Inventory Instant'} <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        )}

        {activeTab === 'step' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
              <span className="text-blue-400">Step 1 of 4: Identification</span>
              <span>25% Completed</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-1/4"></div>
            </div>

            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">VIN / Barcode</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 font-mono text-slate-100 pr-20"
                  />
                  <button className="absolute right-2 top-2 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-blue-400 rounded-lg text-xs flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Scan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Price ($)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                  <button className="px-3 bg-slate-700 hover:bg-slate-600 text-amber-400 rounded-xl text-xs flex items-center gap-1 shrink-0 font-medium">
                    <Wand2 className="w-3.5 h-3.5" /> Auto-Fetch
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 border border-slate-700">
                Back
              </button>
              <button onClick={handlePublish} className="w-1/2 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-white">
                Save & Proceed
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
`;

fs.writeFileSync(path.join(dir, 'page.tsx'), pageCode);
console.log('Successfully written app/inventory/intake/page.tsx');
`;