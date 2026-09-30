import React from 'react';

export interface PortraitOption {
  id: string;
  name: string;
  classMatch: string;
  gender: 'masculine' | 'feminine' | 'enigmatic';
}

export const PORTRAIT_OPTIONS: PortraitOption[] = [
  { id: 'mage_fire_f', name: 'Ignis Sorceress', classMatch: 'pyromancer', gender: 'feminine' },
  { id: 'mage_arcane_m', name: 'Arch-Pyromancer', classMatch: 'pyromancer', gender: 'masculine' },
  { id: 'knight_valiant_m', name: 'Iron Bastion', classMatch: 'vanguard', gender: 'masculine' },
  { id: 'knight_shield_f', name: 'Vanguard Matron', classMatch: 'vanguard', gender: 'feminine' },
  { id: 'rogue_shadow_f', name: 'Shadow Whisper', classMatch: 'shadowblade', gender: 'feminine' },
  { id: 'rogue_phantom_m', name: 'Ghostblade Stalker', classMatch: 'shadowblade', gender: 'masculine' },
  { id: 'cleric_radiant_f', name: 'Solar Hierophant', classMatch: 'cleric', gender: 'feminine' },
  { id: 'cleric_templar_m', name: 'Dawn Templar', classMatch: 'cleric', gender: 'masculine' },
];

export const AURA_COLORS = [
  { id: '#ef4444', name: 'Infernal Ember', glow: 'rgba(239, 68, 68, 0.4)' },
  { id: '#a855f7', name: 'Void Arcana', glow: 'rgba(168, 85, 247, 0.4)' },
  { id: '#3b82f6', name: 'Glacial Cerulean', glow: 'rgba(59, 130, 246, 0.4)' },
  { id: '#eab308', name: 'Solar Radiance', glow: 'rgba(234, 179, 8, 0.4)' },
  { id: '#10b981', name: 'Toxic Serpent', glow: 'rgba(16, 185, 129, 0.4)' },
  { id: '#64748b', name: 'Tempered Steel', glow: 'rgba(100, 116, 139, 0.4)' },
];

export const TRIM_COLORS = [
  { id: '#f59e0b', name: 'Polished Gold' },
  { id: '#94a3b8', name: 'Runic Silver' },
  { id: '#06b6d4', name: 'Aetheric Mythril' },
  { id: '#ec4899', name: 'Rose Obsidian' },
  { id: '#d97706', name: 'Ancient Bronze' },
];

export const CRESTS = [
  { id: 'serpent', name: 'Python Ouroboros', icon: '🐍', lore: 'Symbol of recursion, mastery, and perpetual iteration.' },
  { id: 'dragon', name: 'Drakon of Primordial Code', icon: '🐉', lore: 'Raw brute computational firepower and unbending might.' },
  { id: 'owl', name: 'Owl of Algorithmic Wisdom', icon: '🦉', lore: 'Deep logic, mana efficiency, and precision calculation.' },
  { id: 'lion', name: 'Lion of the Vanguard Bastion', icon: '🦁', lore: 'Unyielding defense, valor, and battlefield sovereignty.' },
  { id: 'gear', name: 'Clockwork Matrix Core', icon: '⚙️', lore: 'Perfect systemic harmony, clock cycles, and deterministic power.' },
];

interface AvatarProps {
  portraitId: string;
  auraColor?: string;
  trimColor?: string;
  crestSymbol?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isAnimated?: boolean;
}

export const CharacterAvatar: React.FC<AvatarProps> = ({
  portraitId,
  auraColor = '#eab308',
  trimColor = '#f59e0b',
  crestSymbol = 'serpent',
  size = 'md',
  isAnimated = false,
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-36 h-36',
  };

  const getPortraitGradient = (id: string) => {
    if (id.includes('fire') || id.includes('pyro')) return 'from-orange-950 via-red-900 to-amber-950';
    if (id.includes('knight') || id.includes('valiant') || id.includes('shield')) return 'from-slate-900 via-zinc-800 to-amber-950';
    if (id.includes('rogue') || id.includes('shadow') || id.includes('phantom')) return 'from-purple-950 via-slate-900 to-emerald-950';
    return 'from-amber-950 via-yellow-900 to-slate-950';
  };

  const getPortraitGlyph = (id: string) => {
    if (id.includes('fire') || id.includes('pyro')) return '🔥';
    if (id.includes('knight') || id.includes('shield') || id.includes('valiant')) return '🛡️';
    if (id.includes('rogue') || id.includes('shadow') || id.includes('phantom')) return '🗡️';
    if (id.includes('cleric') || id.includes('radiant') || id.includes('templar')) return '✨';
    return '⚔️';
  };

  const getCrestEmoji = (c: string) => {
    const found = CRESTS.find((item) => item.id === c);
    return found ? found.icon : '🐍';
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-b ${getPortraitGradient(
        portraitId
      )} border-2 transition-all ${sizeMap[size]} ${isAnimated ? 'hover:scale-105' : ''}`}
      style={{
        borderColor: trimColor,
        boxShadow: `0 0 20px ${auraColor}33`,
      }}
    >
      {/* Background Rune Ring */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none border border-dashed rounded-full m-1"
        style={{ borderColor: auraColor }}
      />

      {/* Main Archetype Symbol */}
      <span className="text-2xl select-none filter drop-shadow-md z-10">{getPortraitGlyph(portraitId)}</span>

      {/* Corner Crest Emblem */}
      <div
        className="absolute bottom-1 right-1 text-[10px] w-4 h-4 rounded-full flex items-center justify-center bg-black/70 border border-white/20 select-none z-20"
        title={`Crest: ${crestSymbol}`}
      >
        {getCrestEmoji(crestSymbol)}
      </div>

      {/* Subtle Aura Glow */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-30"
        style={{
          background: `radial-gradient(circle at center, ${auraColor} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};

export const EnemyAvatar: React.FC<{ portrait: string; isBoss?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({
  portrait,
  isBoss = false,
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-16 h-16 text-3xl',
    lg: 'w-24 h-24 text-5xl',
  };

  const getEmoji = (p: string) => {
    switch (p) {
      case 'viper':
        return '🐍';
      case 'goblin':
        return '👺';
      case 'wraith':
        return '👻';
      case 'golem':
        return '🗿';
      case 'lich':
        return '💀';
      case 'daemon':
        return '👾';
      default:
        return '👹';
    }
  };

  return (
    <div
      className={`relative rounded-xl flex items-center justify-center border-2 overflow-hidden transition-all ${
        sizeMap[size]
      } ${
        isBoss
          ? 'bg-gradient-to-b from-purple-950 via-red-950 to-black border-red-500 shadow-lg shadow-red-900/40 animate-pulse'
          : 'bg-gradient-to-b from-slate-900 to-zinc-950 border-slate-700'
      }`}
    >
      <span className="select-none filter drop-shadow">{getEmoji(portrait)}</span>
      {isBoss && (
        <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-1 rounded-bl">
          BOSS
        </div>
      )}
    </div>
  );
};
