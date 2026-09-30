import React, { useState } from 'react';
import { AttributeStats, CharacterClass, VisualCustomization } from '../types/rpg';
import { CLASS_DEFINITIONS } from '../data/classes';
import { AURA_COLORS, CRESTS, PORTRAIT_OPTIONS, TRIM_COLORS, CharacterAvatar } from '../data/portraits';
import { Flame, Shield, Zap, Sparkles, Check, ChevronRight, Dices } from 'lucide-react';
import { sfx } from '../audio/soundEffects';

interface CharacterCreationProps {
  onComplete: (data: {
    name: string;
    title: string;
    characterClass: CharacterClass;
    attributes: AttributeStats;
    customization: VisualCustomization;
  }) => void;
}

const RANDOM_NAMES = [
  'Aethelgard', 'Valerius', 'Kaelen', 'Morrigan', 'Soran',
  'Lyra', 'Vespera', 'Darius', 'Ignis', 'Cyrena'
];

const RANDOM_TITLES = [
  'The Arcane Weaver', 'The Iron Bastion', 'The Shadow Strider',
  'The Unbound Algorithm', 'The Radiant Arbiter', 'The Flame-Forged',
  'The Quantum Walker', 'The Serpent-Eyed'
];

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onComplete }) => {
  const [name, setName] = useState('Valerius');
  const [title, setTitle] = useState('The Arcane Weaver');
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('pyromancer');
  const [gender, setGender] = useState<'masculine' | 'feminine' | 'enigmatic'>('masculine');
  const [portraitId, setPortraitId] = useState('mage_arcane_m');
  const [auraColor, setAuraColor] = useState(AURA_COLORS[0].id);
  const [trimColor, setTrimColor] = useState(TRIM_COLORS[0].id);
  const [crestSymbol, setCrestSymbol] = useState<'dragon' | 'serpent' | 'owl' | 'lion' | 'gear'>('serpent');

  // Bonus Points Allocation (5 starting bonus points)
  const baseClassAttrs = CLASS_DEFINITIONS[selectedClass].baseAttributes;
  const [bonusPoints, setBonusPoints] = useState<AttributeStats>({
    vigor: 0,
    might: 0,
    intellect: 0,
    agility: 0,
    resilience: 0,
  });

  const TOTAL_BONUS_POOL = 6;
  const spentPoints = Object.values(bonusPoints).reduce((a, b) => a + b, 0);
  const remainingPoints = TOTAL_BONUS_POOL - spentPoints;

  const handleClassChange = (c: CharacterClass) => {
    sfx.playClick();
    setSelectedClass(c);
    // Auto-match portrait to class
    const match = PORTRAIT_OPTIONS.find((p) => p.classMatch === c);
    if (match) setPortraitId(match.id);

    // Reset bonus points
    setBonusPoints({ vigor: 0, might: 0, intellect: 0, agility: 0, resilience: 0 });
  };

  const handleAdjustPoint = (attr: keyof AttributeStats, delta: number) => {
    if (delta > 0 && remainingPoints <= 0) return;
    if (delta < 0 && bonusPoints[attr] <= 0) return;

    sfx.playClick();
    setBonusPoints((prev) => ({
      ...prev,
      [attr]: prev[attr] + delta,
    }));
  };

  const handleRandomizeIdentity = () => {
    sfx.playClick();
    const rName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const rTitle = RANDOM_TITLES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setName(rName);
    setTitle(rTitle);
  };

  const currentAttrs: AttributeStats = {
    vigor: baseClassAttrs.vigor + bonusPoints.vigor,
    might: baseClassAttrs.might + bonusPoints.might,
    intellect: baseClassAttrs.intellect + bonusPoints.intellect,
    agility: baseClassAttrs.agility + bonusPoints.agility,
    resilience: baseClassAttrs.resilience + bonusPoints.resilience,
  };

  const handleFinish = () => {
    sfx.playSpell('fire');
    onComplete({
      name: name.trim() || 'Hero of Python',
      title: title.trim() || 'The Unbound',
      characterClass: selectedClass,
      attributes: currentAttrs,
      customization: {
        avatarId: portraitId,
        gender,
        auraColor,
        trimColor,
        crestSymbol,
      },
    });
  };

  const classDef = CLASS_DEFINITIONS[selectedClass];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-mono uppercase tracking-widest text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40">
          Character Initiation Matrix
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-100 mt-2">
          Forge Your Python Champion
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto mt-1">
          Customize your appearance, class discipline, runic crest, and attribute distribution. All combat calculations are verified in real time by the Python engine.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visual Customizer & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
            {/* Live Character Portrait Preview */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800">
              <div className="relative mb-4">
                <CharacterAvatar
                  portraitId={portraitId}
                  auraColor={auraColor}
                  trimColor={trimColor}
                  crestSymbol={crestSymbol}
                  size="xl"
                  isAnimated
                />
              </div>

              <h3 className="text-xl font-serif font-bold text-slate-100">
                {name || 'Nameless One'}
              </h3>
              <p className="text-xs font-mono text-amber-400 mt-0.5">
                {title || 'The Unwritten'}
              </p>
              <div className="mt-2 text-xs font-sans text-slate-400 flex items-center gap-2">
                <span className="font-semibold text-slate-300">{classDef.name}</span>
                <span aria-hidden="true">·</span>
                <span>{classDef.role}</span>
              </div>
            </div>

            {/* Customization Controls */}
            <div className="pt-6 space-y-5">
              {/* Name & Title Inputs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Identity & Epithet</label>
                  <button
                    onClick={handleRandomizeIdentity}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Roll Random</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Character Name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Epithet / Title"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Portrait Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Visual Avatar
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PORTRAIT_OPTIONS.map((p) => {
                    const isSelected = portraitId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          sfx.playClick();
                          setPortraitId(p.id);
                        }}
                        className={`p-1 rounded-xl border flex flex-col items-center transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-sm shadow-amber-500/20'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <CharacterAvatar
                          portraitId={p.id}
                          auraColor={auraColor}
                          trimColor={trimColor}
                          crestSymbol={crestSymbol}
                          size="sm"
                        />
                        <span className="text-[10px] text-slate-300 truncate max-w-[65px] mt-1">
                          {p.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Runic Crest Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Runic Crest Affinity
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CRESTS.map((crest) => {
                    const isSelected = crestSymbol === crest.id;
                    return (
                      <button
                        key={crest.id}
                        onClick={() => {
                          sfx.playClick();
                          setCrestSymbol(crest.id as any);
                        }}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'bg-amber-950/60 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                        title={`${crest.name}: ${crest.lore}`}
                      >
                        <div className="text-lg">{crest.icon}</div>
                        <div className="text-[10px] mt-0.5 truncate">{crest.id}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aura Glow Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Magical Aura Resonance
                </label>
                <div className="flex items-center gap-2">
                  {AURA_COLORS.map((aura) => (
                    <button
                      key={aura.id}
                      onClick={() => {
                        sfx.playClick();
                        setAuraColor(aura.id);
                      }}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center relative"
                      style={{
                        backgroundColor: aura.id,
                        borderColor: auraColor === aura.id ? '#ffffff' : 'transparent',
                      }}
                      title={aura.name}
                    >
                      {auraColor === aura.id && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trim Accent */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Armor Metal Trim
                </label>
                <div className="flex items-center gap-2">
                  {TRIM_COLORS.map((trim) => (
                    <button
                      key={trim.id}
                      onClick={() => {
                        sfx.playClick();
                        setTrimColor(trim.id);
                      }}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                      style={{
                        backgroundColor: trim.id,
                        borderColor: trimColor === trim.id ? '#ffffff' : 'transparent',
                      }}
                      title={trim.name}
                    >
                      {trimColor === trim.id && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Class Selection & Attribute Distribution (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Archetype / Class Selection */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-base font-serif font-bold text-slate-100 mb-3">
              1. Choose Character Archetype
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {(Object.keys(CLASS_DEFINITIONS) as CharacterClass[]).map((cKey) => {
                const item = CLASS_DEFINITIONS[cKey];
                const isSelected = selectedClass === cKey;
                const getIcon = () => {
                  switch (cKey) {
                    case 'pyromancer':
                      return <Flame className="w-5 h-5 text-orange-400" />;
                    case 'vanguard':
                      return <Shield className="w-5 h-5 text-amber-400" />;
                    case 'shadowblade':
                      return <Zap className="w-5 h-5 text-emerald-400" />;
                    case 'cleric':
                      return <Sparkles className="w-5 h-5 text-yellow-300" />;
                  }
                };

                return (
                  <button
                    key={cKey}
                    onClick={() => handleClassChange(cKey)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400 shadow-md shadow-amber-900/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="mb-2">{getIcon()}</div>
                      <div className="font-serif font-bold text-sm text-slate-100">{item.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.role.split(' / ')[0]}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Class Deep Info */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-bold text-sm text-amber-300">
                  {classDef.name} — {classDef.subtitle}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Affinity: {classDef.preferredDamageType}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed mb-3">
                {classDef.description}
              </p>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Innate Class Traits:
                </span>
                {classDef.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-amber-400 text-xs">◆</span>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attribute Points Allocation */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-serif font-bold text-slate-100">
                  2. Allocate Starting Stat Attributes
                </h3>
                <p className="text-xs text-slate-400">
                  Scale health, physical strikes, spell power, turn speed, and defense.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-600/50 text-right">
                <div className="text-[10px] uppercase font-mono text-amber-300">Points Remaining</div>
                <div className="text-lg font-mono font-bold text-amber-200">{remainingPoints}</div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: 'vigor', name: 'Vigor', desc: 'Increases Maximum HP (+24/pt) & Health Regen', color: 'text-red-400' },
                { key: 'might', name: 'Might', desc: 'Increases Physical Attack (+4.2/pt) & Armor Break', color: 'text-orange-400' },
                { key: 'intellect', name: 'Intellect', desc: 'Increases Maximum Mana (+16/pt) & Magic Power (+4.5/pt)', color: 'text-blue-400' },
                { key: 'agility', name: 'Agility', desc: 'Increases Speed/Initiative, Critical Chance & Dodge', color: 'text-emerald-400' },
                { key: 'resilience', name: 'Resilience', desc: 'Increases Physical Armor (+3.4/pt) & Magic Resistance', color: 'text-purple-400' },
              ].map(({ key, name, desc, color }) => {
                const attrKey = key as keyof AttributeStats;
                const baseVal = baseClassAttrs[attrKey];
                const added = bonusPoints[attrKey];
                const total = baseVal + added;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-serif font-bold text-sm ${color}`}>{name}</span>
                        <span className="text-xs font-mono text-slate-400">
                          {baseVal} {added > 0 && <span className="text-emerald-400">+{added}</span>}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{desc}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdjustPoint(attrKey, -1)}
                        disabled={added <= 0}
                        className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-slate-100 text-sm">
                        {total}
                      </span>
                      <button
                        onClick={() => handleAdjustPoint(attrKey, 1)}
                        disabled={remainingPoints <= 0}
                        className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Launch Game Button */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                You can freely respec or edit Python formulas in the Sanctuary.
              </span>
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-serif font-bold text-sm shadow-lg shadow-amber-950/50 transition-all hover:scale-105 active:scale-95"
              >
                <span>Awaken Champion</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
