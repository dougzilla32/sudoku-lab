const ADJECTIVES = [
  'Sneaky', 'Bold', 'Clever', 'Tricky', 'Swift', 'Crafty', 'Sly',
  'Daring', 'Lucky', 'Nimble', 'Speedy', 'Brainy', 'Zippy', 'Jolly',
  'Zesty', 'Funky', 'Cheeky', 'Peppy', 'Snappy', 'Nifty', 'Plucky',
  'Wily', 'Feisty', 'Spunky', 'Frisky', 'Perky', 'Saucy', 'Gutsy',
  'Jazzy', 'Breezy', 'Bouncy', 'Sparkly', 'Mighty', 'Scrappy', 'Punchy',
]

const NOUNS = [
  'Singleton',  // only candidate in a cell
  'Naked Pair', // two candidates in two cells
  'Hidden Twin',
  'Triple Play',
  'Box Blitz',
  'Grid Quest',
  'Number Crunch',
  'Pencil Sprint',
  'Cell Clash',
  'Digit Duel',
  'Column Caper',
  'Row Rumble',
  'Puzzle Race',
  'Nine Hunt',
  'Seven Gambit',
  'Box Heist',
  'Grid Dash',
  'Sudoku Showdown',
  'Candidate Chase',
  'Pencil Mark Parade',
  'Nonet Noodle',
  'X-Wing Fling',
  'Swordfish Shuffle',
  'Skyscraper Stunt',
  'Naked Triple',
  'Hidden Quintet',
  'Box Trot',
  'Digit Disco',
  'Grid Rodeo',
  'Puzzle Parade',
]

export function generateGameName() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj} ${noun}`
}
