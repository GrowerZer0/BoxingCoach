// app/components/Settings.tsx
'use client';

import React, { useState } from 'react';
import { useSettings, RoundConfig } from '@/contexts/SettingsContext';
import { useAudio } from '@/hooks/useAudio';
import { INTENSITY_PRESETS, ALL_MOVES, isDefensiveMove, generateFightScenario } from '@/types/workout';

export default function Settings() {
  const { settings, updateSettings, updateRoundConfig, addRoundConfig, removeRoundConfig } = useSettings();
  const audio = useAudio();
  const [activeTab, setActiveTab] = useState<'general' | 'rounds'>('general');
  const [selectedIntensity, setSelectedIntensity] = useState(settings.intensityId || 'moderate');

  const handleIntensitySelect = (intensityId: string) => {
    audio.hapticFeedback(10);
    setSelectedIntensity(intensityId);
    updateSettings({ intensityId });
  };

  const handleAddRound = () => {
    audio.hapticFeedback(10);
    const newRoundNumber = settings.roundConfigs.length + 1;
    // Create a fight scenario for the new round
    const scenario = generateFightScenario(newRoundNumber, selectedIntensity);
    addRoundConfig({
      roundNumber: newRoundNumber,
      name: `Round ${newRoundNumber}`,
      combos: scenario,
    });
  };

  const handleRemoveRound = (roundNumber: number) => {
    audio.hapticFeedback([20, 30]);
    if (settings.roundConfigs.length <= 1) {
      alert('You must have at least one round');
      return;
    }
    removeRoundConfig(roundNumber);
  };

  const toggleMove = (roundNumber: number, move: string) => {
    audio.hapticFeedback(5);
    const config = settings.roundConfigs.find(rc => rc.roundNumber === roundNumber);
    if (!config) return;

    const newCombos = config.combos.includes(move)
      ? config.combos.filter(c => c !== move)
      : [...config.combos, move];

    updateRoundConfig(roundNumber, { combos: newCombos });
  };

  // Generate a fight scenario for a round
  const generateScenario = (roundNumber: number) => {
    audio.hapticFeedback([10, 20]);
    const scenario = generateFightScenario(roundNumber, selectedIntensity);
    updateRoundConfig(roundNumber, { combos: scenario });
  };

  // Clear all combos for a round
  const clearCombos = (roundNumber: number) => {
    audio.hapticFeedback([20, 30]);
    updateRoundConfig(roundNumber, { combos: [] });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 overflow-x-auto">
        <button
          onClick={() => {
            audio.hapticFeedback(5);
            setActiveTab('general');
          }}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'general'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          General
        </button>
        <button
          onClick={() => {
            audio.hapticFeedback(5);
            setActiveTab('rounds');
          }}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'rounds'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Round Settings
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Round Duration (seconds)
            </label>
            <input
              type="number"
              min="30"
              max="600"
              value={settings.roundDuration}
              onChange={(e) => {
                audio.hapticFeedback(5);
                updateSettings({ roundDuration: Number(e.target.value) });
              }}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Rest Duration (seconds)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={settings.restDuration}
              onChange={(e) => {
                audio.hapticFeedback(5);
                updateSettings({ restDuration: Number(e.target.value) });
              }}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Number of Rounds
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.rounds}
              onChange={(e) => {
                audio.hapticFeedback(5);
                updateSettings({ rounds: Number(e.target.value) });
              }}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Intensity Selection */}
          <div className="mt-4">
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Intensity Level
  </label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {Object.values(INTENSITY_PRESETS).map((preset) => (
  <button
    key={preset.id}
    onClick={() => handleIntensitySelect(preset.id)}
    className={`p-4 rounded-lg border-2 transition-all text-left ${
      selectedIntensity === preset.id
        ? 'border-blue-500 bg-blue-500/10'
        : 'border-gray-700 bg-gray-800 hover:border-gray-500'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className="text-3xl">{preset.icon}</span>
      <div>
        <h4 className="font-semibold text-white">{preset.name}</h4>
        <p className="text-xs text-gray-400">{preset.description}</p>
        <div className="flex gap-3 mt-1 text-xs text-gray-500">
          <span>⏱️ {preset.minDelay}-{preset.maxDelay}s</span>
          <span>🥊 ~{preset.punchesPerRound} punches</span>
          <span>🛡️ {Math.round(preset.defensiveChance * 100)}% defense</span>
        </div>
      </div>
    </div>
    {selectedIntensity === preset.id && (
      <div className="mt-2 text-blue-400 text-sm">✓ Selected</div>
    )}
  </button>
))}
  </div>
</div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableAudio"
              checked={settings.enableAudio}
              onChange={(e) => {
                audio.hapticFeedback(5);
                updateSettings({ enableAudio: e.target.checked });
              }}
              className="mr-2 w-4 h-4 accent-blue-500"
            />
            <label htmlFor="enableAudio" className="text-gray-300">
              Enable Audio Cues
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableVoice"
              checked={settings.enableVoice}
              onChange={(e) => {
                audio.hapticFeedback(5);
                updateSettings({ enableVoice: e.target.checked });
              }}
              className="mr-2 w-4 h-4 accent-blue-500"
            />
            <label htmlFor="enableVoice" className="text-gray-300">
              Enable Voice Announcements
            </label>
          </div>
        </div>
      )}

      {/* Round Settings - Now includes all moves */}
      {activeTab === 'rounds' && (
        <div className="space-y-6">
          {settings.roundConfigs.map((config) => {
            // Separate offensive and defensive moves for display
            const offensiveMoves = config.combos.filter(m => !isDefensiveMove(m));
            const defensiveMoves = config.combos.filter(m => isDefensiveMove(m));
            
            return (
              <div key={config.roundNumber} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {config.name}
                      </h3>
                      <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">
                        Round {config.roundNumber}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-green-400">🥊 {offensiveMoves.length} offensive</span>
                      <span className="text-xs text-blue-400">🛡️ {defensiveMoves.length} defensive</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateScenario(config.roundNumber)}
                      className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                      title="Generate intelligent fight scenario"
                    >
                      🧠 Generate
                    </button>
                    <button
                      onClick={() => clearCombos(config.roundNumber)}
                      className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handleRemoveRound(config.roundNumber)}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Round Name
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => {
                      audio.hapticFeedback(5);
                      updateRoundConfig(config.roundNumber, { name: e.target.value });
                    }}
                    className="w-full px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>

                {/* Move Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Moves (Offensive & Defensive)
                  </label>
                  
                  {/* Offensive Moves */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <span>🥊 Offensive</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-600">Click to toggle</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_MOVES.offensive.map((move) => (
                        <button
                          key={move}
                          onClick={() => toggleMove(config.roundNumber, move)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            config.combos.includes(move)
                              ? 'bg-green-600 text-white scale-100'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:scale-105'
                          }`}
                        >
                          {move}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Defensive Moves */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <span>🛡️ Defensive</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-600">Click to toggle</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_MOVES.defensive.map((move) => (
                        <button
                          key={move}
                          onClick={() => toggleMove(config.roundNumber, move)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            config.combos.includes(move)
                              ? 'bg-blue-600 text-white scale-100'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:scale-105'
                          }`}
                        >
                          {move}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Current Combo Display */}
                {config.combos.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-900 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Current Sequence:</div>
                    <div className="flex flex-wrap gap-2">
                      {config.combos.map((move, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            isDefensiveMove(move)
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}
                        >
                          {move}
                          {index < config.combos.length - 1 && (
                            <span className="text-gray-600 mx-1">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddRound}
            className="w-full py-3 text-center border-2 border-dashed border-gray-600 text-gray-400 rounded-lg hover:border-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-all active:scale-95"
          >
            + Add Round
          </button>

          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">💡 How it works:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• <span className="text-green-400">Green</span> = Offensive moves (punches)</li>
              <li>• <span className="text-blue-400">Blue</span> = Defensive moves (slips, rolls, blocks)</li>
              <li>• Click any move to add/remove it from the round</li>
              <li>• Use <span className="text-purple-400">Generate</span> for an intelligent fight scenario</li>
              <li>• The timer will randomly call out moves from your selected list</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}