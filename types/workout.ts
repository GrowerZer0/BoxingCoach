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
    name: 'Bag Pressure',
    description: 'Fight-paced bag work with quick resets and frequent callouts',
    icon: 'F',
    minDelay: 1.5,
    maxDelay: 3.5,
    punchesPerRound: 150,
    comboComplexity: 'complex',
    defensiveChance: 0.15,
  },
  counter: {
    id: 'counter',
    name: 'Technical Pace',
    description: 'Realistic solo rounds with room to move, defend, and reset',
    icon: 'C',
    minDelay: 3.5,
    maxDelay: 7,
    punchesPerRound: 90,
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
  'Step Out',
  'Reset Stance',
  'Sprawl',
  'Frame on Bag',
  'Circle Off Bag',
];

export const CLINCH_MOVES = [
  'Bag Clinch',
  'Forehead Pressure',
  'Frame and Knee',
  'Short Knees',
  'Shoulder Pressure',
  'Circle Off Clinch',
  'Post and Exit',
  'Dirty Boxing',
];

export const TAKEDOWN_MOVES = [
  'Level Change',
  'Penetration Step',
  'Single Leg Shadow',
  'Double Leg Shadow',
  'Shot to Bag',
  'Sprawl to Bag',
  'Snap Down on Bag',
  'Lift and Turn Bag',
  'Drive Through Bag',
];

export const GROUND_MOVES = [
  'Technical Stand Up',
  'Hip Escape',
  'Bridge and Shrimp',
  'Sit Out',
  'Bag Mount',
  'Bag Side Control',
  'Knee on Bag',
  'Top Pressure Hold',
  'Posture and Punch',
  'Elbows on Bag',
  'Stand Over Bag',
  'Sprawl Spin',
  'Shin Ride Switch',
  'Get Up and Strike',
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
  clinch: 'Bag Clinch',
  takedown: 'Shot Entries',
  ground: 'Duffel Ground Work',
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
  moderate: ['1-2-3', '3-2', '1-3-2', '2-3-2', 'Slip Left-2', 'Shot to Bag', 'Hip Escape'],
  complex: ['1-2-3-2', '1-2-5-2', 'Slip Right-2-3', 'Sprawl-2-3', 'Dirty Boxing', 'Posture and Punch'],
};

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'solo-mma-foundations',
    name: 'Solo MMA Foundations',
    focus: 'Heavy bag striking, defensive movement, shot entries, and duffel get-ups',
    rounds: 5,
    roundDuration: 180,
    restDuration: 60,
    intensityId: 'counter',
    roundConfigs: [
      { roundNumber: 1, name: 'Bag Boxing Rhythm', combos: ['1', '1-2', '1-2-3', 'Slip Right-2', 'Pivot Left'] },
      { roundNumber: 2, name: 'Defense to Counter', combos: ['Slip Left-2', 'Roll Right-3', 'High Guard', 'Circle Off Bag', '2-3-2'] },
      { roundNumber: 3, name: 'Shot Awareness', combos: ['1-2-Sprawl', 'Level Change', 'Shot to Bag', 'Sprawl-2', 'Frame on Bag'] },
      { roundNumber: 4, name: 'Duffel Ground Movement', combos: ['Hip Escape', 'Bridge and Shrimp', 'Technical Stand Up', 'Bag Side Control', 'Bag Mount'] },
      { roundNumber: 5, name: 'Solo Fight Round', combos: ['1-2-3', 'Sprawl to Bag', 'Frame and Knee', 'Posture and Punch', 'Get Up and Strike'] },
    ],
  },
  {
    id: 'bag-pressure-mma',
    name: 'Bag Pressure MMA',
    focus: 'Fast heavy bag bursts, clinch pressure, sprawls, and top-control conditioning',
    rounds: 5,
    roundDuration: 180,
    restDuration: 45,
    intensityId: 'pressure',
    roundConfigs: [
      { roundNumber: 1, name: 'Pressure Boxing', combos: ['1-1-2', '1-2-3-2', '3-2-3', 'Check Hook-2', 'Pivot Right-2'] },
      { roundNumber: 2, name: 'Pocket Defense', combos: ['Roll Left-3-2', 'Roll Right-2-3', 'High Guard-3-2', 'Body Block-2-3', 'Parry Jab-2'] },
      { roundNumber: 3, name: 'Bag Clinch', combos: ['1-2-Bag Clinch', 'Short Knees', 'Dirty Boxing', 'Frame and Knee', 'Post and Exit-2'] },
      { roundNumber: 4, name: 'Sprawl and Shot Entries', combos: ['Shot to Bag', 'Sprawl to Bag', 'Snap Down on Bag', 'Drive Through Bag', 'Sprawl-2-3'] },
      { roundNumber: 5, name: 'Top Pressure', combos: ['Bag Mount', 'Knee on Bag', 'Posture and Punch', 'Elbows on Bag', 'Get Up and Strike'] },
    ],
  },
  {
    id: 'duffel-ground-conditioning',
    name: 'Duffel Ground Conditioning',
    focus: 'Limited solo ground work: movement, pressure, posture, and stand-ups',
    rounds: 4,
    roundDuration: 150,
    restDuration: 45,
    intensityId: 'counter',
    roundConfigs: [
      { roundNumber: 1, name: 'Base and Get-Ups', combos: ['Technical Stand Up', 'Hip Escape', 'Sit Out', 'Stand Over Bag'] },
      { roundNumber: 2, name: 'Bottom Movement', combos: ['Hip Escape', 'Bridge and Shrimp', 'Sit Out', 'Get Up and Strike'] },
      { roundNumber: 3, name: 'Top Pressure', combos: ['Bag Side Control', 'Bag Mount', 'Knee on Bag', 'Top Pressure Hold', 'Posture and Punch'] },
      { roundNumber: 4, name: 'Scramble Round', combos: ['Sprawl Spin', 'Technical Stand Up', 'Shot to Bag', 'Sprawl-2', 'Get Up and Strike'] },
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
  return Math.random() * (max - min) + min;
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
