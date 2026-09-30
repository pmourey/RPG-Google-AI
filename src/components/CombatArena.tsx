import React, { useState, useEffect, useRef } from 'react';
import { CombatLogEntry, DamageType, Enemy, Item, PlayerCharacter, Skill, StatusEffect } from '../types/rpg';
import { CharacterAvatar, EnemyAvatar } from '../data/portraits';
import { pythonEngine } from '../python/pyodideRunner';
import { sfx } from '../audio/soundEffects';
import confetti from 'canvas-confetti';
import { Swords, Shield, Heart, Zap, Terminal, Sparkles, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

interface CombatArenaProps {
  player: PlayerCharacter;
  enemies: Enemy[];
  onCombatEnd: (victory: boolean, expGained: number, goldGained: number, lootedItems: Item[]) => void;
  onUpdatePlayerHpMana: (hp: number, mana: number) => void;
  onUseConsumable: (item: Item) => void;
}

interface FloatingText {
  id: string;
  targetId: string;
  text: string;
  type: 'damage' | 'crit' | 'heal' | 'dodge' | 'status';
}

export const CombatArena: React.FC<CombatArenaProps> = ({
  player,
  enemies: initialEnemies,
  onCombatEnd,
  onUpdatePlayerHpMana,
  onUseConsumable,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [playerHp, setPlayerHp] = useState(player.computedStats.currentHp);
  const [playerMana, setPlayerMana] = useState(player.computedStats.currentMana);
  const [playerAp, setPlayerAp] = useState(player.computedStats.maxAp);
  const [isGuarding, setIsGuarding] = useState(false);
  const [playerStatuses, setPlayerStatuses] = useState<StatusEffect[]>([]);

  // Enemy States
  const [enemies, setEnemies] = useState<Enemy[]>(() =>
    initialEnemies.map((e) => ({ ...e, currentHp: e.maxHp, currentMana: e.maxMana, statusEffects: [] }))
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    initialEnemies[0]?.id || ''
  );

  // Turn Management
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [combatFinished, setCombatFinished] = useState<'victory' | 'defeat' | null>(null);

  // FX & Logs
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([
    {
      id: 'init_1',
      round: 1,
      source: 'system',
      sourceName: 'System',
      text: 'Combat initiated! Python WebAssembly battle rules engaged.',
      timestamp: '00:00',
    },
  ]);
  const [logViewMode, setLogViewMode] = useState<'narrative' | 'python_trace'>('narrative');
  const [screenShake, setScreenShake] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [combatLogs]);

  // Keep parent in sync with HP/Mana
  useEffect(() => {
    onUpdatePlayerHpMana(playerHp, playerMana);
  }, [playerHp, playerMana]);

  const addLog = (entry: Omit<CombatLogEntry, 'id' | 'timestamp'>) => {
    setCombatLogs((prev) => [
      ...prev,
      {
        ...entry,
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString().slice(3, 8),
      },
    ]);
  };

  const spawnFloatingText = (targetId: string, text: string, type: FloatingText['type']) => {
    const id = `float_${Date.now()}_${Math.random()}`;
    setFloatingTexts((prev) => [...prev, { id, targetId, text, type }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1400);
  };

  const triggerScreenShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);
  };

  // Find currently targeted enemy
  const selectedEnemy = enemies.find((e) => e.id === selectedTargetId) || enemies.find((e) => e.currentHp > 0);

  // Check victory / defeat conditions
  const checkCombatEnd = (currentEnemies: Enemy[], currentHeroHp: number) => {
    if (currentHeroHp <= 0) {
      sfx.playDefeat();
      setCombatFinished('defeat');
      addLog({
        round: currentRound,
        source: 'system',
        sourceName: 'System',
        text: `${player.name} has fallen in battle!`,
      });
      return true;
    }

    const aliveEnemies = currentEnemies.filter((e) => e.currentHp > 0);
    if (aliveEnemies.length === 0) {
      sfx.playLevelUp();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setCombatFinished('victory');

      const totalExp = currentEnemies.reduce((a, b) => a + b.expReward, 0);
      const totalGold = currentEnemies.reduce((a, b) => a + b.goldReward, 0);
      const allLoot = currentEnemies.flatMap((e) => e.lootTable);

      addLog({
        round: currentRound,
        source: 'system',
        sourceName: 'System',
        text: `VICTORY! All enemies vanquished. Earned +${totalExp} EXP and +${totalGold} Gold.`,
      });

      return true;
    }
    return false;
  };

  // ===============================
  // Player Combat Actions
  // ===============================

  const handlePlayerAttack = async () => {
    if (!isPlayerTurn || isProcessingAction || playerAp < 1 || !selectedEnemy) return;
    setIsProcessingAction(true);
    setPlayerAp((prev) => prev - 1);

    sfx.playAttack();

    const basicAttackSkill: Skill = {
      id: 'basic_attack',
      name: 'Standard Strike',
      className: player.characterClass,
      tier: 1,
      levelReq: 1,
      manaCost: 0,
      apCost: 1,
      cooldown: 0,
      currentCooldown: 0,
      damageType: 'physical',
      basePowerMultiplier: 1.0,
      targetType: 'single_enemy',
      description: 'Physical weapon strike.',
      icon: 'swords',
    };

    const result = await pythonEngine.executeCombatAction(
      player.computedStats,
      selectedEnemy,
      basicAttackSkill
    );

    if (result.isDodged) {
      spawnFloatingText(selectedEnemy.id, 'DODGED!', 'dodge');
      addLog({
        round: currentRound,
        source: 'player',
        sourceName: player.name,
        text: `${player.name}'s attack was dodged by ${selectedEnemy.name}!`,
        pythonFormula: result.formula,
      });
    } else {
      if (result.isCrit) {
        sfx.playCrit();
        triggerScreenShake();
        spawnFloatingText(selectedEnemy.id, `${result.damage} CRIT!`, 'crit');
      } else {
        spawnFloatingText(selectedEnemy.id, `-${result.damage}`, 'damage');
      }

      addLog({
        round: currentRound,
        source: 'player',
        sourceName: player.name,
        text: `${player.name} strikes ${selectedEnemy.name} for ${result.damage} damage!`,
        damage: result.damage,
        isCrit: result.isCrit,
        pythonFormula: result.formula,
      });

      const updatedEnemies = enemies.map((e) =>
        e.id === selectedEnemy.id ? { ...e, currentHp: Math.max(0, e.currentHp - result.damage) } : e
      );
      setEnemies(updatedEnemies);

      // Auto-target next alive enemy if current died
      if (selectedEnemy.currentHp - result.damage <= 0) {
        const nextAlive = updatedEnemies.find((e) => e.currentHp > 0);
        if (nextAlive) setSelectedTargetId(nextAlive.id);
      }

      if (checkCombatEnd(updatedEnemies, playerHp)) {
        setIsProcessingAction(false);
        return;
      }
    }

    setIsProcessingAction(false);
  };

  const handlePlayerCastSkill = async (skill: Skill) => {
    if (!isPlayerTurn || isProcessingAction) return;
    if (playerAp < skill.apCost) {
      alert(`Not enough Action Points (requires ${skill.apCost} AP).`);
      return;
    }
    if (playerMana < skill.manaCost) {
      alert(`Not enough Mana (requires ${skill.manaCost} MP).`);
      return;
    }

    setIsProcessingAction(true);
    setPlayerAp((prev) => prev - skill.apCost);
    setPlayerMana((prev) => prev - skill.manaCost);

    sfx.playSpell(skill.damageType);

    if (skill.isHealing) {
      // Healing ability
      sfx.playHeal();
      const result = await pythonEngine.executeCombatAction(
        player.computedStats,
        player.computedStats,
        skill
      );

      const healedHp = Math.min(player.computedStats.maxHp, playerHp + result.heal);
      setPlayerHp(healedHp);
      spawnFloatingText('player', `+${result.heal}`, 'heal');

      if (skill.statusInflicted) {
        setPlayerStatuses((prev) => [...prev, { ...skill.statusInflicted!, id: `stat_${Date.now()}` }]);
      }

      addLog({
        round: currentRound,
        source: 'player',
        sourceName: player.name,
        text: `${player.name} casts ${skill.name}, restoring +${result.heal} HP!`,
        heal: result.heal,
        pythonFormula: result.formula,
      });

      setIsProcessingAction(false);
      return;
    }

    // Offensive Spell
    if (!selectedEnemy) {
      setIsProcessingAction(false);
      return;
    }

    const result = await pythonEngine.executeCombatAction(
      player.computedStats,
      selectedEnemy,
      skill
    );

    if (result.isDodged) {
      spawnFloatingText(selectedEnemy.id, 'EVADED!', 'dodge');
      addLog({
        round: currentRound,
        source: 'player',
        sourceName: player.name,
        text: `${selectedEnemy.name} evades ${player.name}'s ${skill.name}!`,
        pythonFormula: result.formula,
      });
    } else {
      if (result.isCrit) {
        sfx.playCrit();
        triggerScreenShake();
        spawnFloatingText(selectedEnemy.id, `${result.damage} CRIT!`, 'crit');
      } else {
        spawnFloatingText(selectedEnemy.id, `-${result.damage}`, 'damage');
      }

      // Apply status effect if any
      let updatedEnemies = enemies.map((e) => {
        if (e.id === selectedEnemy.id) {
          const newHp = Math.max(0, e.currentHp - result.damage);
          const newStatuses = [...e.statusEffects];
          if (skill.statusInflicted && newHp > 0) {
            newStatuses.push({ ...skill.statusInflicted, id: `stat_${Date.now()}` });
          }
          return { ...e, currentHp: newHp, statusEffects: newStatuses };
        }
        return e;
      });

      setEnemies(updatedEnemies);

      addLog({
        round: currentRound,
        source: 'player',
        sourceName: player.name,
        text: `${player.name} unleashes ${skill.name} on ${selectedEnemy.name} for ${result.damage} [${skill.damageType}] damage!`,
        damage: result.damage,
        isCrit: result.isCrit,
        damageType: skill.damageType,
        pythonFormula: result.formula,
      });

      if (checkCombatEnd(updatedEnemies, playerHp)) {
        setIsProcessingAction(false);
        return;
      }
    }

    setIsProcessingAction(false);
  };

  const handlePlayerGuard = () => {
    if (!isPlayerTurn || isProcessingAction || playerAp < 1) return;
    sfx.playClick();
    setPlayerAp((prev) => prev - 1);
    setIsGuarding(true);
    spawnFloatingText('player', 'GUARDING', 'status');

    addLog({
      round: currentRound,
      source: 'player',
      sourceName: player.name,
      text: `${player.name} assumes a defensive posture (+50% Armor & 25% Damage Reflection).`,
      pythonFormula: 'def_boost = armor * 1.5; mit = 0.50',
    });
  };

  const handleExecuteGambit = async () => {
    if (!isPlayerTurn || isProcessingAction) return;
    setIsProcessingAction(true);

    sfx.playSpell('holy');
    const result = await pythonEngine.executeGambit(
      player.customPythonScript,
      player,
      enemies,
      currentRound
    );

    addLog({
      round: currentRound,
      source: 'python',
      sourceName: 'Python Gambit',
      text: `Tactical Script Executed: ${result.log}`,
    });

    if (result.success && result.action) {
      const act = result.action;
      if (act.action === 'guard') {
        handlePlayerGuard();
      } else if (act.action === 'skill') {
        const sk = player.skills.find((s) => s.id === act.skill_id) || player.skills[0];
        if (sk) await handlePlayerCastSkill(sk);
      } else {
        await handlePlayerAttack();
      }
    } else {
      await handlePlayerAttack();
    }

    setIsProcessingAction(false);
  };

  // End Player Turn -> Trigger Enemy Phase
  const handleEndTurn = async () => {
    if (!isPlayerTurn || isProcessingAction) return;
    setIsPlayerTurn(false);
    setIsProcessingAction(true);

    addLog({
      round: currentRound,
      source: 'system',
      sourceName: 'System',
      text: `--- End of Player Turn. Initiating Enemy AI Phase ---`,
    });

    // Process Enemy Turns sequentially
    let heroHpTracker = playerHp;

    for (const enemy of enemies) {
      if (enemy.currentHp <= 0) continue;

      // Small delay between enemy actions for tactical clarity
      await new Promise((resolve) => setTimeout(resolve, 800));

      const enemySkill = enemy.skills[0] || {
        id: 'enemy_atk',
        name: 'Savage Strike',
        className: 'vanguard',
        tier: 1,
        levelReq: 1,
        manaCost: 0,
        apCost: 1,
        cooldown: 0,
        currentCooldown: 0,
        damageType: 'physical',
        basePowerMultiplier: 1.0,
        targetType: 'single_enemy',
        description: 'Attack',
        icon: 'swords',
      };

      const enemyAction = await pythonEngine.executeCombatAction(
        enemy,
        {
          armor: isGuarding ? player.computedStats.armor * 1.5 : player.computedStats.armor,
          magicResist: player.computedStats.magicResist,
          dodgeChance: player.computedStats.dodgeChance,
        },
        enemySkill
      );

      if (enemyAction.isDodged) {
        spawnFloatingText('player', 'DODGED!', 'dodge');
        addLog({
          round: currentRound,
          source: 'enemy',
          sourceName: enemy.name,
          text: `${player.name} gracefully evaded ${enemy.name}'s attack!`,
          pythonFormula: enemyAction.formula,
        });
      } else {
        const finalEnemyDmg = isGuarding ? Math.floor(enemyAction.damage * 0.5) : enemyAction.damage;
        heroHpTracker = Math.max(0, heroHpTracker - finalEnemyDmg);
        setPlayerHp(heroHpTracker);

        sfx.playAttack();
        if (enemyAction.isCrit) {
          triggerScreenShake();
          spawnFloatingText('player', `-${finalEnemyDmg} CRIT!`, 'crit');
        } else {
          spawnFloatingText('player', `-${finalEnemyDmg}`, 'damage');
        }

        addLog({
          round: currentRound,
          source: 'enemy',
          sourceName: enemy.name,
          text: `${enemy.name} attacks ${player.name} with ${enemySkill.name} for ${finalEnemyDmg} damage!`,
          damage: finalEnemyDmg,
          isCrit: enemyAction.isCrit,
          pythonFormula: enemyAction.formula,
        });

        if (heroHpTracker <= 0) {
          checkCombatEnd(enemies, heroHpTracker);
          setIsProcessingAction(false);
          return;
        }
      }
    }

    // End of Round: Regen & AP reset
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Tick Status Effects (e.g. burn/poison)
    const tickedEnemies = enemies.map((e) => {
      let dmg = 0;
      const remStatuses = e.statusEffects
        .map((s) => {
          dmg += s.value;
          return { ...s, duration: s.duration - 1 };
        })
        .filter((s) => s.duration > 0);

      if (dmg > 0 && e.currentHp > 0) {
        spawnFloatingText(e.id, `-${dmg} DoT`, 'status');
        addLog({
          round: currentRound,
          source: 'system',
          sourceName: 'Status Effect',
          text: `${e.name} suffers ${dmg} damage from status ailments!`,
        });
      }

      return {
        ...e,
        currentHp: Math.max(0, e.currentHp - dmg),
        statusEffects: remStatuses,
      };
    });

    setEnemies(tickedEnemies);

    // Regenerate Player HP & Mana
    const regeneratedHp = Math.min(player.computedStats.maxHp, heroHpTracker + player.computedStats.hpRegen);
    const regeneratedMana = Math.min(player.computedStats.maxMana, playerMana + player.computedStats.manaRegen);

    setPlayerHp(regeneratedHp);
    setPlayerMana(regeneratedMana);
    setPlayerAp(player.computedStats.maxAp);
    setIsGuarding(false);
    setCurrentRound((prev) => prev + 1);
    setIsPlayerTurn(true);
    setIsProcessingAction(false);

    checkCombatEnd(tickedEnemies, regeneratedHp);
  };

  const handleClaimVictory = () => {
    const totalExp = enemies.reduce((a, b) => a + b.expReward, 0);
    const totalGold = enemies.reduce((a, b) => a + b.goldReward, 0);
    const allLoot = enemies.flatMap((e) => e.lootTable);
    onCombatEnd(true, totalExp, totalGold, allLoot);
  };

  const handleRetreatDefeat = () => {
    onCombatEnd(false, 0, 0, []);
  };

  return (
    <div
      className={`max-w-6xl mx-auto px-4 py-6 space-y-6 transition-all ${
        screenShake ? 'animate-shake' : ''
      }`}
    >
      {/* Top Bar: Turn Queue & Round Counter */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/70 border border-amber-800/40 px-3 py-1 rounded-lg">
            ROUND {currentRound}
          </span>
          <span className="text-xs text-slate-400">
            {isPlayerTurn ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Player Action Phase
              </span>
            ) : (
              <span className="text-red-400 font-bold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Enemy Turn Phase
              </span>
            )}
          </span>
        </div>

        {/* Turn Queue Icons */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Initiative:</span>
          {/* Hero */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
              isPlayerTurn
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <span>🛡️</span>
            <span>{player.name}</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

          {/* Enemies in queue */}
          {enemies.map((e) => (
            <div
              key={e.id}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${
                e.currentHp <= 0
                  ? 'opacity-30 line-through bg-slate-950 border-slate-900 text-slate-600'
                  : !isPlayerTurn
                  ? 'bg-red-950/40 border-red-500 text-red-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>{e.isBoss ? '💀' : '👾'}</span>
              <span className="truncate max-w-[80px]">{e.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Battle Stage: Player Hero (Left) vs Enemies (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Player Card (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm">
          {/* Floating Damage Text Container */}
          <div className="absolute top-2 right-4 flex flex-col items-end gap-1 pointer-events-none z-30">
            {floatingTexts
              .filter((f) => f.targetId === 'player')
              .map((f) => (
                <span
                  key={f.id}
                  className={`font-mono font-black text-lg animate-bounce drop-shadow-md ${
                    f.type === 'heal'
                      ? 'text-emerald-400'
                      : f.type === 'crit'
                      ? 'text-yellow-400 text-xl'
                      : f.type === 'dodge'
                      ? 'text-cyan-300'
                      : 'text-red-400'
                  }`}
                >
                  {f.text}
                </span>
              ))}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <CharacterAvatar
              portraitId={player.customization.avatarId}
              auraColor={player.customization.auraColor}
              trimColor={player.customization.trimColor}
              crestSymbol={player.customization.crestSymbol}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-slate-100">{player.name}</h3>
                {isGuarding && (
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                    GUARD
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-amber-400">{player.title}</p>
              <div className="text-[11px] text-slate-400 capitalize mt-0.5">
                {player.characterClass} · Lvl {player.level}
              </div>
            </div>
          </div>

          {/* Health & Mana Meters */}
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-red-400 font-bold">
                  <Heart className="w-3.5 h-3.5 fill-current" /> HP
                </span>
                <span>
                  {playerHp} / {player.computedStats.maxHp}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, (playerHp / player.computedStats.maxHp) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-blue-400 font-bold">
                  <Zap className="w-3.5 h-3.5 fill-current" /> MP
                </span>
                <span>
                  {playerMana} / {player.computedStats.maxMana}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.max(0, (playerMana / player.computedStats.maxMana) * 100)}%` }}
                />
              </div>
            </div>

            {/* Action Points AP */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Action Points:</span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: player.computedStats.maxAp }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-[10px] ${
                      idx < playerAp
                        ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-sm shadow-amber-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-700'
                    }`}
                  >
                    ★
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Enemies Encounter Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Select Target to Attack:</span>
            <span className="text-amber-400">Target locked on: {selectedEnemy?.name || 'None'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {enemies.map((enemy) => {
              const isDead = enemy.currentHp <= 0;
              const isSelected = selectedTargetId === enemy.id;
              const hpPercent = Math.max(0, Math.round((enemy.currentHp / enemy.maxHp) * 100));

              return (
                <div
                  key={enemy.id}
                  onClick={() => !isDead && setSelectedTargetId(enemy.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isDead
                      ? 'bg-slate-950/40 border-slate-900 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-slate-900 border-amber-400 shadow-md shadow-amber-950/40 scale-[1.02]'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Floating Damage Text for Enemy */}
                  <div className="absolute top-2 right-3 flex flex-col items-end gap-1 pointer-events-none z-30">
                    {floatingTexts
                      .filter((f) => f.targetId === enemy.id)
                      .map((f) => (
                        <span
                          key={f.id}
                          className={`font-mono font-black text-lg animate-bounce drop-shadow-md ${
                            f.type === 'crit' ? 'text-yellow-300 text-xl' : 'text-red-400'
                          }`}
                        >
                          {f.text}
                        </span>
                      ))}
                  </div>

                  <div className="flex items-start gap-3">
                    <EnemyAvatar portrait={enemy.portrait} isBoss={enemy.isBoss} size="md" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif font-bold text-sm text-slate-100 truncate">
                          {enemy.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">Lvl {enemy.level}</span>
                      </div>

                      {/* HP Bar */}
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                          <span>HP</span>
                          <span className={isDead ? 'text-slate-600' : 'text-slate-200'}>
                            {enemy.currentHp} / {enemy.maxHp}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              enemy.isBoss
                                ? 'bg-gradient-to-r from-red-600 to-purple-600'
                                : 'bg-gradient-to-r from-red-500 to-orange-400'
                            }`}
                            style={{ width: `${hpPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Intent Telegraph */}
                      {enemy.intent && !isDead && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900/60">
                          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span className="truncate">Intent: {enemy.intent.actionName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Combat Controls & Action Deck */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <h3 className="font-serif font-bold text-sm text-slate-100">
              Command Matrix
            </h3>
            <span className="text-xs text-slate-500">· Choose action to execute via Python engine</span>
          </div>

          {/* Quick Python Gambit Trigger */}
          <button
            disabled={!isPlayerTurn || isProcessingAction}
            onClick={handleExecuteGambit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600/50 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-mono text-xs transition-all disabled:opacity-40"
            title="Execute your custom Python script gambit"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Run Python Gambit Script</span>
          </button>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {/* Basic Strike */}
          <button
            disabled={!isPlayerTurn || isProcessingAction || playerAp < 1}
            onClick={handlePlayerAttack}
            className="p-3 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-amber-400/70 text-left transition-all disabled:opacity-40 flex flex-col justify-between min-h-[90px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs text-slate-100">Strike</span>
              <span className="text-[10px] font-mono text-amber-400">1 AP</span>
            </div>
            <div className="text-[10px] text-slate-400">Physical weapon attack</div>
            <div className="text-[10px] font-mono text-slate-500">0 MP</div>
          </button>

          {/* Guard */}
          <button
            disabled={!isPlayerTurn || isProcessingAction || playerAp < 1}
            onClick={handlePlayerGuard}
            className="p-3 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-cyan-400/70 text-left transition-all disabled:opacity-40 flex flex-col justify-between min-h-[90px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs text-cyan-300">Guard</span>
              <span className="text-[10px] font-mono text-amber-400">1 AP</span>
            </div>
            <div className="text-[10px] text-slate-400">+50% Defense & Reflect</div>
            <div className="text-[10px] font-mono text-slate-500">0 MP</div>
          </button>

          {/* Class Skills */}
          {player.skills.slice(0, 3).map((skill) => {
            const canCast = isPlayerTurn && !isProcessingAction && playerAp >= skill.apCost && playerMana >= skill.manaCost;
            return (
              <button
                key={skill.id}
                disabled={!canCast}
                onClick={() => handlePlayerCastSkill(skill)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[90px] ${
                  canCast
                    ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-amber-400'
                    : 'border-slate-900 bg-slate-950/50 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-xs text-amber-300 truncate">
                    {skill.name}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">{skill.apCost} AP</span>
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-2">{skill.description}</div>
                <div className="text-[10px] font-mono text-blue-400">{skill.manaCost} MP</div>
              </button>
            );
          })}

          {/* Pass Turn */}
          <button
            disabled={!isPlayerTurn || isProcessingAction}
            onClick={handleEndTurn}
            className="p-3 rounded-xl border border-red-900/60 bg-red-950/30 hover:bg-red-900/50 text-left transition-all disabled:opacity-40 flex flex-col justify-between min-h-[90px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs text-red-300">End Turn</span>
              <span className="text-[10px] font-mono text-slate-500">0 AP</span>
            </div>
            <div className="text-[10px] text-slate-400">Pass to enemy phase</div>
            <div className="text-[10px] font-mono text-emerald-400">Regen +2 AP</div>
          </button>
        </div>
      </div>

      {/* Combat Log Console with Python Trace */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200">Combat Engine Log</span>
          </div>

          {/* Mode Switcher: Narrative vs Python Trace */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setLogViewMode('narrative')}
              className={`px-2.5 py-0.5 rounded transition-all ${
                logViewMode === 'narrative'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Narrative Feed
            </button>
            <button
              onClick={() => setLogViewMode('python_trace')}
              className={`px-2.5 py-0.5 rounded transition-all ${
                logViewMode === 'python_trace'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python Formula Trace
            </button>
          </div>
        </div>

        <div className="p-4 max-h-[180px] overflow-y-auto space-y-1.5 leading-relaxed bg-slate-950">
          {combatLogs.map((entry) => (
            <div key={entry.id} className="text-slate-300 flex items-start gap-2">
              <span className="text-slate-600 select-none">[{entry.timestamp}]</span>
              <span
                className={`font-semibold select-none ${
                  entry.source === 'player'
                    ? 'text-amber-400'
                    : entry.source === 'enemy'
                    ? 'text-red-400'
                    : entry.source === 'python'
                    ? 'text-emerald-400'
                    : 'text-cyan-400'
                }`}
              >
                {entry.sourceName}:
              </span>

              {logViewMode === 'python_trace' && entry.pythonFormula ? (
                <span className="text-emerald-400 font-mono">
                  [PY-FORMULA] {entry.pythonFormula}
                </span>
              ) : (
                <span>{entry.text}</span>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Victory / Defeat Modal Overlay */}
      {combatFinished && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            {combatFinished === 'victory' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center mx-auto text-3xl">
                  🏆
                </div>
                <h3 className="text-2xl font-serif font-black text-amber-300">
                  VICTORY ACHIEVED!
                </h3>
                <p className="text-xs text-slate-300">
                  The rogue daemons have been cleansed. Combat formulas resolved successfully in Python.
                </p>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Experience Gained:</span>
                    <span className="text-emerald-400 font-bold">
                      +{enemies.reduce((a, b) => a + b.expReward, 0)} EXP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gold Plundered:</span>
                    <span className="text-amber-400 font-bold">
                      +{enemies.reduce((a, b) => a + b.goldReward, 0)} Gold
                    </span>
                  </div>
                  {enemies.flatMap((e) => e.lootTable).length > 0 && (
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Artifacts Discovered:</span>
                      <span className="text-purple-400 font-bold">
                        {enemies.flatMap((e) => e.lootTable).length} Relic(s)
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleClaimVictory}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-slate-950 font-serif font-bold text-sm shadow-lg transition-all hover:scale-105"
                >
                  Collect Spoils & Return
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto text-3xl">
                  💀
                </div>
                <h3 className="text-2xl font-serif font-black text-red-400">
                  DEFEAT IN BATTLE
                </h3>
                <p className="text-xs text-slate-300">
                  Your bodily matrix collapsed under lethal entropy. Retreat to the Sanctuary Forge to reallocate attributes, upgrade weapons, or refine your Python tactics.
                </p>

                <button
                  onClick={handleRetreatDefeat}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-serif font-bold text-sm transition-all"
                >
                  Retreat to Sanctuary
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
