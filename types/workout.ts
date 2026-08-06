// types/workout.ts

export type MoveCategory = 'striking' | 'defense' | 'clinch' | 'takedown' | 'ground';

export interface IntensityPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  minDelay: number;
  maxDelay: number;
  punchesPerRound: number;
  comboComplexity: 'simple' | 'moderate' | 'complex';
  defensiveChance: number;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  focus: string;
  rounds: number;
  roundDuration: number;
  restDuration: number;
  intensityId: string;
  roundConfigs: {
    roundNumber: number;
    name: string;
    combos: string[];
    duration?: number;
  }[];
}

export const INTENSITY_PRESETS: Record<string, IntensityPreset> = {
  pressure: {
    id: 'pressure',
    name: 'Pressure Fighting',
    description: 'High pace, aggressive, constant pressure',
    icon: 'F',
    minDelay: 2,
    maxDelay: 6,
    punchesPerRound: 120,
    comboComplexity: 'complex',
    defensiveChance: 0.15,
  },
  counter: {
    id: 'counter',
    name: 'Counter Fighting',
    description: 'Patient, tactical, wait for opportunities',
    icon: 'C',
    minDelay: 6,
    maxDelay: 12,
    punchesPerRound: 60,
    comboComplexity: 'moderate',
    defensiveChance: 0.35,
  },
};

export const PUNCH_NAMES: Record<string, string> = {
  '1': 'Jab',
  '2': 'Cross',
  '3': 'Lead Hook',
  '4': 'Rear Hook',
  '5': 'Lead Uppercut',
  '6': 'Rear Uppercut',
  '7': 'Lead Body Hook',
  '8': 'Rear Body Hook',
};

export const NUMBER_WORDS: Record<string, string> = {
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
};

export const DEFENSIVE_MOVES = [
  'Slip Right',
  'Slip Left',
  'Roll Right',
  'Roll Left',
  'High Guard',
  'Body Block',
  'Parry Jab',
  'Parry Cross',
  'Check Hook',
  'Pivot Right',
  'Pivot Left',
  'Sprawl',
  'Frame and Circle',
];

export const CLINCH_MOVES = [
  'Collar Tie',
  'Double Collar Tie',
  'Underhook',
  'Overhook',
  'Pummel',
  'Frame Off',
  'Knee Entry',
  'Wall Walk',
];

export const TAKEDOWN_MOVES = [
  'Level Change',
  'Single Leg Entry',
  'Double Leg Entry',
  'Body Lock',
  'Outside Trip',
  'Inside Trip',
  'Snap Down',
  'Mat Return',
];

export const GROUND_MOVES = [
  'Technical Stand Up',
  'Hip Escape',
  'Bridge and Shrimp',
  'Granby Roll',
  'Guard Retention',
  'Closed Guard Break',
  'Knee Slice Pass',
  'Half Guard Pass',
  'Mount Escape',
  'Back Escape',
  'Ground and Pound Posture',
  'Armbar Drill',
  'Triangle Setup',
  'Rear Naked Choke Finish',
];

export const ALL_MOVES: Record<MoveCategory, string[]> = {
  striking: ['1', '2', '3', '4', '5', '6', '7', '8'],
  defense: DEFENSIVE_MOVES,
  clinch: CLINCH_MOVES,
  takedown: TAKEDOWN_MOVES,
  ground: GROUND_MOVES,
};

export const MOVE_CATEGORY_LABELS: Record<MoveCategory, string> = {
  striking: 'Striking',
  defense: 'Defense',
  clinch: 'Clinch',
  takedown: 'Takedowns',
  ground: 'Ground Work',
};

export const MOVE_CATEGORY_COLORS: Record<MoveCategory, { active: string; idle: string; panel: string; text: string }> = {
  striking: {
    active: 'bg-green-600 text-white',
    idle: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
    panel: 'bg-yellow-500/20 border border-yellow-500/50',
    text: 'text-yellow-300',
  },
  defense: {
    active: 'bg-blue-600 text-white',
    idle: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
    panel: 'bg-blue-500/20 border border-blue-500/50',
    text: 'text-blue-300',
  },
  clinch: {
    active: 'bg-cyan-700 text-white',
    idle: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
    panel: 'bg-cyan-500/20 border border-cyan-500/50',
    text: 'text-cyan-300',
  },
  takedown: {
    active: 'bg-orange-600 text-white',
    idle: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
    panel: 'bg-orange-500/20 border border-orange-500/50',
    text: 'text-orange-300',
  },
  ground: {
    active: 'bg-purple-600 text-white',
    idle: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
    panel: 'bg-purple-500/20 border border-purple-500/50',
    text: 'text-purple-300',
  },
};

