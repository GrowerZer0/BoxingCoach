import { WorkoutConfig } from '../types/workout';

export const PRESET_WORKOUTS: Record<string, WorkoutConfig> = {
  standing_bag: {
    id: 'standing_bag',
    name: 'Standing Heavy Bag',
    type: 'standing_bag',
    intensity: 'standard',
    rounds: 3,
    workDuration: 180, // 3 mins
    restDuration: 60,  // 1 min
    calloutGapMin: 2.0,
    calloutGapMax: 3.5,
    callouts: [
      // Basic combinations
      "1, 2",
      "1, 2, 3",
      "1, 2, 3, 2",
      "1, 1, 2",
      "1, 6, 3, 2",
      // Head / Body variations
      "1, 2, body",
      "1, body, 2, head",
      "3 body, 3 head, 2",
      // Defense & Counter
      "1, 2, slip, 2",
      "roll, 2, 3, 2",
      "1, 2, step back, 2",
      "slip right, 2, 3",
      "slip left, 5, 2",
      // Power / Activity
      "10 second speed burst",
      "power hooks, left and right",
      "circle left, 1, 2",
      "circle right, 1, 2"
    ]
  },
  ground_bag: {
    id: 'ground_bag',
    name: 'Ground Duffel Bag (G&P)',
    type: 'ground_bag',
    intensity: 'standard',
    rounds: 3,
    workDuration: 180,
    restDuration: 60,
    calloutGapMin: 2.0,
    calloutGapMax: 3.5,
    callouts: [
      // Positional Striking
      "Post and heavy hammerfists",
      "Mount, straight punches",
      "Mount, heavy elbows",
      "Side control, knees to body",
      "Knee on belly, 1, 2, head control",
      // Transitions & Control
      "Frame and push, re-engage",
      "Switch sides, side control",
      "Transition to mount",
      "Transition to knee on belly",
      "Trap arm, heavy punches",
      // Scrambles / Resets
      "Sprawl, heavy sprawl!",
      "Sprawl, spin to back, heavy punches",
      "Stand up, reset stance",
      "Stand up, 1, 2, shoot back down"
    ]
  }
};

export const INTENSITY_GAP_SETTINGS = {
  flow: { min: 3.5, max: 5.0 },
  standard: { min: 2.0, max: 3.5 },
  intense: { min: 1.0, max: 2.0 },
};