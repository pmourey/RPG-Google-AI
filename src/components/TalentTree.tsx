import React from 'react';
import { PlayerCharacter } from '../types/rpg';
import { TALENT_TREES, TalentNode } from '../data/skills';
import { Sparkles, Check, Lock, Zap, Shield, Flame } from 'lucide-react';
import { sfx } from '../audio/soundEffects';

interface TalentTreeProps {
  player: PlayerCharacter;
  onUnlockTalent: (talent: TalentNode) => void;
  onResetTalents: () => void;
}

export const TalentTree: React.FC<TalentTreeProps> = ({
  player,
  onUnlockTalent,
  onResetTalents,
}) => {
  const talents = TALENT_TREES[player.characterClass] || [];

  const handleUnlock = (node: TalentNode) => {
    if (player.unspentTalentPoints < node.cost) return;
    if (node.requiresTalentId && !player.unlockedTalentIds.includes(node.requiresTalentId)) return;
    if (player.unlockedTalentIds.includes(node.id)) return;

    sfx.playSpell('holy');
    onUnlockTalent(node);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-800/40">
            Synaptic Matrix
          </span>
          <h2 className="text-2xl font-serif font-bold text-slate-100 mt-1">
            {player.characterClass.toUpperCase()} Talent Tree
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Channel algorithmic mastery to unlock powerful passives and enhance spell scaling.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-950 border border-amber-600/50 px-4 py-2 rounded-xl text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400">Available Points</div>
            <div className="text-xl font-mono font-bold text-amber-300">
              {player.unspentTalentPoints} TP
            </div>
          </div>

          <button
            onClick={() => {
              sfx.playClick();
              if (window.confirm('Reset all allocated talent points for free?')) {
                onResetTalents();
              }
            }}
            className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
          >
            Reset Talents
          </button>
        </div>
      </div>

      {/* Talent Matrix Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {talents.map((node) => {
          const isUnlocked = player.unlockedTalentIds.includes(node.id);
          const hasPrereq = !node.requiresTalentId || player.unlockedTalentIds.includes(node.requiresTalentId);
          const canAfford = player.unspentTalentPoints >= node.cost;
          const isAvailable = !isUnlocked && hasPrereq && canAfford;

          return (
            <div
              key={node.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden backdrop-blur-sm ${
                isUnlocked
                  ? 'bg-amber-950/30 border-amber-500 shadow-md shadow-amber-900/20'
                  : isAvailable
                  ? 'bg-slate-900/90 border-slate-700 hover:border-amber-400/80 shadow-sm'
                  : 'bg-slate-950/60 border-slate-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-slate-800 bg-slate-950 text-slate-400">
                    Tier {node.tier} · {node.branch}
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    {node.cost} TP
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      isUnlocked
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {isUnlocked ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : hasPrereq ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-slate-100">{node.name}</h4>
                    <span className="text-[10px] text-slate-400">
                      {isUnlocked ? 'Active Passive' : hasPrereq ? 'Ready to Learn' : 'Requires Prior Tier'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {node.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80">
                {isUnlocked ? (
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Unlocked & Applied</span>
                  </div>
                ) : (
                  <button
                    disabled={!isAvailable}
                    onClick={() => handleUnlock(node)}
                    className={`w-full py-2 rounded-xl text-xs font-bold font-serif transition-all ${
                      isAvailable
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {hasPrereq ? `Unlock Node (${node.cost} TP)` : 'Prerequisite Locked'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
