export type WorkoutType = 'standing_bag' | 'ground_bag' | 'custom';
export type IntensityLevel = 'flow' | 'standard' | 'intense' | 'counter' | (string & {});
export type MoveCategory = 'punch' | 'defense' | 'movement' | 'ground' | 'transition' | 'striking' | 'clinch' | 'takedown';

export interface Callout {
  id: string;
  text: string;
  category: MoveCategory;
}

export interface RoundConfig {
  roundNumber: number;
  name: string;
  combos: string[];
  duration?: number;
  round?: number;
  title?: string;
  focus?: string;
}

export interface WorkoutConfig {
  id: string;
  name: string;
  type: WorkoutType;
  intensity: IntensityLevel;
  intensityId?: string;
  rounds: number;
  workDuration: number;
  restDuration: number;
  calloutGapMin: number;
  calloutGapMax: number;
  callouts: string[];
}

export interface IntensityPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  minDelay: number;
  maxDelay: number;
  punchesPerRound: number;
  defensiveChance: number;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  description?: string;
  focus?: string;
  rounds?: number;
  roundDuration?: number;
  restDuration?: number;
  intensityId?: string;
  isCustom?: boolean;
  roundConfigs: RoundConfig[];
}

// Intensity Preset Definitions
export const INTENSITY_PRESETS: Record<string, IntensityPreset> = {
  flow: {
    id: 'flow',
    name: 'Flow / Technique',
    description: 'Relaxed pace focused on technique and footwork',
    icon: '🧘',
    minDelay: 3.5,
    maxDelay: 5.0,
    punchesPerRound: 15,
    defensiveChance: 0.2,
  },
  standard: {
    id: 'standard',
    name: 'Standard Boxing',
    description: 'Realistic pad-work rhythm and steady cadence',
    icon: '🥊',
    minDelay: 2.0,
    maxDelay: 3.5,
    punchesPerRound: 25,
    defensiveChance: 0.35,
  },
  intense: {
    id: 'intense',
    name: 'Competition Pace',
    description: 'High-frequency callouts for rapid reactions',
    icon: '⚡',
    minDelay: 1.0,
    maxDelay: 2.0,
    punchesPerRound: 40,
    defensiveChance: 0.5,
  },
  counter: {
    id: 'counter',
    name: 'Counter & Reaction',
    description: 'Defensive callouts followed by immediate counters',
    icon: '🎯',
    minDelay: 1.8,
    maxDelay: 3.2,
    punchesPerRound: 30,
    defensiveChance: 0.6,
  },
};

// UI Styling mapping for move categories
export const MOVE_CATEGORY_COLORS: Record<string, { panel: string; text: string; active: string; idle: string }> = {
  punch: {
    panel: 'bg-red-500/20 border-red-500/30',
    text: 'text-red-400',
    active: 'bg-red-600 text-white',
    idle: 'bg-red-950/40 text-red-300',
  },
  striking: {
    panel: 'bg-red-500/20 border-red-500/30',
    text: 'text-red-400',
    active: 'bg-red-600 text-white',
    idle: 'bg-red-950/40 text-red-300',
  },
  defense: {
    panel: 'bg-blue-500/20 border-blue-500/30',
    text: 'text-blue-400',
    active: 'bg-blue-600 text-white',
    idle: 'bg-blue-950/40 text-blue-300',
  },
  movement: {
    panel: 'bg-green-500/20 border-green-500/30',
    text: 'text-green-400',
    active: 'bg-green-600 text-white',
    idle: 'bg-green-950/40 text-green-300',
  },
  ground: {
    panel: 'bg-amber-500/20 border-amber-500/30',
    text: 'text-amber-400',
    active: 'bg-amber-600 text-white',
    idle: 'bg-amber-950/40 text-amber-300',
  },
  transition: {
    panel: 'bg-purple-500/20 border-purple-500/30',
    text: 'text-purple-400',
    active: 'bg-purple-600 text-white',
    idle: 'bg-purple-950/40 text-purple-300',
  },
  clinch: {
    panel: 'bg-cyan-500/20 border-cyan-500/30',
    text: 'text-cyan-400',
    active: 'bg-cyan-600 text-white',
    idle: 'bg-cyan-950/40 text-cyan-300',
  },
  takedown: {
    panel: 'bg-orange-500/20 border-orange-500/30',
    text: 'text-orange-400',
    active: 'bg-orange-600 text-white',
    idle: 'bg-orange-950/40 text-orange-300',
  },
};

