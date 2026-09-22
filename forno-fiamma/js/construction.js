const CONSTRUCTION_MAX_QUEUE = 1;
const DETERIORATION_INTERVAL = 300000;
const BUILDING_MATERIALS = {
  forno:     { bricks: 5, wood: 3, stone: 2, fabric: 0 },
  bottega:   { bricks: 4, wood: 4, stone: 1, fabric: 1 },
  campo:     { bricks: 2, wood: 2, stone: 1, fabric: 3 },
  mulino:    { bricks: 3, wood: 5, stone: 2, fabric: 1 },
  deposito:  { bricks: 3, wood: 2, stone: 3, fabric: 0 },
  decorazione: { bricks: 1, wood: 3, stone: 1, fabric: 2 },
};

const MATERIAL_DEFS = {
  bricks: { name: 'Mattoni', emoji: '🧱', regenTime: 7200, maxStock: 15 },
  wood:   { name: 'Legno',   emoji: '🪵', regenTime: 5400, maxStock: 20 },
  stone:  { name: 'Pietra',  emoji: '🪨', regenTime: 10800, maxStock: 12 },
  fabric: { name: 'Stoffa',  emoji: '🧵', regenTime: 9000, maxStock: 10 },
};

const BUILDING_DESC = {
  forno:     'Forno per cuocere il pane',
  bottega:   'Bottega per vendere i prodotti',
  campo:     'Campo per coltivare gli ingredienti',
  mulino:    'Mulino per macinare la farina',
  deposito:  'Deposito per conservare le risorse',
  decorazione: 'Decorazione per abbellire il villaggio',
};

const DETERIORATION_RATE = {
  common:   { bricks: 0.1, wood: 0.1, stone: 0.05, fabric: 0.05 },
  uncommon: { bricks: 0.07, wood: 0.07, stone: 0.04, fabric: 0.04 },
  rare:     { bricks: 0.05, wood: 0.05, stone: 0.03, fabric: 0.03 },
  epic:     { bricks: 0.03, wood: 0.03, stone: 0.02, fabric: 0.02 },
  legendary:{ bricks: 0.01, wood: 0.01, stone: 0.01, fabric: 0.01 },
};

let _constructionQueue = [];
let _buildings = {};
let _lastDeterioration = 0;
let _materials = {};
let _buildInProgress = false;

function initMaterials() {
  _materials = {};
  for (const [id, def] of Object.entries(MATERIAL_DEFS)) {
    _materials[id] = { stock: Math.floor(def.maxStock * 0.3), maxStock: def.maxStock, lastRegen: Date.now() };
  }
}

function initBuildings() {
  _buildings = {};
  for (const [id, desc] of Object.entries(BUILDING_DESC)) {
    _buildings[id] = {
      id,
      name: desc,
      tier: 'common',
      level: 1,
      condition: 100,
      builtAt: Date.now(),
      lastRepair: Date.now(),
    };
  }
  _buildings.forno.tier = 'common';
  _buildings.bottega.tier = 'common';
  _buildings.campo.tier = 'common';
  _buildings.mulino.tier = 'uncommon';
  _buildings.deposito.tier = 'common';
  _buildings.decorazione.tier = 'common';
}

function getTierDeterioration(tier) {
  return DETERIORATION_RATE[tier] || DETERIORATION_RATE.common;
}

export function initConstruction() {
  initMaterials();
  initBuildings();
  _constructionQueue = [];
  _lastDeterioration = Date.now();
  _buildInProgress = false;
}

export function getMaterials() {
  return _materials;
}

export function getBuildings() {
  return _buildings;
}

export function getConstructionQueue() {
  return _constructionQueue;
}

export function isBuildInProgress() {
  return _buildInProgress;
}

export function getBuilding(id) {
  return _buildings[id] || null;
}

export function getMaterial(id) {
  return _materials[id] || null;
}

export function getBuildingCosts(buildingId) {
  return BUILDING_MATERIALS[buildingId] || null;
}

export function getMaterialDef(materialId) {
  return MATERIAL_DEFS[materialId] || null;
}

export function canAffordBuilding(buildingId, stateMaterials) {
  const costs = BUILDING_MATERIALS[buildingId];
  if (!costs) return false;
  for (const [mat, amount] of Object.entries(costs)) {
    if ((stateMaterials && stateMaterials[mat]?.stock || 0) < amount) return false;
  }
  return true;
}

export function hasMaterialsForBuilding(buildingId) {
  const costs = BUILDING_MATERIALS[buildingId];
  if (!costs) return false;
  for (const [mat, amount] of Object.entries(costs)) {
    if ((_materials[mat]?.stock || 0) < amount) return false;
  }
  return true;
}

export function startConstruction(buildingId) {
  if (_buildInProgress) return false;
  if (_constructionQueue.length >= CONSTRUCTION_MAX_QUEUE) return false;
  if (!hasMaterialsForBuilding(buildingId)) return false;

  const costs = BUILDING_MATERIALS[buildingId];
  for (const [mat, amount] of Object.entries(costs)) {
    _materials[mat].stock -= amount;
  }

  _buildInProgress = true;
  _constructionQueue.push({
    buildingId,
    startedAt: Date.now(),
    progress: 0,
    complete: false,
  });

  return true;
}

