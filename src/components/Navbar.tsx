import React from 'react';
import { PlayerCharacter } from '../types/rpg';
import { Terminal, Shield, Swords, Sparkles, Volume2, VolumeX, User, Map, RefreshCw } from 'lucide-react';
import { sfx } from '../audio/soundEffects';

interface NavItemConfig {
  id: 'character' | 'talents' | 'dungeon' | 'combat' | 'python_studio';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  highlight?: boolean;
}

interface NavbarProps {
  player: PlayerCharacter;
  activeTab: 'character' | 'talents' | 'dungeon' | 'combat' | 'python_studio';
  setActiveTab: (tab: 'character' | 'talents' | 'dungeon' | 'combat' | 'python_studio') => void;
  isPythonReady: boolean;
  pythonLatency: number;
  inCombat: boolean;
  onResetCharacter: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  player,
  activeTab,
  setActiveTab,
  isPythonReady,
  pythonLatency,
  inCombat,
  onResetCharacter,
}) => {
  const [isMuted, setIsMuted] = React.useState(sfx.getIsMuted());

  const handleToggleSound = () => {
    const muted = sfx.toggleMute();
    setIsMuted(muted);
    if (!muted) sfx.playClick();
  };

  const navItems: NavItemConfig[] = [
    { id: 'character', label: 'Character Forge', icon: User },
    { id: 'talents', label: 'Talent Matrix', icon: Sparkles, badge: player.unspentTalentPoints > 0 ? `${player.unspentTalentPoints}` : undefined },
    { id: 'dungeon', label: 'Expeditions', icon: Map },
    { id: 'combat', label: 'Turn Combat', icon: Swords, highlight: inCombat },
    { id: 'python_studio', label: 'Python Studio', icon: Terminal },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center border border-amber-500/40 shadow-sm shadow-amber-900/50">
            <span className="font-mono text-base font-extrabold text-amber-200">Py</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-black tracking-wide text-lg text-slate-100 uppercase">
                PyThrone
              </h1>
              <span className="text-[11px] font-mono text-amber-400/80 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                v3.12 Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans truncate max-w-xs">
              {player.name} · <span className="text-amber-300">{player.title}</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sfx.playClick();
                  setActiveTab(item.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>

                {item.badge && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
                    {item.badge}
                  </span>
                )}

                {item.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Player Quick Indicators & System Status */}
        <div className="flex items-center gap-3">
          {/* Quick Stats: Level, Gold, HP */}
          <div className="hidden sm:flex items-center gap-3 text-xs bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-lg font-mono">
            <div className="flex items-center gap-1 text-slate-300">
              <span className="text-slate-500">LVL</span>
              <span className="font-bold text-amber-400">{player.level}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-amber-300">
              <span className="text-amber-500">💰</span>
              <span>{player.gold}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <span>HP</span>
              <span className="font-semibold">{player.computedStats.currentHp}/{player.computedStats.maxHp}</span>
            </div>
          </div>

          {/* Python Engine Status Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border bg-slate-900/90 border-slate-800"
            title="Real-time Python 3 (Pyodide WebAssembly) engine executing combat rules and stats."
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPythonReady ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-slate-300">
              {isPythonReady ? `Python 3.12 (${pythonLatency}ms)` : 'Python Init...'}
            </span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* New Character / Reset */}
          <button
            onClick={() => {
              if (window.confirm('Create a new hero or reset your character?')) {
                onResetCharacter();
              }
            }}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Character Re-Creation / New Game"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
