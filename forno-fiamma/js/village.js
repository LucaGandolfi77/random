import { getState } from './state.js';
import { VILLAGE_BUILDINGS } from './data.js';

const GRID_COLS = 8;
const GRID_ROWS = 6;
let _grid = null;

export function initGrid() {
  const s = getState();
  if (s.village.grid.length === GRID_ROWS) {
    _grid = s.village.grid.map(r => [...r]);
  } else {
    _grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    placeInitialBuildings();
  }
  return _grid;
}

function placeInitialBuildings() {
  placeBuilding(1, 0, 'forno', 0);
  placeBuilding(4, 0, 'forno', 1);
  placeBuilding(6, 1, 'campo');
  placeBuilding(0, 3, 'bottega');
}

function placeBuilding(col, row, type, ovenIdx = null) {
  const def = VILLAGE_BUILDINGS[type];
  if (!def) return false;
  if (col + def.width > GRID_COLS || row + def.height > GRID_ROWS) return false;

  for (let r = row; r < row + def.height; r++) {
    for (let c = col; c < col + def.width; c++) {
      if (_grid[r]?.[c]) return false;
    }
  }

  for (let r = row; r < row + def.height; r++) {
    for (let c = col; c < col + def.width; c++) {
      _grid[r][c] = { type, ovenIdx, originCol: col, originRow: row };
    }
  }
  return true;
}

export function getGrid() { return _grid; }
export function getGridSize() { return { cols: GRID_COLS, rows: GRID_ROWS }; }

export function cellAt(col, row) {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
  return _grid[row][col];
}

export function findEmptySpot(width, height) {
  for (let r = 0; r <= GRID_ROWS - height; r++) {
    for (let c = 0; c <= GRID_COLS - width; c++) {
      let ok = true;
      for (let dr = 0; dr < height && ok; dr++) {
        for (let dc = 0; dc < width && ok; dc++) {
          if (_grid[r + dr]?.[c + dc]) ok = false;
        }
      }
      if (ok) return { col: c, row: r };
    }
  }
  return null;
}

export function canPlace(col, row, type) {
  const def = VILLAGE_BUILDINGS[type];
  if (!def) return false;
  if (col + def.width > GRID_COLS || row + def.height > GRID_ROWS) return false;
  for (let r = row; r < row + def.height; r++) {
    for (let c = col; c < col + def.width; c++) {
      if (_grid[r]?.[c]) return false;
    }
  }
  return true;
}

export function removeBuilding(col, row) {
  const cell = _grid[row]?.[col];
  if (!cell) return null;
  const { originCol, originRow } = cell;
  const def = VILLAGE_BUILDINGS[cell.type];
  if (!def) return null;

  for (let r = originRow; r < originRow + def.height; r++) {
    for (let c = originCol; c < originCol + def.width; c++) {
      if (_grid[r]) _grid[r][c] = null;
    }
  }
  return { type: cell.type, ovenIdx: cell.ovenIdx };
}

export function syncWithOvens() {
  const s = getState();
  const placedOvens = new Set();

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cell = _grid[r][c];
      if (cell?.type === 'forno' && cell.ovenIdx !== null) {
        placedOvens.add(cell.ovenIdx);
      }
    }
  }

  for (let i = 0; i < s.player.maxOvens; i++) {
    if (!placedOvens.has(i) && s.ovens[i]) {
      const spot = findEmptySpot(2, 2);
      if (spot) {
        placeBuilding(spot.col, spot.row, 'forno', i);
      }
    }
  }
}

export function serializeGrid() {
  return _grid.map(r => r.map(c => c ? { type: c.type, ovenIdx: c.ovenIdx } : null));
}

export function deserializeGrid(data) {
  if (!data || data.length !== GRID_ROWS) return false;
  _grid = data.map(r => r.map(c => c ? { ...c, originCol: 0, originRow: 0 } : null));
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cell = _grid[r][c];
      if (cell) {
        const def = VILLAGE_BUILDINGS[cell.type];
        if (def) {
          if (!_grid[r][c].originCol) _grid[r][c].originCol = c;
          if (!_grid[r][c].originRow) _grid[r][c].originRow = r;
        }
      }
    }
  }
  return true;
}
