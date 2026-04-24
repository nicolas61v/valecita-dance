export interface Note {
  time: number;
  key: 'D' | 'F' | 'J' | 'K';
}

export interface Song {
  bpm: number;
  audioFile?: string;
  notes: Note[];
}

export const songs: Record<string, Song> = {
  demo: {
    bpm: 120,
    notes: [
      // Measure 1 — simple 4-on-the-floor
      { time: 2.0, key: 'D' }, { time: 2.5, key: 'F' },
      { time: 3.0, key: 'J' }, { time: 3.5, key: 'K' },
      // Measure 2 — reverse
      { time: 4.0, key: 'K' }, { time: 4.5, key: 'J' },
      { time: 5.0, key: 'F' }, { time: 5.5, key: 'D' },
      // Measure 3 — off-beats
      { time: 6.25, key: 'D' }, { time: 6.75, key: 'J' },
      { time: 7.25, key: 'F' }, { time: 7.75, key: 'K' },
      // Measure 4 — double hits
      { time: 8.0, key: 'D' }, { time: 8.0, key: 'K' },
      { time: 8.5, key: 'F' }, { time: 8.5, key: 'J' },
      { time: 9.0, key: 'D' }, { time: 9.0, key: 'K' },
      { time: 9.5, key: 'F' }, { time: 9.5, key: 'J' },
      // Measure 5-6 — sixteenth runs
      { time: 10.0, key: 'D' }, { time: 10.25, key: 'F' },
      { time: 10.5, key: 'J' }, { time: 10.75, key: 'K' },
      { time: 11.0, key: 'K' }, { time: 11.25, key: 'J' },
      { time: 11.5, key: 'F' }, { time: 11.75, key: 'D' },
      { time: 12.0, key: 'D' }, { time: 12.25, key: 'F' },
      { time: 12.5, key: 'J' }, { time: 12.75, key: 'K' },
      // Measure 7-8 — mixed
      { time: 14.0, key: 'D' }, { time: 14.5, key: 'F' },
      { time: 15.0, key: 'J' }, { time: 15.5, key: 'K' },
      { time: 16.0, key: 'D' }, { time: 16.0, key: 'F' },
      { time: 16.5, key: 'J' }, { time: 16.5, key: 'K' },
      { time: 17.0, key: 'D' }, { time: 17.5, key: 'K' },
      { time: 18.0, key: 'F' }, { time: 18.5, key: 'J' },
    ],
  },
};
