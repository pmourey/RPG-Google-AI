export type CharacterClass = 'pyromancer' | 'vanguard' | 'shadowblade' | 'cleric';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type ItemType = 'weapon' | 'offhand' | 'armor' | 'helm' | 'amulet' | 'ring' | 'potion';

export type DamageType = 'physical' | 'fire' | 'frost' | 'lightning' | 'holy' | 'shadow' | 'poison' | 'pure';

export interface AttributeStats {
  vigor: number;       // Max HP & HP Regen
  might: number;       // Physical Attack & Armor Break
  intellect: number;   // Max Mana & Magic Power
  agility: number;     // Speed/Initiative, Crit % & Dodge %
  resilience: number;  // Armor & Magic Resist
}

export interface ComputedStats {
  maxHp: number;
  currentHp: number;
  maxMana: number;
  currentMana: number;
  hpRegen: number;
  manaRegen: number;
  physicalAttack: number;
  magicPower: number;
  armor: number;
  magicResist: number;
  critChance: number;      // e.g. 0.15 (15%)
  critMultiplier: number;  // e.g. 1.75
  dodgeChance: number;     // e.g. 0.08
  speed: number;           // Initiative
  maxAp: number;
  currentAp: number;
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  icon: string;
  duration: number; // rounds left
  value: number;
  damageType?: DamageType;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  className: CharacterClass;
  tier: number;
  levelReq: number;
  manaCost: number;
  apCost: number;
  cooldown: number;
  currentCooldown: number;
  damageType: DamageType;
  basePowerMultiplier: number;
  isHealing?: boolean;
  targetType: 'single_enemy' | 'all_enemies' | 'self' | 'ally';
  statusInflicted?: Omit<StatusEffect, 'id'>;
  description: string;
  icon: string;
  pythonHook?: string; // name of python function executed
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  level: number;
  stats: Partial<AttributeStats>;
  bonusAttack?: number;
  bonusArmor?: number;
  bonusMagicPower?: number;
  bonusCrit?: number;
  description: string;
  value: number; // gold
  icon: string;
  specialPerk?: string;
  healAmount?: number;
  manaAmount?: number;
}

export interface Equipment {
  weapon: Item | null;
  offhand: Item | null;
  armor: Item | null;
  helm: Item | null;
  amulet: Item | null;
  ring: Item | null;
}

export interface VisualCustomization {
  avatarId: string;
  gender: 'masculine' | 'feminine' | 'enigmatic';
  auraColor: string; // hex
  trimColor: string; // hex
  crestSymbol: 'dragon' | 'serpent' | 'owl' | 'lion' | 'gear';
}

export interface PlayerCharacter {
  id: string;
  name: string;
  title: string;
  characterClass: CharacterClass;
  level: number;
  exp: number;
  expToNextLevel: number;
  gold: number;
  unspentAttributePoints: number;
  unspentTalentPoints: number;
  attributes: AttributeStats;
  computedStats: ComputedStats;
  equipment: Equipment;
  inventory: Item[];
  skills: Skill[];
  unlockedTalentIds: string[];
  customization: VisualCustomization;
  customPythonScript: string;
  scriptEnabled: boolean;
}

export interface Enemy {
  id: string;
  name: string;
  title?: string;
  level: number;
  isBoss: boolean;
  maxHp: number;
  currentHp: number;
  maxMana: number;
  currentMana: number;
  physicalAttack: number;
  magicPower: number;
  armor: number;
  magicResist: number;
  speed: number;
  statusEffects: StatusEffect[];
  skills: Skill[];
  intent?: {
    actionName: string;
    targetType: 'single' | 'all';
    isWarning?: boolean;
    damageEstimate?: number;
  };
  portrait: string;
  goldReward: number;
  expReward: number;
  lootTable: Item[];
}

export interface CombatLogEntry {
  id: string;
  round: number;
  source: 'player' | 'enemy' | 'system' | 'python';
  sourceName: string;
  text: string;
  damage?: number;
  heal?: number;
  isCrit?: boolean;
  damageType?: DamageType;
  pythonFormula?: string; // e.g. "dmg = int((might * 1.5 - def * 0.4) * 1.8) -> 84"
  timestamp: string;
}

export interface DungeonStage {
  id: string;
  name: string;
  zone: string;
  description: string;
  levelReq: number;
  enemies: Enemy[];
  isCompleted: boolean;
  isBossStage: boolean;
  bgAtmosphere: string;
}
