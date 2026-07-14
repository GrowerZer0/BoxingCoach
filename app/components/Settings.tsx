'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export default function Settings() {
  const {
    roundLength,
    setRoundLength,
    restLength,
    setRestLength,
    intensity,
    setIntensity,
    minDelay,
    setMinDelay,
    maxDelay,
    setMaxDelay,
    selectedVoiceName,
    setSelectedVoiceName,
    genderFilter,
    setGenderFilter,
    callouts,
    toggleCallout,
  } = useSettings();

  // --- Voice loading ---
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    let retries = 0;
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length === 0 && retries < 5) {
        retries++;
        setTimeout(loadVoices, 500);
        return;
      }
      let enVoices = allVoices.filter(v => v.lang.startsWith('en'));
      // Apply gender filter (re‑use the same filter logic)
      if (genderFilter === 'male') {
        enVoices = enVoices.filter(v => /male|david|daniel|mark|paul|george|andrew/i.test(v.name));
      } else if (genderFilter === 'female') {
        enVoices = enVoices.filter(v => /female|samantha|zira|susan|kate|emma|julie|alice/i.test(v.name));
      }
      setVoices(enVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [genderFilter]);

  // --- UI ---
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">⚙️ Settings</h2>
      <div className="space-y-6">
        {/* Round length */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Round Length (seconds)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="10"
              max="300"
              step="5"
              value={roundLength}
              onChange={(e) => setRoundLength(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-gray-300 w-12">{roundLength}s</span>
          </div>
        </div>

        {/* Rest length */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Rest Length (seconds)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={restLength}
              onChange={(e) => setRestLength(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-gray-300 w-12">{restLength}s</span>
          </div>
        </div>

        {/* Intensity */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Intensity</label>
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded ${intensity === 'pressure' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700'}`}
              onClick={() => setIntensity('pressure')}
            >
              ⚡ Pressure
            </button>
            <button
              className={`px-4 py-2 rounded ${intensity === 'counter' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700'}`}
              onClick={() => setIntensity('counter')}
            >
              🛡 Counter
            </button>
          </div>
        </div>

        {/* Cadence delays */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Min Delay (ms) – {minDelay}</label>
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={minDelay}
            onChange={(e) => setMinDelay(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Max Delay (ms) – {maxDelay}</label>
          <input
            type="range"
            min="1000"
            max="8000"
            step="100"
            value={maxDelay}
            onChange={(e) => setMaxDelay(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Voice selection – dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Voice</label>
          <select
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={selectedVoiceName || ''}
            onChange={(e) => setSelectedVoiceName(e.target.value)}
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Select a voice from your system.</p>
        </div>

        {/* Gender filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Gender Filter</label>
          <div className="flex gap-2">
            {['all', 'male', 'female'].map((g) => (
              <button
                key={g}
                className={`px-3 py-1 rounded ${genderFilter === g ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700'}`}
                onClick={() => setGenderFilter(g as any)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Callout toggles */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Callout Types</h3>
          <div className="grid grid-cols-2 gap-2">
            {callouts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={c.enabled}
                  onChange={() => toggleCallout(c.id)}
                  className="w-4 h-4 accent-yellow-500"
                />
                <span className={c.enabled ? 'text-white' : 'text-gray-500'}>
                  {c.label} <span className="text-xs text-gray-400">({c.category})</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Optional Save button – settings auto‑save, but gives feedback */}
        <button
          onClick={() => {
            // Settings are already saved via context useEffect, but we can show a toast.
            alert('Settings saved!');
          }}
          className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded"
        >
          💾 Save Settings
        </button>
      </div>
    </div>
  );
}