export function updateConstruction() {
  if (!_buildInProgress || _constructionQueue.length === 0) return null;

  const current = _constructionQueue[_constructionQueue.length - 1];
  if (!current) return null;

  const elapsed = Date.now() - current.startedAt;
  const buildTime = 30000;
  const progress = Math.min(100, (elapsed / buildTime) * 100);
  current.progress = progress;

  if (progress >= 100) {
    current.complete = true;
    current.progress = 100;
    _buildInProgress = false;
    const building = _buildings[current.buildingId];
    if (building) {
      building.condition = 100;
      building.builtAt = Date.now();
    }
    const result = { buildingId: current.buildingId, progress: 100 };
    _constructionQueue = [];
    return result;
  }

  return null;
}

export function getConstructionProgress() {
  if (!_buildInProgress || _constructionQueue.length === 0) return null;
  const current = _constructionQueue[_constructionQueue.length - 1];
  if (!current) return null;
  const elapsed = Date.now() - current.startedAt;
  return {
    buildingId: current.buildingId,
    progress: Math.min(100, (elapsed / 30000) * 100),
    complete: current.complete,
  };
}

export function deteriorateBuildings() {
  const now = Date.now();
  if (now - _lastDeterioration < DETERIORATION_INTERVAL) return;
  _lastDeterioration = now;

  for (const [id, building] of Object.entries(_buildings)) {
    const tier = building.tier;
    const rate = getTierDeterioration(tier);
    for (const [mat, decRate] of Object.entries(rate)) {
      building.condition = Math.max(0, building.condition - decRate * 10);
    }
  }
}

export function repairBuilding(buildingId) {
  const building = _buildings[buildingId];
  if (!building) return false;
  if (building.condition >= 100) return false;

  const repairCost = {
    bricks: Math.ceil((100 - building.condition) * 0.3),
    wood: Math.ceil((100 - building.condition) * 0.25),
    stone: Math.ceil((100 - building.condition) * 0.2),
    fabric: Math.ceil((100 - building.condition) * 0.15),
  };

  for (const [mat, amount] of Object.entries(repairCost)) {
    if ((_materials[mat]?.stock || 0) < amount) return false;
  }

  for (const [mat, amount] of Object.entries(repairCost)) {
    _materials[mat].stock -= amount;
  }

  building.condition = 100;
  building.lastRepair = Date.now();
  return true;
}

export function getRepairCost(buildingId) {
  const building = _buildings[buildingId];
  if (!building || building.condition >= 100) return null;
  return {
    bricks: Math.ceil((100 - building.condition) * 0.3),
    wood: Math.ceil((100 - building.condition) * 0.25),
    stone: Math.ceil((100 - building.condition) * 0.2),
    fabric: Math.ceil((100 - building.condition) * 0.15),
  };
}

export function getBuildingCondition(buildingId) {
  const building = _buildings[buildingId];
  return building ? building.condition : 0;
}

export function getMaterialStock(materialId) {
  return _materials[materialId]?.stock || 0;
}

export function getMaterialMax(materialId) {
  return _materials[materialId]?.maxStock || 0;
}

export function regenerateMaterials() {
  const now = Date.now();
  for (const [id, mat] of Object.entries(_materials)) {
    const def = MATERIAL_DEFS[id];
    const elapsed = now - mat.lastRegen;
    const regenRate = def.regenTime;
    const ticks = Math.floor(elapsed / regenRate);
    if (ticks > 0) {
      mat.stock = Math.min(mat.maxStock, mat.stock + ticks);
      mat.lastRegen += ticks * regenRate;
    }
  }
}

export function getAllMaterials() {
  return Object.entries(MATERIAL_DEFS).map(([id, def]) => ({
    id,
    name: def.name,
    emoji: def.emoji,
    stock: _materials[id]?.stock || 0,
    maxStock: def.maxStock,
    lastRegen: _materials[id]?.lastRegen || Date.now(),
  }));
}

export function getBuildingDetails(buildingId) {
  const building = _buildings[buildingId];
  const costs = BUILDING_MATERIALS[buildingId];
  if (!building || !costs) return null;
  return {
    ...building,
    costs,
    condition: building.condition,
    needsRepair: building.condition < 100,
  };
}

export function getAllBuildingDetails() {
  return Object.keys(_buildings).map(id => getBuildingDetails(id)).filter(Boolean);
}

export function getConstructionSummary() {
  return {
    materials: getAllMaterials(),
    buildings: getAllBuildingDetails(),
    queue: _constructionQueue,
    buildInProgress: _buildInProgress,
  };
}

export function loadConstructionState(saved) {
  if (!saved) return;
  if (saved._materials) _materials = saved._materials;
  if (saved._buildings) _buildings = saved._buildings;
  if (saved._constructionQueue) _constructionQueue = saved._constructionQueue;
  if (saved._lastDeterioration) _lastDeterioration = saved._lastDeterioration;
  if (saved._buildInProgress !== undefined) _buildInProgress = saved._buildInProgress;
}

export function getConstructionSaveState() {
  return {
    _materials,
    _buildings,
    _constructionQueue,
    _lastDeterioration,
    _buildInProgress,
  };
}

export function resetConstruction() {
  initMaterials();
  initBuildings();
  _constructionQueue = [];
  _lastDeterioration = Date.now();
  _buildInProgress = false;
}

export function getBUILDING_MATERIALS() {
  return BUILDING_MATERIALS;
}

export function getMATERIAL_DEFS() {
  return MATERIAL_DEFS;
}

export function getBUILDING_DESC() {
  return BUILDING_DESC;
}
