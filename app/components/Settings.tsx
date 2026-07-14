'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

// Voice filter – keep natural voices, exclude robotic ones
const isGoodVoice = (name: string): boolean => {
  const badPatterns = [
    'Albert', 'Bad News', 'Whisper', 'Trinoids', 'Robot', 'Rishi',
    'Tessa', 'Zarvox', 'Fred', 'Junior', 'Ava', 'Alva', 'Milena',
    'Veena', 'Xander', 'Lea', 'Nicky', 'Nora', 'Sofia', 'Sergio',
    'Raquel', 'Fiona', 'Serena', 'Ricardo', 'Moira', 'Rosa',
    'Enrique', 'Conchita', 'Diego', 'Isabela', 'Javier', 'Lucas',
    'Cellos', 'Trinoids', 'Whisper'
  ];
  return !badPatterns.some(p => name.includes(p));
};

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
      // Apply gender filter
      if (genderFilter === 'male') {
        enVoices = enVoices.filter(v => /male|david|daniel|mark|paul|george|andrew/i.test(v.name));
      } else if (genderFilter === 'female') {
        enVoices = enVoices.filter(v => /female|samantha|zira|susan|kate|emma|julie|alice/i.test(v.name));
      }
      // Apply "good voice" filter (same as Timer.tsx)
      enVoices = enVoices.filter(v => isGoodVoice(v.name));
      setVoices(enVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [genderFilter]);

  // --- Speak function (used for test voice) ---
  const speakTest = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = 'Hello, let\'s train!';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voice = voices.find(v => v.name === selectedVoiceName);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

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

        {/* Voice selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Voice</label>
          <div className="flex gap-2">
            <select
              className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
              value={selectedVoiceName || ''}
              onChange={(e) => setSelectedVoiceName(e.target.value)}
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <button
              onClick={speakTest}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
            >
              🔊 Test
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Select a natural‑sounding voice.</p>
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

        {/* Save button (auto‑saves but gives feedback) */}
        <button
          onClick={() => alert('Settings saved!')}
          className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded"
        >
          💾 Save Settings
        </button>
      </div>
    </div>
  );
}