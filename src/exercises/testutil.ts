import { GRID_PRESETS, progressionToGrid, type Grid } from '../theory/grid';
export const gridFromPresetForTest = (id: string, key: string): Grid | null => {
  const p = GRID_PRESETS.find(g => g.id === id); return p ? progressionToGrid(p.romans, key) : null;
};
