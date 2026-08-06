'use client';

import React, { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAudio } from '@/hooks/useAudio';
import { ROUTINE_TEMPLATES, RoutineTemplate } from '@/types/workout';

interface WorkoutSetupProps {
  onSelectWorkout: (name: string) => void;
}

export default function WorkoutSetup({ onSelectWorkout }: WorkoutSetupProps) {
  const { settings, updateSettings, saveCustomRoutine, deleteCustomRoutine } = useSettings();
  const audio = useAudio();
  const [customName, setCustomName] = useState('');
  const [customFocus, setCustomFocus] = useState('');

  const startEmptyWorkout = async () => {
    audio.hapticFeedback(10);
    onSelectWorkout('Empty MMA Session');
  };

  const startRoutine = async (routine: RoutineTemplate) => {
    audio.hapticFeedback([10, 20]);
    await updateSettings({
      rounds: routine.rounds,
      roundDuration: routine.roundDuration,
      restDuration: routine.restDuration,
      intensityId: routine.intensityId,
      roundConfigs: routine.roundConfigs,
    });
    onSelectWorkout(routine.name);
  };

  const handleSaveCustomRoutine = async () => {
    audio.hapticFeedback(10);
    try {
      const routine = await saveCustomRoutine(customName, customFocus);
      setCustomName('');
      setCustomFocus('');
      onSelectWorkout(routine.name);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not save workout');
    }
  };

  const handleDeleteCustomRoutine = async (event: React.MouseEvent, routineId: string) => {
    event.stopPropagation();
    audio.hapticFeedback([20, 30]);
    if (!confirm('Delete this custom workout?')) return;
    await deleteCustomRoutine(routineId);
  };

  const customRoutines = settings.customRoutines || [];

  return (
    <main className="max-w-5xl mx-auto p-4 pb-24">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-yellow-400">Train</p>
        <h2 className="text-3xl font-bold text-white mt-1">Choose today&apos;s session</h2>
        <p className="text-gray-400 mt-2">
          Start from your current settings or load an MMA routine with rounds, rest, and callouts already staged.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <button
            onClick={startEmptyWorkout}
            className="w-full rounded-lg border border-green-500/50 bg-green-500/10 p-5 text-left transition-all hover:bg-green-500/20 active:scale-[0.99]"
          >
            <div className="text-sm font-semibold uppercase tracking-wide text-green-300">Quick Start</div>
            <div className="mt-2 text-2xl font-bold text-white">Start Empty Workout</div>
            <div className="mt-3 text-sm text-gray-300">
              Uses your current setup: {settings.rounds} rounds, {settings.roundDuration}s work, {settings.restDuration}s rest.
            </div>
          </button>

          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="text-sm font-semibold uppercase tracking-wide text-yellow-400">Save Current Setup</div>
            <div className="mt-2 text-lg font-bold text-white">Custom Workout</div>
            <input
              type="text"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="Workout name"
              className="mt-3 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
            />
            <input
              type="text"
              value={customFocus}
              onChange={(event) => setCustomFocus(event.target.value)}
              placeholder="Focus, optional"
              className="mt-2 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
            />
            <button
              onClick={handleSaveCustomRoutine}
              className="mt-3 w-full rounded bg-yellow-500 px-3 py-2 text-sm font-bold text-gray-950 transition-colors hover:bg-yellow-400 active:scale-[0.99]"
            >
              Save and Start
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {customRoutines.length > 0 && (
            <div className="grid gap-3">
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Custom Workouts</div>
              {customRoutines.map((routine) => (
                <button
                  key={routine.id}
                  onClick={() => startRoutine(routine)}
                  className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-left transition-all hover:border-yellow-500/80 hover:bg-yellow-500/20 active:scale-[0.99]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xl font-bold text-white">{routine.name}</div>
                      <div className="mt-1 text-sm text-gray-300">{routine.focus}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-gray-300">
                      <span className="rounded bg-gray-900 px-2 py-1">{routine.rounds} rounds</span>
                      <span className="rounded bg-gray-900 px-2 py-1">{routine.roundDuration}s</span>
                      <button
                        onClick={(event) => handleDeleteCustomRoutine(event, routine.id)}
                        className="rounded bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {routine.roundConfigs.slice(0, 3).map((round) => (
                      <span key={round.roundNumber} className="rounded-full bg-gray-900 px-3 py-1 text-xs text-gray-300">
                        {round.name}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Built-In Workouts</div>
          {ROUTINE_TEMPLATES.map((routine) => (
            <button
              key={routine.id}
              onClick={() => startRoutine(routine)}
              className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-left transition-all hover:border-yellow-500/70 hover:bg-gray-700 active:scale-[0.99]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xl font-bold text-white">{routine.name}</div>
                  <div className="mt-1 text-sm text-gray-400">{routine.focus}</div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 text-xs text-gray-300">
                  <span className="rounded bg-gray-700 px-2 py-1">{routine.rounds} rounds</span>
                  <span className="rounded bg-gray-700 px-2 py-1">{routine.roundDuration}s</span>
                  <span className="rounded bg-gray-700 px-2 py-1">{routine.restDuration}s rest</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {routine.roundConfigs.slice(0, 3).map((round) => (
                  <span key={round.roundNumber} className="rounded-full bg-gray-900 px-3 py-1 text-xs text-gray-300">
                    {round.name}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
