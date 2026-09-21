export const NATURE_ULTIMATE = {
  maxCharge: 100,
  chargePerCard: 8,
  chargePerFusion: 15,
  activationCost: 100,
  effects: {
    damageRadius: 150,
    damage: 40,
    healAmount: 30,
    fusionBoost: 2
  },
  cooldown: 30,
  sound: {
    charge: [440, 554, 659],
    activate: [523, 659, 784, 1047, 1319],
    impact: [200, 150, 100]
  }
};

export function getNatureCharge(elixir, fusionActive) {
  if (fusionActive) return NATURE_ULTIMATE.chargePerFusion;
  return NATURE_ULTIMATE.chargePerCard;
}
