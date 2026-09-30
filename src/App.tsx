import React, { useState, useEffect, useCallback } from 'react';
import { AttributeStats, CharacterClass, ComputedStats, DungeonStage, Equipment, Item, PlayerCharacter, VisualCustomization } from './types/rpg';
import { CLASS_DEFINITIONS } from './data/classes';
import { CLASS_SKILLS, TalentNode } from './data/skills';
import { STARTER_ITEMS } from './data/items';
import { DUNGEON_STAGES } from './data/dungeons';
import { pythonEngine } from './python/pyodideRunner';
import { sfx } from './audio/soundEffects';

import { Navbar } from './components/Navbar';
import { CharacterCreation } from './components/CharacterCreation';
import { CharacterSheet } from './components/CharacterSheet';
import { TalentTree } from './components/TalentTree';
import { DungeonMap } from './components/DungeonMap';
import { CombatArena } from './components/CombatArena';
import { PythonStudio } from './components/PythonStudio';

const STORAGE_KEY = 'pythrone_save_v1';

export default function App() {
  const [player, setPlayer] = useState<PlayerCharacter | null>(null);
  const [activeTab, setActiveTab] = useState<'character' | 'talents' | 'dungeon' | 'combat' | 'python_studio'>('character');
  const [activeCombatEncounter, setActiveCombatEncounter] = useState<{
    stage: DungeonStage;
    isEndless?: boolean;
    wave?: number;
  } | null>(null);

  const [isPythonReady, setIsPythonReady] = useState(pythonEngine.getIsReady());
  const [pythonLatency, setPythonLatency] = useState(12);

  // Listen to Pyodide engine initialization
  useEffect(() => {
    pythonEngine.onReady(() => {
      setIsPythonReady(true);
      setPythonLatency(pythonEngine.getLastLatency() || 4);
    });
  }, []);

  // Load saved character from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.inventory)) {
          parsed.inventory = parsed.inventory.filter((item: any) => item && item.id);
        }
        setPlayer(parsed);
      }
    } catch (e) {
      console.error('Failed to load save game:', e);
    }
  }, []);

  // Save character state to LocalStorage
  const savePlayerState = useCallback((p: PlayerCharacter) => {
    setPlayer(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, []);

  // Calculate gear bonus totals for Python stat calculation
  const getGearBonuses = (equipment: Equipment) => {
    const bonuses: Record<string, number> = {
      vigor: 0,
      might: 0,
      intellect: 0,
      agility: 0,
      resilience: 0,
      bonus_attack: 0,
      bonus_armor: 0,
      bonus_magic_power: 0,
      bonus_crit: 0,
    };

    Object.values(equipment).forEach((item) => {
      if (!item) return;
      if (item.stats) {
        if (item.stats.vigor) bonuses.vigor += item.stats.vigor;
        if (item.stats.might) bonuses.might += item.stats.might;
        if (item.stats.intellect) bonuses.intellect += item.stats.intellect;
        if (item.stats.agility) bonuses.agility += item.stats.agility;
        if (item.stats.resilience) bonuses.resilience += item.stats.resilience;
      }
      if (item.bonusAttack) bonuses.bonus_attack += item.bonusAttack;
      if (item.bonusArmor) bonuses.bonus_armor += item.bonusArmor;
      if (item.bonusMagicPower) bonuses.bonus_magic_power += item.bonusMagicPower;
      if (item.bonusCrit) bonuses.bonus_crit += item.bonusCrit;
    });

    return bonuses;
  };

  // Handle Character Creation Complete
  const handleCreateCharacter = async (data: {
    name: string;
    title: string;
    characterClass: CharacterClass;
    attributes: AttributeStats;
    customization: VisualCustomization;
  }) => {
    const classDef = CLASS_DEFINITIONS[data.characterClass];
    const startingSkills = CLASS_SKILLS[data.characterClass] || [];

    // Starter Equipment
    const equipment: Equipment = {
      weapon:
        data.characterClass === 'pyromancer'
          ? STARTER_ITEMS.apprentice_staff
          : data.characterClass === 'vanguard'
          ? STARTER_ITEMS.iron_broadsword
          : data.characterClass === 'shadowblade'
          ? STARTER_ITEMS.shadow_stiletto
          : STARTER_ITEMS.cleric_scepter,
      offhand: STARTER_ITEMS.wooden_buckler,
      armor: STARTER_ITEMS.leather_tunic,
      helm: null,
      amulet: null,
      ring: null,
    };

    const gearBonuses = getGearBonuses(equipment);
    const initialComputedStats = await pythonEngine.computeStats(
      data.characterClass,
      data.attributes,
      gearBonuses,
      1
    );

    const newHero: PlayerCharacter = {
      id: `hero_${Date.now()}`,
      name: data.name,
      title: data.title,
      characterClass: data.characterClass,
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      gold: 50,
      unspentAttributePoints: 0,
      unspentTalentPoints: 1,
      attributes: data.attributes,
      computedStats: initialComputedStats,
      equipment,
      inventory: [
        STARTER_ITEMS.starter_potion,
        STARTER_ITEMS.starter_armor,
        STARTER_ITEMS.starter_shield,
      ].filter((item): item is Item => !!item && !!item.id),
      skills: startingSkills,
      unlockedTalentIds: [],
      customization: data.customization,
      customPythonScript: classDef.startingScript,
      scriptEnabled: true,
    };

    savePlayerState(newHero);
    setActiveTab('character');
  };

  // Recalculate stats helper
  const recomputeHeroStats = async (
    charClass: CharacterClass,
    attrs: AttributeStats,
    equip: Equipment,
    level: number,
    prevComputed: ComputedStats
  ): Promise<ComputedStats> => {
    const gearBonuses = getGearBonuses(equip);
    const newComputed = await pythonEngine.computeStats(charClass, attrs, gearBonuses, level);
    setPythonLatency(pythonEngine.getLastLatency() || 5);
    return {
      ...newComputed,
      currentHp: Math.min(newComputed.maxHp, prevComputed.currentHp || newComputed.maxHp),
      currentMana: Math.min(newComputed.maxMana, prevComputed.currentMana || newComputed.maxMana),
    };
  };

  // Attribute Point Spending
  const handleUpdateAttributes = async (newAttrs: AttributeStats, remainingPoints: number) => {
    if (!player) return;
    const computed = await recomputeHeroStats(
      player.characterClass,
      newAttrs,
      player.equipment,
      player.level,
      player.computedStats
    );

    const updated = {
      ...player,
      attributes: newAttrs,
      unspentAttributePoints: remainingPoints,
      computedStats: computed,
    };
    savePlayerState(updated);
  };

  // Free Attribute Respec
  const handleRespecAttributes = async () => {
    if (!player) return;
    const classDef = CLASS_DEFINITIONS[player.characterClass];
    const totalPointsGained = (player.level - 1) * 3 + 6; // level ups + starting bonus pool

    const resetAttrs: AttributeStats = { ...classDef.baseAttributes };
    const computed = await recomputeHeroStats(
      player.characterClass,
      resetAttrs,
      player.equipment,
      player.level,
      player.computedStats
    );

    const updated: PlayerCharacter = {
      ...player,
      attributes: resetAttrs,
      unspentAttributePoints: totalPointsGained,
      computedStats: computed,
    };
    savePlayerState(updated);
  };

  // Equip Item
  const handleEquipItem = async (item: Item, slot: keyof Equipment) => {
    if (!player) return;
    const previousEquipped = player.equipment[slot];
    const newEquip: Equipment = {
      ...player.equipment,
      [slot]: item,
    };

    // Remove from inventory, add old item if existed
    let newInventory = (player.inventory || []).filter((i) => i && i.id && i.id !== item.id);
    if (previousEquipped && previousEquipped.id) {
      newInventory.push(previousEquipped);
    }

    const computed = await recomputeHeroStats(
      player.characterClass,
      player.attributes,
      newEquip,
      player.level,
      player.computedStats
    );

    const updated: PlayerCharacter = {
      ...player,
      equipment: newEquip,
      inventory: newInventory,
      computedStats: computed,
    };
    savePlayerState(updated);
  };

  // Unequip Item
  const handleUnequipItem = async (slot: keyof Equipment) => {
    if (!player) return;
    const item = player.equipment[slot];
    if (!item) return;

    const newEquip = {
      ...player.equipment,
      [slot]: null,
    };
    const newInventory = (player.inventory || []).filter((i): i is Item => !!i && !!i.id);
    if (item && item.id) {
      newInventory.push(item);
    }

    const computed = await recomputeHeroStats(
      player.characterClass,
      player.attributes,
      newEquip,
      player.level,
      player.computedStats
    );

    const updated: PlayerCharacter = {
      ...player,
      equipment: newEquip,
      inventory: newInventory,
      computedStats: computed,
    };
    savePlayerState(updated);
  };

  // Use Consumable (Potion)
  const handleUseItem = (item: Item) => {
    if (!player || item.type !== 'potion') return;
    let newHp = player.computedStats.currentHp;
    let newMana = player.computedStats.currentMana;

    if (item.healAmount) {
      newHp = Math.min(player.computedStats.maxHp, newHp + item.healAmount);
    }
    if (item.manaAmount) {
      newMana = Math.min(player.computedStats.maxMana, newMana + item.manaAmount);
    }

    const newInventory = (player.inventory || []).filter((i) => i && i.id && i.id !== item.id);
    const updated: PlayerCharacter = {
      ...player,
      inventory: newInventory,
      computedStats: {
        ...player.computedStats,
        currentHp: newHp,
        currentMana: newMana,
      },
    };
    savePlayerState(updated);
  };

  // Buy Item from Blacksmith
  const handleBuyItem = (item: Item) => {
    if (!player || player.gold < item.value) return;
    const validInv = (player.inventory || []).filter((i): i is Item => !!i && !!i.id);
    const updated: PlayerCharacter = {
      ...player,
      gold: player.gold - item.value,
      inventory: [...validInv, { ...item, id: `${item.id}_${Date.now()}` }],
    };
    savePlayerState(updated);
  };

  // Unlock Talent
  const handleUnlockTalent = async (talent: TalentNode) => {
    if (!player || player.unspentTalentPoints < talent.cost) return;

    let updatedAttrs = { ...player.attributes };
    if (talent.statBonus) {
      if (talent.statBonus.might) updatedAttrs.might += talent.statBonus.might;
      if (talent.statBonus.intellect) updatedAttrs.intellect += talent.statBonus.intellect;
      if (talent.statBonus.vigor) updatedAttrs.vigor += talent.statBonus.vigor;
      if (talent.statBonus.agility) updatedAttrs.agility += talent.statBonus.agility;
      if (talent.statBonus.resilience) updatedAttrs.resilience += talent.statBonus.resilience;
    }

    const computed = await recomputeHeroStats(
      player.characterClass,
      updatedAttrs,
      player.equipment,
      player.level,
      player.computedStats
    );

    const updated: PlayerCharacter = {
      ...player,
      attributes: updatedAttrs,
      unspentTalentPoints: player.unspentTalentPoints - talent.cost,
      unlockedTalentIds: [...player.unlockedTalentIds, talent.id],
      computedStats: computed,
    };
    savePlayerState(updated);
  };

  // Reset Talents
  const handleResetTalents = async () => {
    if (!player) return;
    const totalTalentsRefund = Math.floor(player.level / 2) + 1;
    const updated: PlayerCharacter = {
      ...player,
      unlockedTalentIds: [],
      unspentTalentPoints: totalTalentsRefund,
    };
    savePlayerState(updated);
  };

  // Update Python Script / Gambit
  const handleUpdateScript = (script: string, enabled: boolean) => {
    if (!player) return;
    const updated: PlayerCharacter = {
      ...player,
      customPythonScript: script,
      scriptEnabled: enabled,
    };
    savePlayerState(updated);
  };

  // Synchronize HP and Mana from Combat
  const handleUpdateHpMana = (hp: number, mana: number) => {
    if (!player) return;
    if (player.computedStats.currentHp !== hp || player.computedStats.currentMana !== mana) {
      setPlayer((prev) =>
        prev
          ? {
              ...prev,
              computedStats: {
                ...prev.computedStats,
                currentHp: hp,
                currentMana: mana,
              },
            }
          : null
      );
    }
  };

  // Start Campaign Stage
  const handleSelectDungeonStage = (stage: DungeonStage) => {
    sfx.playAttack();
    setActiveCombatEncounter({ stage });
    setActiveTab('combat');
  };

  // Start Endless Arena Gauntlet
  const handleStartEndlessArena = () => {
    sfx.playSpell('fire');
    const scale = player ? player.level : 1;
    const endlessStage: DungeonStage = {
      id: `endless_wave_${Date.now()}`,
      name: `Endless Gauntlet: Iteration Layer ${scale}`,
      zone: 'Arena of Iterations',
      description: 'An infinite gauntlet where opponents scale proportionally with player level.',
      levelReq: scale,
      isCompleted: false,
      isBossStage: scale % 3 === 0,
      bgAtmosphere: 'crimson',
      enemies: [
        {
          id: `endless_e1_${Date.now()}`,
          name: `Recursive Automaton v${scale}.0`,
          level: scale,
          isBoss: scale % 3 === 0,
          maxHp: 90 + scale * 45,
          currentHp: 90 + scale * 45,
          maxMana: 50 + scale * 20,
          currentMana: 50 + scale * 20,
          physicalAttack: 14 + scale * 6,
          magicPower: 12 + scale * 6,
          armor: 10 + scale * 5,
          magicResist: 10 + scale * 5,
          speed: 12 + scale * 2,
          statusEffects: [],
          skills: [CLASS_SKILLS.vanguard[0]],
          portrait: scale % 3 === 0 ? 'daemon' : 'golem',
          goldReward: 40 + scale * 25,
          expReward: 60 + scale * 40,
          lootTable: [],
        },
      ],
    };

    setActiveCombatEncounter({ stage: endlessStage, isEndless: true, wave: scale });
    setActiveTab('combat');
  };

  // Combat Outcome Resolution (Victory / Defeat)
  const handleCombatEnd = async (
    victory: boolean,
    expGained: number,
    goldGained: number,
    lootedItems: Item[]
  ) => {
    if (!player) return;

    if (!victory) {
      // Defeat: Restore 50% HP and return to Sanctuary
      const healedHp = Math.max(1, Math.floor(player.computedStats.maxHp * 0.5));
      const updated: PlayerCharacter = {
        ...player,
        computedStats: {
          ...player.computedStats,
          currentHp: healedHp,
          currentMana: player.computedStats.maxMana,
        },
      };
      savePlayerState(updated);
      setActiveCombatEncounter(null);
      setActiveTab('character');
      return;
    }

    // Victory: Grant EXP, Gold, and Loot
    let newExp = player.exp + expGained;
    let newLevel = player.level;
    let newExpToNext = player.expToNextLevel;
    let newUnspentAttr = player.unspentAttributePoints;
    let newUnspentTalents = player.unspentTalentPoints;

    // Check level up
    while (newExp >= newExpToNext) {
      newExp -= newExpToNext;
      newLevel += 1;
      newExpToNext = Math.floor(newExpToNext * 1.5);
      newUnspentAttr += 3; // +3 stat points per level
      if (newLevel % 2 === 0) {
        newUnspentTalents += 1; // +1 talent point every 2 levels
      }
      sfx.playLevelUp();
    }

    const computed = await recomputeHeroStats(
      player.characterClass,
      player.attributes,
      player.equipment,
      newLevel,
      player.computedStats
    );

    const updated: PlayerCharacter = {
      ...player,
      level: newLevel,
      exp: newExp,
      expToNextLevel: newExpToNext,
      gold: player.gold + goldGained,
      unspentAttributePoints: newUnspentAttr,
      unspentTalentPoints: newUnspentTalents,
      inventory: [
        ...(player.inventory || []).filter((i): i is Item => !!i && !!i.id),
        ...(lootedItems || []).filter((i): i is Item => !!i && !!i.id),
      ],
      computedStats: {
        ...computed,
        currentHp: computed.maxHp, // fully heal on victory
        currentMana: computed.maxMana,
      },
    };

    savePlayerState(updated);
    setActiveCombatEncounter(null);
    setActiveTab('character');
  };

  // Character Re-Creation / Reset
  const handleResetCharacter = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPlayer(null);
    setActiveCombatEncounter(null);
    setActiveTab('character');
  };

  // If no character, show Character Creation
  if (!player) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
        <header className="border-b border-slate-800 bg-slate-950/80 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center font-mono font-bold text-amber-200">
                Py
              </span>
              <h1 className="font-serif font-black text-slate-100 text-lg tracking-wider">
                PYTHRONE RPG
              </h1>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Python 3.12 WebAssembly Engine
            </span>
          </div>
        </header>

        <main className="flex-1 flex items-center">
          <CharacterCreation onComplete={handleCreateCharacter} />
        </main>

        <footer className="border-t border-slate-900 py-3 text-center text-xs text-slate-500 font-mono">
          PyThrone · Tactical Turn-Based RPG Powered by Python 3 & WebAssembly
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Application Navbar */}
      <Navbar
        player={player}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPythonReady={isPythonReady}
        pythonLatency={pythonLatency}
        inCombat={!!activeCombatEncounter}
        onResetCharacter={handleResetCharacter}
      />

      {/* Main Mode View */}
      <main className="flex-1 pb-10">
        {activeTab === 'character' && (
          <CharacterSheet
            player={player}
            onUpdateAttributes={handleUpdateAttributes}
            onEquipItem={handleEquipItem}
            onUnequipItem={handleUnequipItem}
            onUseItem={handleUseItem}
            onBuyItem={handleBuyItem}
            onRespec={handleRespecAttributes}
          />
        )}

        {activeTab === 'talents' && (
          <TalentTree
            player={player}
            onUnlockTalent={handleUnlockTalent}
            onResetTalents={handleResetTalents}
          />
        )}

        {activeTab === 'dungeon' && (
          <DungeonMap
            player={player}
            onSelectStage={handleSelectDungeonStage}
            onStartEndlessArena={handleStartEndlessArena}
          />
        )}

        {activeTab === 'combat' && (
          <div>
            {activeCombatEncounter ? (
              <CombatArena
                player={player}
                enemies={activeCombatEncounter.stage.enemies}
                onCombatEnd={handleCombatEnd}
                onUpdatePlayerHpMana={handleUpdateHpMana}
                onUseConsumable={handleUseItem}
              />
            ) : (
              <div className="max-w-md mx-auto my-16 p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <div className="text-4xl">⚔️</div>
                <h3 className="font-serif font-bold text-xl text-slate-100">
                  No Active Combat Encounter
                </h3>
                <p className="text-xs text-slate-400">
                  Select an expedition in the World Atlas or test your build in the Endless Arena.
                </p>
                <button
                  onClick={() => setActiveTab('dungeon')}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-serif font-bold text-xs shadow transition-all hover:scale-105"
                >
                  Go to Expeditions Map
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'python_studio' && (
          <PythonStudio
            player={player}
            onUpdateScript={handleUpdateScript}
            isPythonReady={isPythonReady}
            pythonLatency={pythonLatency}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 py-3 bg-slate-950/80 text-xs text-slate-500 font-mono text-center">
        PyThrone RPG · Python 3.12 Engine · WebAssembly & Web Audio
      </footer>
    </div>
  );
}
