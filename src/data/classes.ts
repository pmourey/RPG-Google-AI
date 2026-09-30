import { AttributeStats, CharacterClass } from '../types/rpg';

export interface ClassDefinition {
  id: CharacterClass;
  name: string;
  subtitle: string;
  description: string;
  role: string;
  preferredDamageType: string;
  baseAttributes: AttributeStats;
  icon: string;
  perks: string[];
  startingScript: string;
}

export const CLASS_DEFINITIONS: Record<CharacterClass, ClassDefinition> = {
  pyromancer: {
    id: 'pyromancer',
    name: 'Pyromancer',
    subtitle: 'Weaver of Arcane Code & Flame',
    description: 'Channels high-yield computational magic. Masters destructive elemental fireballs, shield wards, and continuous burn status effects that melt armored foes.',
    role: 'Ranged Burst / Spellcaster',
    preferredDamageType: 'Fire & Arcane',
    baseAttributes: {
      vigor: 10,
      might: 8,
      intellect: 18,
      agility: 12,
      resilience: 10,
    },
    icon: 'flame',
    perks: [
      'Overclock: +25% Magic Power scaling per Intellect point',
      'Combustion: Fire spells inflict stacking Burn over time',
      'Mana Shield: Absorb lethal blow with mana when at 1 HP',
    ],
    startingScript: `# Python Tactical Gambit: Pyromancer
# Safe turn automation written in Python 3

if hero['hp'] < hero['max_hp'] * 0.35:
    # Cast Arcane Barrier if health drops below 35%
    return {"action": "skill", "skill_id": "arcane_barrier", "target_id": "self"}

# Find target enemy with lowest current health
lowest_hp_enemy = min(enemies, key=lambda e: e['hp'])

if hero['mana'] >= 35:
    # Unleash Pyroblast on weakest target
    return {"action": "skill", "skill_id": "pyroblast", "target_id": lowest_hp_enemy['id']}
else:
    # Conserve mana with Spark Strike
    return {"action": "skill", "skill_id": "fire_spark", "target_id": lowest_hp_enemy['id']}
`,
  },
  vanguard: {
    id: 'vanguard',
    name: 'Iron Vanguard',
    subtitle: 'Fortress of the Living Code',
    description: 'Heavily armored juggernaut forged in the mountain bastions. Commands massive physical strikes, armor buffs, shield counter-attacks, and unshakeable resilience.',
    role: 'Tank / Bruiser',
    preferredDamageType: 'Physical',
    baseAttributes: {
      vigor: 18,
      might: 16,
      intellect: 7,
      agility: 8,
      resilience: 19,
    },
    icon: 'shield',
    perks: [
      'Iron Bastion: 20% reduced physical and magical damage taken',
      'Retaliation: Guarding reflects 25% of blocked damage back',
      'Unyielding: +35% Health scaling per Vigor point',
    ],
    startingScript: `# Python Tactical Gambit: Vanguard
# Strategic defensive logic

# Guard if enemy is charging a heavy boss telegraph
boss = next((e for e in enemies if e.get('is_boss')), None)
if boss and boss['hp'] > 0 and hero['hp'] < hero['max_hp'] * 0.4:
    return {"action": "guard", "target_id": "self"}

# Execute low-health enemy
for enemy in enemies:
    if enemy['hp'] < 60 and hero['mana'] >= 20:
        return {"action": "skill", "skill_id": "shield_slam", "target_id": enemy['id']}

# Standard cleaving strike on the primary threat
target = boss if boss and boss['hp'] > 0 else enemies[0]
return {"action": "skill", "skill_id": "cleave", "target_id": target['id']}
`,
  },
  shadowblade: {
    id: 'shadowblade',
    name: 'Shadowblade',
    subtitle: 'Specter of Algorithmic Precision',
    description: 'Masters of lethal timing, swift dodges, armor-piercing venom, and exponential critical damage strikes. Acts first and strikes with fatal accuracy.',
    role: 'Agile Assassin / Crit Specialist',
    preferredDamageType: 'Physical & Poison',
    baseAttributes: {
      vigor: 11,
      might: 15,
      intellect: 9,
      agility: 20,
      resilience: 9,
    },
    icon: 'zap',
    perks: [
      'First Blood: +30% Critical Strike Chance on Turn 1',
      'Elusive: High Dodge rate allows completely evading incoming attacks',
      'Venomous Edge: Attacks inflict stacking lethal venom',
    ],
    startingScript: `# Python Tactical Gambit: Shadowblade
# Critical assassination logic

# Target boss or highest health foe for poison dot
target = next((e for e in enemies if e.get('is_boss')), enemies[0])

if hero['mana'] >= 30:
    return {"action": "skill", "skill_id": "shadow_strike", "target_id": target['id']}
elif hero['mana'] >= 15:
    return {"action": "skill", "skill_id": "venom_slash", "target_id": target['id']}
else:
    return {"action": "attack", "target_id": target['id']}
`,
  },
  cleric: {
    id: 'cleric',
    name: 'Celestial Weaver',
    subtitle: 'Arbiter of Sacred Matrices',
    description: 'Harmonizes light energy and sacred restorative equations. Cleanses ailments, revitalizes wounded allies, and channels blinding holy smites against dark forces.',
    role: 'Healer / Holy Paladin',
    preferredDamageType: 'Holy & Radiant',
    baseAttributes: {
      vigor: 14,
      might: 11,
      intellect: 17,
      agility: 10,
      resilience: 14,
    },
    icon: 'sparkles',
    perks: [
      'Aura of Renewal: Restores 5% of max HP each turn',
      'Purify: Automatically removes 1 negative status effect each round',
      'Sunburst: Holy damage ignores 30% of enemy magic defense',
    ],
    startingScript: `# Python Tactical Gambit: Celestial Weaver
# Intelligent restorative healing priority

if hero['hp'] < hero['max_hp'] * 0.5 and hero['mana'] >= 25:
    # Priority 1: Self-preservation with Divine Mend
    return {"action": "skill", "skill_id": "divine_mend", "target_id": "self"}

# Priority 2: Holy Smite on undead or strongest enemy
target = next((e for e in enemies if e['hp'] > 0), None)
if target and hero['mana'] >= 30:
    return {"action": "skill", "skill_id": "holy_smite", "target_id": target['id']}

return {"action": "attack", "target_id": target['id'] if target else 'target_0'}
`,
  },
};
