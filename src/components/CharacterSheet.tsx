import React, { useState } from 'react';
import { AttributeStats, Equipment, Item, PlayerCharacter } from '../types/rpg';
import { CharacterAvatar } from '../data/portraits';
import { SHOP_ITEMS } from '../data/items';
import { Shield, Sword, Heart, Sparkles, RefreshCw, ShoppingBag, Plus, ArrowUpRight } from 'lucide-react';
import { sfx } from '../audio/soundEffects';

interface CharacterSheetProps {
  player: PlayerCharacter;
  onUpdateAttributes: (newAttrs: AttributeStats, remainingPoints: number) => void;
  onEquipItem: (item: Item, slot: keyof Equipment) => void;
  onUnequipItem: (slot: keyof Equipment) => void;
  onUseItem: (item: Item) => void;
  onBuyItem: (item: Item) => void;
  onRespec: () => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  player,
  onUpdateAttributes,
  onEquipItem,
  onUnequipItem,
  onUseItem,
  onBuyItem,
  onRespec,
}) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'shop'>('inventory');

  const validInventory = (player.inventory || []).filter((item): item is Item => !!item && !!item.id);

  const expPercentage = Math.min(100, Math.round((player.exp / player.expToNextLevel) * 100));

  const handleSpendPoint = (attr: keyof AttributeStats) => {
    if (player.unspentAttributePoints <= 0) return;
    sfx.playClick();
    const updated = {
      ...player.attributes,
      [attr]: player.attributes[attr] + 1,
    };
    onUpdateAttributes(updated, player.unspentAttributePoints - 1);
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'mythic':
        return 'text-rose-400 border-rose-500/40 bg-rose-950/40';
      case 'legendary':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
      case 'epic':
        return 'text-purple-400 border-purple-500/40 bg-purple-950/40';
      case 'rare':
        return 'text-blue-400 border-blue-500/40 bg-blue-950/40';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-900/40';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner: Hero Overview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <CharacterAvatar
            portraitId={player.customization.avatarId}
            auraColor={player.customization.auraColor}
            trimColor={player.customization.trimColor}
            crestSymbol={player.customization.crestSymbol}
            size="lg"
            isAnimated
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-serif font-bold text-slate-100">{player.name}</h2>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Lvl {player.level}
              </span>
            </div>
            <p className="text-xs text-amber-300 font-mono mt-0.5">{player.title}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="capitalize text-slate-300 font-medium">{player.characterClass}</span>
              <span aria-hidden="true">·</span>
              <span>Crest of the {player.customization.crestSymbol}</span>
            </div>
          </div>
        </div>

        {/* Level Progression & Gold */}
        <div className="flex flex-col sm:items-end gap-2">
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-amber-400 bg-slate-950 border border-amber-800/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <span>💰</span>
              <span className="font-bold text-slate-100">{player.gold} Gold</span>
            </div>
            {player.unspentAttributePoints > 0 && (
              <div className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-600/50 px-3 py-1.5 rounded-lg animate-pulse">
                +{player.unspentAttributePoints} Stat Points Available!
              </div>
            )}
          </div>

          {/* EXP Bar */}
          <div className="w-64 space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Experience</span>
              <span>
                {player.exp} / {player.expToNextLevel} ({expPercentage}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                style={{ width: `${expPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Attributes & Python-Computed Stats (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Attributes */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-bold text-base text-slate-100">
                Core Attributes
              </h3>
              <button
                onClick={() => {
                  sfx.playClick();
                  if (window.confirm('Reset all allocated attribute points for free?')) {
                    onRespec();
                  }
                }}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors"
                title="Python Respec: Re-allocate your attribute points"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Respec Stats</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { key: 'vigor', name: 'Vigor', desc: 'Max HP & Regen', val: player.attributes.vigor, color: 'text-red-400' },
                { key: 'might', name: 'Might', desc: 'Phys Attack & Armor Break', val: player.attributes.might, color: 'text-orange-400' },
                { key: 'intellect', name: 'Intellect', desc: 'Mana & Magic Power', val: player.attributes.intellect, color: 'text-blue-400' },
                { key: 'agility', name: 'Agility', desc: 'Initiative, Crit & Dodge', val: player.attributes.agility, color: 'text-emerald-400' },
                { key: 'resilience', name: 'Resilience', desc: 'Armor & Magic Resist', val: player.attributes.resilience, color: 'text-purple-400' },
              ].map(({ key, name, desc, val, color }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800"
                >
                  <div>
                    <span className={`font-serif font-bold text-sm ${color}`}>{name}</span>
                    <span className="text-[11px] text-slate-500 ml-2">{desc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-100 text-sm">{val}</span>
                    {player.unspentAttributePoints > 0 && (
                      <button
                        onClick={() => handleSpendPoint(key as keyof AttributeStats)}
                        className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-sm"
                        title="Add 1 Attribute Point"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Computed Stats Table (calculated via Python engine) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-bold text-base text-slate-100">
                Combat Specifications
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                Live Python Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">MAX HEALTH</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {player.computedStats.maxHp} HP
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Regen: +{player.computedStats.hpRegen}/turn
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">MAX MANA</span>
                <span className="text-blue-400 font-bold text-sm">
                  {player.computedStats.maxMana} MP
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Regen: +{player.computedStats.manaRegen}/turn
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">PHYSICAL ATTACK</span>
                <span className="text-orange-400 font-bold text-sm">
                  {player.computedStats.physicalAttack}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">MAGIC POWER</span>
                <span className="text-purple-400 font-bold text-sm">
                  {player.computedStats.magicPower}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">ARMOR (MITIGATION)</span>
                <span className="text-slate-200 font-bold text-sm">
                  {player.computedStats.armor}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">MAGIC RESISTANCE</span>
                <span className="text-cyan-400 font-bold text-sm">
                  {player.computedStats.magicResist}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CRITICAL CHANCE</span>
                <span className="text-yellow-400 font-bold text-sm">
                  {Math.round(player.computedStats.critChance * 100)}% ({player.computedStats.critMultiplier}x)
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DODGE & SPEED</span>
                <span className="text-emerald-300 font-bold text-sm">
                  {Math.round(player.computedStats.dodgeChance * 100)}% · {player.computedStats.speed} Spd
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Equipped Gear & Inventory/Shop (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Equipment Slots */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="font-serif font-bold text-base text-slate-100 mb-3">
              Equipped Relics & Armament
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(
                [
                  { slot: 'weapon', label: 'Main Weapon' },
                  { slot: 'offhand', label: 'Off-Hand / Focus' },
                  { slot: 'armor', label: 'Chest Armor' },
                  { slot: 'helm', label: 'Headgear' },
                  { slot: 'amulet', label: 'Runic Amulet' },
                  { slot: 'ring', label: 'Matrix Ring' },
                ] as const
              ).map(({ slot, label }) => {
                const item = player.equipment[slot];
                return (
                  <div
                    key={slot}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 relative flex flex-col justify-between min-h-[95px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-slate-500">{label}</span>
                      {item && (
                        <button
                          onClick={() => {
                            sfx.playClick();
                            onUnequipItem(slot);
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          Unequip
                        </button>
                      )}
                    </div>

                    {item ? (
                      <div>
                        <div className="text-xs font-serif font-bold text-slate-100 truncate mt-1">
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono text-amber-400">
                          {item.bonusAttack ? `+${item.bonusAttack} Atk ` : ''}
                          {item.bonusMagicPower ? `+${item.bonusMagicPower} Mag ` : ''}
                          {item.bonusArmor ? `+${item.bonusArmor} Arm ` : ''}
                          {item.bonusCrit ? `+${Math.round(item.bonusCrit * 100)}% Crit` : ''}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-600 italic py-2">Empty Slot</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inventory & Sanctuary Shop Segmented View */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    sfx.playClick();
                    setActiveTab('inventory');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'inventory'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Backpack ({validInventory.length}/20)
                </button>
                <button
                  onClick={() => {
                    sfx.playClick();
                    setActiveTab('shop');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'shop'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sanctuary Forge & Merchant
                </button>
              </div>

              {selectedItem && (
                <span className="text-xs text-slate-400">
                  Inspecting: <span className="text-slate-200 font-semibold">{selectedItem.name}</span>
                </span>
              )}
            </div>

            {/* Content: Inventory or Shop */}
            {activeTab === 'inventory' ? (
              <div>
                {validInventory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic">
                    Backpack is empty. Venture into dungeons or visit the Merchant!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {validInventory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          selectedItem?.id === item.id
                            ? 'bg-amber-950/30 border-amber-400 shadow-sm'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-serif font-bold text-slate-100">{item.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>
                          </div>
                          <span
                            className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border ${getRarityBadge(
                              item.rarity
                            )}`}
                          >
                            {item.rarity}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-amber-400 font-mono">
                            {item.bonusAttack ? `+${item.bonusAttack} Atk ` : ''}
                            {item.bonusMagicPower ? `+${item.bonusMagicPower} Mag ` : ''}
                            {item.bonusArmor ? `+${item.bonusArmor} Arm ` : ''}
                            {item.healAmount ? `Restores ${item.healAmount} HP` : ''}
                            {item.manaAmount ? `Restores ${item.manaAmount} MP` : ''}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {item.type === 'potion' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sfx.playHeal();
                                  onUseItem(item);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px]"
                              >
                                Drink
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sfx.playClick();
                                  onEquipItem(item, item.type as keyof Equipment);
                                }}
                                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px]"
                              >
                                Equip
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Shop Catalog */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {SHOP_ITEMS.map((shopItem) => {
                  const canAfford = player.gold >= shopItem.value;
                  return (
                    <div
                      key={shopItem.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-serif font-bold text-slate-100">
                            {shopItem.name}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border ${getRarityBadge(
                              shopItem.rarity
                            )}`}
                          >
                            {shopItem.rarity}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{shopItem.description}</div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-amber-300 font-bold">
                          💰 {shopItem.value} Gold
                        </span>
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            sfx.playClick();
                            onBuyItem(shopItem);
                          }}
                          className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
