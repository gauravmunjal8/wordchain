// WordChain - Daily Puzzle Data
// Each adjacent pair in the full chain forms a real compound word or common phrase.
// e.g. BUTTER→CUP→CAKE means BUTTERCUP + CUPCAKE

'use strict';

const GAME_START_DATE = '2026-02-25';

// 7 days of puzzles — cycles indefinitely
const PUZZLES = [
  // Day 0 ─ Feb 25
  {
    easy:   { start: 'BUTTER',  end: 'CAKE',    answer: ['CUP'],                     hint: 'A small cup-shaped yellow wildflower',          points: 1 },
    medium: { start: 'FIRE',    end: 'WAY',     answer: ['SIDE', 'WALK'],             hint: 'Walk beside something warm',                    points: 2 },
    hard:   { start: 'THUNDER', end: 'UP',      answer: ['STORM', 'FRONT', 'LINE'],   hint: 'Violent weather → battle position → a queue',   points: 4 },
  },
  // Day 1
  {
    easy:   { start: 'BLACK',   end: 'HOUSE',   answer: ['BIRD'],                     hint: 'A dark feathered creature builds a home',       points: 1 },
    medium: { start: 'HONEY',   end: 'MIND',    answer: ['BEE', 'HIVE'],              hint: "Nature's sweetest architect",                   points: 2 },
    hard:   { start: 'OVER',    end: 'GROUND',  answer: ['BOARD', 'GAME', 'PLAY'],    hint: 'Nautical disaster leads to fun outside',        points: 4 },
  },
  // Day 2
  {
    easy:   { start: 'RAIN',    end: 'TIE',     answer: ['BOW'],                      hint: 'A colorful arc that dresses up formally',       points: 1 },
    medium: { start: 'SUN',     end: 'BREAK',   answer: ['BURN', 'OUT'],              hint: 'Summer gone wrong, exhausted',                  points: 2 },
    hard:   { start: 'HEAD',    end: 'SHOP',    answer: ['MASTER', 'PIECE', 'WORK'],  hint: 'School leader creates art for trade',            points: 4 },
  },
  // Day 3
  {
    easy:   { start: 'BOOK',    end: 'HOLE',    answer: ['WORM'],                     hint: "A reader's pest tunnels through space",         points: 1 },
    medium: { start: 'OVER',    end: 'POST',    answer: ['LOOK', 'OUT'],              hint: 'See it coming from a military position',        points: 2 },
    hard:   { start: 'UNDER',   end: 'WORM',    answer: ['COVER', 'STORY', 'BOOK'],   hint: 'Secret agent reads a literary work',             points: 4 },
  },
  // Day 4
  {
    easy:   { start: 'FIRE',    end: 'MAT',     answer: ['PLACE'],                    hint: 'Where logs burn sits before the front door',    points: 1 },
    medium: { start: 'HAND',    end: 'TOWN',    answer: ['SHAKE', 'DOWN'],            hint: 'A deal sealed leads to an urban fall',          points: 2 },
    hard:   { start: 'BACK',    end: 'LIFT',    answer: ['GROUND', 'WORK', 'SHOP'],   hint: 'History of labor in a store',                   points: 4 },
  },
  // Day 5
  {
    easy:   { start: 'SUN',     end: 'BED',     answer: ['FLOWER'],                   hint: 'A tall garden giant above a sleeping spot',     points: 1 },
    medium: { start: 'HEAD',    end: 'TOWN',    answer: ['LINE', 'UP'],               hint: 'News + a queue leads somewhere urban',          points: 2 },
    hard:   { start: 'FOOT',    end: 'FRONT',   answer: ['NOTE', 'BOOK', 'STORE'],    hint: "Annotation in a shop's entrance",               points: 4 },
  },
  // Day 6
  {
    easy:   { start: 'OVER',    end: 'STAND',   answer: ['NIGHT'],                    hint: 'The long dark hours beside the bed',            points: 1 },
    medium: { start: 'WATER',   end: 'SIDE',    answer: ['FALL', 'OUT'],              hint: 'A cascade leads to consequences',               points: 2 },
    hard:   { start: 'TIME',    end: 'TOWN',    answer: ['OUT', 'BREAK', 'DOWN'],     hint: "Clock's rest cascades to urban collapse",       points: 4 },
  },
];

function getTodayPuzzle() {
  const start = new Date(GAME_START_DATE);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOffset = Math.floor((today - start) / 86400000);
  const idx = ((dayOffset % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  return { puzzle: PUZZLES[idx], dayNumber: dayOffset + 1 };
}
