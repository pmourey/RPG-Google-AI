import React from 'react';
import { DungeonStage, PlayerCharacter } from '../types/rpg';
import { DUNGEON_STAGES } from '../data/dungeons';
import { EnemyAvatar } from '../data/portraits';
import { MapPin, Skull, Swords, Trophy, Sparkles, ChevronRight } from 'lucide-react';
import { sfx } from '../audio/soundEffects';

interface DungeonMapProps {
  player: PlayerCharacter;
  onSelectStage: (stage: DungeonStage) => void;
  onStartEndlessArena: () => void;
}

export const DungeonMap: React.FC<DungeonMapProps> = ({
  player,
  onSelectStage,
  onStartEndlessArena,
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="text-xs font-mono uppercase tracking-widest text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/40">
          World Atlas & Dungeons
        </span>
        <h2 className="text-3xl font-serif font-bold text-slate-100 mt-2">
          Expedition Campaign
        </h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto mt-1">
          Explore hostile biomes corrupted by rogue scripts. Slay fiends, loot ancient artifacts, and defeat legendary boss daemons.
        </p>
      </div>

      {/* Campaign Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DUNGEON_STAGES.map((stage, idx) => {
          const isUnlocked = player.level >= stage.levelReq;
          return (
            <div
              key={stage.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between backdrop-blur-sm ${
                stage.isBossStage
                  ? 'bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-red-950/30 border-red-900/60 hover:border-red-500/80 shadow-lg shadow-red-950/30'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              } ${!isUnlocked ? 'opacity-60' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-amber-400 font-semibold uppercase">
                      Stage {idx + 1} · {stage.zone}
                    </span>
                    {stage.isBossStage && (
                      <span className="text-[10px] font-mono uppercase bg-red-900/60 text-red-200 px-2 py-0.5 rounded border border-red-700">
                        Boss Stage
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Req. Lvl {stage.levelReq}
                  </span>
                </div>

                <h3 className="text-xl font-serif font-bold text-slate-100 mb-1">
                  {stage.name}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {stage.description}
                </p>

                {/* Encountered Foes Preview */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Target Entities:
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {stage.enemies.map((enemy) => (
                      <div
                        key={enemy.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                      >
                        <EnemyAvatar portrait={enemy.portrait} isBoss={enemy.isBoss} size="sm" />
                        <div>
                          <div className="font-serif font-bold text-slate-200 truncate max-w-[130px]">
                            {enemy.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Lvl {enemy.level} · {enemy.maxHp} HP
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Total Rewards: <span className="text-amber-300 font-mono font-bold">💰 {stage.enemies.reduce((a, b) => a + b.goldReward, 0)} Gold</span>
                </div>
                <button
                  disabled={!isUnlocked}
                  onClick={() => {
                    sfx.playClick();
                    onSelectStage(stage);
                  }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-serif font-bold transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-950/40 hover:scale-105 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Embark Expedition</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Endless Gauntlet / Infinite Arena Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-800/40 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-slate-100">
              Endless Arena of Iterations
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              Test your hero build and custom Python Gambits against an endless sequence of dynamically generated enemy waves that scale in power.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sfx.playClick();
            onStartEndlessArena();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-serif font-bold text-xs shadow-md transition-all hover:scale-105"
        >
          <span>Enter Endless Arena</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