const DEFAULT_COMBOS: Record<IntensityPreset['comboComplexity'], string[]> = {
  simple: ['1', '2', '1-2', '1-1-2', 'Slip Right', 'Sprawl', 'Technical Stand Up'],
  moderate: ['1-2-3', '3-2', '1-3-2', '2-3-2', 'Slip Left', 'Level Change', 'Hip Escape'],
  complex: ['1-2-3-2', '1-2-5-2', 'Slip Right-2-3', 'Sprawl-2-3', 'Double Leg Entry', 'Knee Slice Pass'],
};

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'mma-foundations',
    name: 'MMA Foundations',
    focus: 'Boxing, defense, takedown reactions, and get-ups',
    rounds: 5,
    roundDuration: 180,
    restDuration: 60,
    intensityId: 'counter',
    roundConfigs: [
      { roundNumber: 1, name: 'Boxing Rhythm', combos: ['1', '1-2', '1-2-3', 'Slip Right', 'Pivot Left'] },
      { roundNumber: 2, name: 'Defense to Counter', combos: ['Slip Left-2', 'Roll Right-3', 'High Guard', 'Frame and Circle', '2-3-2'] },
      { roundNumber: 3, name: 'Takedown Awareness', combos: ['1-2-Sprawl', 'Level Change', 'Single Leg Entry', 'Sprawl-2', 'Frame and Circle'] },
      { roundNumber: 4, name: 'Ground Movement', combos: ['Hip Escape', 'Bridge and Shrimp', 'Technical Stand Up', 'Guard Retention', 'Mount Escape'] },
      { roundNumber: 5, name: 'Mixed Fight Round', combos: ['1-2-3', 'Sprawl', 'Knee Entry', 'Double Leg Entry', 'Ground and Pound Posture', 'Technical Stand Up'] },
    ],
  },
  {
    id: 'pressure-mma',
    name: 'Pressure MMA',
    focus: 'Forward pressure, clinch entries, trips, and top control',
    rounds: 5,
    roundDuration: 180,
    restDuration: 45,
    intensityId: 'pressure',
    roundConfigs: [
      { roundNumber: 1, name: 'Pressure Boxing', combos: ['1-1-2', '1-2-3-2', '3-2-3', 'Check Hook', 'Pivot Right'] },
      { roundNumber: 2, name: 'Pocket Defense', combos: ['Roll Left-3-2', 'Roll Right-2-3', 'High Guard', 'Body Block', 'Parry Jab-2'] },
      { roundNumber: 3, name: 'Clinch Entries', combos: ['1-2-Collar Tie', 'Knee Entry', 'Pummel', 'Underhook', 'Frame Off'] },
      { roundNumber: 4, name: 'Trips and Returns', combos: ['Body Lock', 'Outside Trip', 'Inside Trip', 'Mat Return', 'Snap Down'] },
      { roundNumber: 5, name: 'Top Game', combos: ['Closed Guard Break', 'Knee Slice Pass', 'Half Guard Pass', 'Ground and Pound Posture', 'Back Escape'] },
    ],
  },
  {
    id: 'ground-recovery',
    name: 'Ground Recovery',
    focus: 'Defensive grappling, escapes, and return to striking',
    rounds: 4,
    roundDuration: 150,
    restDuration: 45,
    intensityId: 'counter',
    roundConfigs: [
      { roundNumber: 1, name: 'Base and Frames', combos: ['Frame and Circle', 'Sprawl', 'Wall Walk', 'Technical Stand Up'] },
      { roundNumber: 2, name: 'Bottom Escapes', combos: ['Hip Escape', 'Bridge and Shrimp', 'Mount Escape', 'Back Escape', 'Guard Retention'] },
      { roundNumber: 3, name: 'Guard and Pass', combos: ['Closed Guard Break', 'Knee Slice Pass', 'Half Guard Pass', 'Triangle Setup', 'Armbar Drill'] },
      { roundNumber: 4, name: 'Scramble Round', combos: ['Granby Roll', 'Technical Stand Up', 'Single Leg Entry', 'Sprawl-2', 'Ground and Pound Posture'] },
    ],
  },
];

export function getMoveCategory(move: string): MoveCategory {
  const parts = move.split('-').map(part => part.trim());
  const lastKnownPart = [...parts].reverse().find(part =>
    Object.values(ALL_MOVES).some(moves => moves.includes(part))
  );
  const valueToCheck = lastKnownPart || move;

  for (const [category, moves] of Object.entries(ALL_MOVES) as [MoveCategory, string[]][]) {
    if (moves.includes(valueToCheck)) {
      return category;
    }
  }

  return /^\d(?:-\d)*$/.test(move) ? 'striking' : 'ground';
}

export function isDefensiveMove(move: string): boolean {
  return getMoveCategory(move) === 'defense';
}

export function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatMoveForDisplay(move: string): string {
  return move
    .split('-')
    .map(part => part.trim())
    .map(part => (PUNCH_NAMES[part] ? part : part))
    .join(' - ');
}

export function formatMoveForSpeech(move: string): string {
  return move
    .split('-')
    .map(part => part.trim())
    .map(part => NUMBER_WORDS[part] || part)
    .join(', ');
}

export function getMoveLabel(move: string): string {
  return PUNCH_NAMES[move] ? `${move} (${PUNCH_NAMES[move]})` : move;
}

export function generateFightScenario(roundNumber: number, intensityId: string): string[] {
  const intensity = INTENSITY_PRESETS[intensityId] || INTENSITY_PRESETS.counter;
  const patternList = DEFAULT_COMBOS[intensity.comboComplexity] || DEFAULT_COMBOS.moderate;
  const offset = (roundNumber - 1) % patternList.length;
  const scenario = [
    patternList[offset],
    patternList[(offset + 1) % patternList.length],
    patternList[(offset + 2) % patternList.length],
  ];

  if (roundNumber % 2 === 0) {
    scenario.push('Sprawl', 'Technical Stand Up');
  } else {
    scenario.push('Slip Right', 'Hip Escape');
  }

  return Array.from(new Set(scenario));
}