export const MOVE_CATEGORY_LABELS: Record<string, string> = {
  punch: 'Punches & Combos',
  striking: 'Striking & Boxing',
  defense: 'Defense & Slips',
  movement: 'Footwork & Angles',
  ground: 'Ground & Pound',
  transition: 'Transitions & Control',
  clinch: 'Bag Clinch & Knees',
  takedown: 'Shot Entries & Sprawls',
};

// Base callout catalog
export const ALL_MOVES: Record<string, string[]> = {
  punch: ['1, 2', '1, 2, 3', '1, 2, 3, 2', '1, 1, 2', '1, 6, 3, 2', '1, 2, body'],
  striking: ['1, 2', '1, 2, 3', '1, 2, 3, 2', '1, 1, 2', '1, 6, 3, 2', '1, 2, body'],
  defense: ['1, 2, slip, 2', 'roll, 2, 3, 2', 'slip right, 2, 3', 'slip left, 5, 2'],
  movement: ['1, 2, step back, 2', 'circle left, 1, 2', 'circle right, 1, 2'],
  ground: ['Post and heavy hammerfists', 'Mount, straight punches', 'Mount, heavy elbows', 'Knee on belly, 1, 2'],
  transition: ['Sprawl, heavy sprawl!', 'Stand up, reset stance', 'Frame and push, re-engage', 'Transition to mount'],
  clinch: ['Collar tie, heavy knees', 'Plum clinch, double knee'],
  takedown: ['Level change, double leg', 'Sprawl, spin to back'],
};

// Presets for UI Selectors
export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'standing_bag_3r',
    name: 'Standing Bag Essentials',
    description: '3 Rounds of combinations, movement, and level changes.',
    focus: 'Striking & Footwork',
    rounds: 3,
    roundDuration: 180,
    restDuration: 60,
    intensityId: 'standard',
    roundConfigs: [
      { roundNumber: 1, name: 'Warmup & Range', combos: ['1, 2', '1, 1, 2', 'circle left, 1, 2'] },
      { roundNumber: 2, name: 'Combos & Defense', combos: ['1, 2, 3, 2', '1, 2, slip, 2', 'roll, 2, 3'] },
      { roundNumber: 3, name: 'Power & Output', combos: ['1, 2, body, head', '10 second speed burst', 'power hooks'] },
    ],
  },
  {
    id: 'ground_bag_3r',
    name: 'Ground Duffel Heavy Duty',
    description: '3 Rounds of positional transitions, G&P, and sprawls.',
    focus: 'Ground & Pound / Scrambles',
    rounds: 3,
    roundDuration: 180,
    restDuration: 60,
    intensityId: 'standard',
    roundConfigs: [
      { roundNumber: 1, name: 'Control & Posture', combos: ['Post and heavy hammerfists', 'Mount, straight punches'] },
      { roundNumber: 2, name: 'Transitions & Scrambles', combos: ['Knee on belly, 1, 2', 'Side control, knees to body', 'Sprawl, heavy sprawl!'] },
      { roundNumber: 3, name: 'Finish & Reset', combos: ['Mount, heavy elbows', 'Stand up, reset stance', 'Stand up, 1, 2, shoot back down'] },
    ],
  },
];

// Helper Functions
export function formatMoveForDisplay(move: string): string {
  return move;
}

export function formatMoveForSpeech(move: string): string {
  return move.replace(/-/g, ' ');
}

export function getMoveCategory(move: string): MoveCategory {
  const lower = move.toLowerCase();
  if (lower.includes('mount') || lower.includes('knee') || lower.includes('elbow') || lower.includes('hammerfist')) {
    return 'ground';
  }
  if (lower.includes('sprawl') || lower.includes('stand up') || lower.includes('transition')) {
    return 'transition';
  }
  if (lower.includes('slip') || lower.includes('roll')) {
    return 'defense';
  }
  if (lower.includes('circle') || lower.includes('step back')) {
    return 'movement';
  }
  return 'punch';
}

export function getMoveLabel(move: string): string {
  return move;
}

export function getRandomDelay(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateFightScenario(
  roundOrType?: number | WorkoutType | string,
  intensity?: IntensityLevel | string
): string[] {
  if (typeof roundOrType === 'string' && roundOrType === 'ground_bag') {
    return [...ALL_MOVES.ground, ...ALL_MOVES.transition];
  }
  return [...ALL_MOVES.punch, ...ALL_MOVES.defense, ...ALL_MOVES.movement];
}