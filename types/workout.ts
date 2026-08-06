// types/workout.ts - Updated with database-compatible intensity values

export interface IntensityPreset {
  id: string; // Must match database: 'pressure' or 'counter'
  name: string;
  description: string;
  icon: string;
  minDelay: number;
  maxDelay: number;
  punchesPerRound: number;
  comboComplexity: 'simple' | 'moderate' | 'complex';
  defensiveChance: number;
}

// Updated to match database values
export const INTENSITY_PRESETS: Record<string, IntensityPreset> = {
  pressure: {
    id: 'pressure', // Matches database
    name: 'Pressure Fighting',
    description: 'High pace, aggressive, constant pressure',
    icon: '🔥',
    minDelay: 2,
    maxDelay: 6,
    punchesPerRound: 120,
    comboComplexity: 'complex',
    defensiveChance: 0.15,
  },
  counter: {
    id: 'counter', // Matches database
    name: 'Counter Fighting',
    description: 'Patient, tactical, wait for opportunities',
    icon: '🎯',
    minDelay: 6,
    maxDelay: 12,
    punchesPerRound: 60,
    comboComplexity: 'moderate',
    defensiveChance: 0.35,
  },
};

// Defensive moves
export const DEFENSIVE_MOVES = [
  'Slip Right',
  'Slip Left',
  'Roll Right',
  'Roll Left',
  'Block High',
  'Block Body',
  'Parry',
  'Pivot Right',
  'Pivot Left',
];

export const ALL_MOVES = {
  offensive: [
    'Jab',
    'Cross',
    'Left Hook',
    'Right Hook',
    'Left Uppercut',
    'Right Uppercut',
    'Left Body Hook',
    'Right Body Hook',
  ],
  defensive: DEFENSIVE_MOVES,
};

export const ALL_COMBOS = [
  ...ALL_MOVES.offensive,
  ...ALL_MOVES.defensive,
];

export function isDefensiveMove(move: string): boolean {
  return ALL_MOVES.defensive.includes(move);
}

export function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomDefensiveMove(): string {
  return DEFENSIVE_MOVES[Math.floor(Math.random() * DEFENSIVE_MOVES.length)];
}

// Generate intelligent fight scenarios
export function generateFightScenario(roundNumber: number, intensity: string): string[] {
  const preset = INTENSITY_PRESETS[intensity] || INTENSITY_PRESETS.counter;
  const scenario: string[] = [];
  
  const patterns: Record<string, string[][]> = {
    simple: [
      ['Jab', 'Cross'],
      ['Jab', 'Jab'],
      ['Cross', 'Left Hook'],
      ['Jab', 'Slip Right'],
      ['Block', 'Jab'],
    ],
    moderate: [
      ['Jab', 'Cross', 'Left Hook'],
      ['Jab', 'Jab', 'Cross'],
      ['Cross', 'Left Hook', 'Cross'],
      ['Jab', 'Slip Left', 'Cross'],
      ['Roll Right', 'Jab', 'Cross'],
      ['Block', 'Jab', 'Cross'],
    ],
    complex: [
      ['Jab', 'Cross', 'Left Hook', 'Cross'],
      ['Jab', 'Slip Right', 'Cross', 'Left Hook'],
      ['Roll Left', 'Jab', 'Cross', 'Right Hook'],
      ['Block', 'Jab', 'Cross', 'Left Hook'],
      ['Parry', 'Cross', 'Left Hook', 'Cross'],
      ['Slip Right', 'Jab', 'Cross', 'Left Hook'],
    ],
  };

  const patternList = patterns[preset.comboComplexity] || patterns.moderate;
  const patternIndex = (roundNumber - 1) % patternList.length;
  const pattern = patternList[patternIndex];
  
  const shuffled = [...pattern];
  if (Math.random() > 0.5) {
    shuffled.reverse();
  }
  
  return shuffled;
}