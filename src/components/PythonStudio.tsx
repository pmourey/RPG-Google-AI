import React, { useState } from 'react';
import { PlayerCharacter } from '../types/rpg';
import { pythonEngine } from '../python/pyodideRunner';
import { PYTHON_CORE_ENGINE } from '../python/engineSource';
import { Terminal, Play, RotateCcw, Code, BookOpen, Check, Cpu, Sparkles } from 'lucide-react';
import { sfx } from '../audio/soundEffects';

interface PythonStudioProps {
  player: PlayerCharacter;
  onUpdateScript: (script: string, enabled: boolean) => void;
  isPythonReady: boolean;
  pythonLatency: number;
}

const SAMPLE_SCRIPTS = [
  {
    name: 'Smart Healer & Finisher',
    desc: 'Heals when below 35% HP, then executes the lowest health foe.',
    code: `# Smart Healer & Finisher Gambit
# Python 3 logic evaluated live in combat turns

if hero['hp'] < hero['max_hp'] * 0.35:
    # Check for defensive healing spell
    for s in hero['skills']:
        if s['mana_cost'] <= hero['mana'] and s.get('is_healing', False):
            return {"action": "skill", "skill_id": s['id'], "target_id": "self"}
    return {"action": "guard", "target_id": "self"}

# Find target with lowest current health
lowest_target = min(enemies, key=lambda e: e['hp'])

# Cast highest power skill available
available_skills = [s for s in hero['skills'] if s['mana_cost'] <= hero['mana'] and s['current_cd'] == 0]
if available_skills:
    strongest = max(available_skills, key=lambda s: s['mana_cost'])
    return {"action": "skill", "skill_id": strongest['id'], "target_id": lowest_target['id']}

return {"action": "attack", "target_id": lowest_target['id']}
`,
  },
  {
    name: 'Boss Slayer Protocol',
    desc: 'Prioritizes burning down the boss with max AP burst rotations.',
    code: `# Boss Slayer Protocol
# Focus-fire priority on Elite and Boss targets

boss = next((e for e in enemies if e.get('is_boss')), None)
target = boss if boss and boss['hp'] > 0 else enemies[0]

# Check if boss is charging an attack
if boss and hero['hp'] < hero['max_hp'] * 0.45:
    return {"action": "guard", "target_id": "self"}

# Burst down with primary assault skill
if hero['mana'] >= 30:
    for s in hero['skills']:
        if s['mana_cost'] >= 25 and s['current_cd'] == 0:
            return {"action": "skill", "skill_id": s['id'], "target_id": target['id']}

return {"action": "attack", "target_id": target['id']}
`,
  },
  {
    name: 'Mana Conservation',
    desc: 'Uses low-cost spells and basic attacks to preserve mana for emergencies.',
    code: `# Mana Conservation Gambit
# Balances high damage with resource management

target = enemies[0]

if hero['mana'] < 20:
    # Save mana, basic attack
    return {"action": "attack", "target_id": target['id']}

# Find zero-cost or cheap skill
for s in hero['skills']:
    if s['mana_cost'] <= 15 and s['current_cd'] == 0:
        return {"action": "skill", "skill_id": s['id'], "target_id": target['id']}

return {"action": "attack", "target_id": target['id']}
`,
  },
];

const REPL_STARTER = `# Interactive Python 3 Terminal
# Access game variables: hero, context, CombatCalculator, math, random

print(f"Hero Name: {hero['name']}")
print(f"Current HP: {hero['computedStats']['currentHp']} / {hero['computedStats']['maxHp']}")
print(f"Physical Attack: {hero['computedStats']['physicalAttack']}")
print(f"Magic Power: {hero['computedStats']['magicPower']}")

# Simulate damage formula in Python:
att = hero['computedStats']['physicalAttack']
multiplier = 1.8
enemy_armor = 25
mitigation = enemy_armor / (enemy_armor + 120.0)
sim_dmg = int((att * multiplier) * (1.0 - mitigation))

print(f"Simulated Cleave Strike Damage: {sim_dmg} physical")
`;

export const PythonStudio: React.FC<PythonStudioProps> = ({
  player,
  onUpdateScript,
  isPythonReady,
  pythonLatency,
}) => {
  const [activeTab, setActiveTab] = useState<'gambit' | 'repl' | 'engine_code'>('gambit');
  const [scriptCode, setScriptCode] = useState(player.customPythonScript || SAMPLE_SCRIPTS[0].code);
  const [scriptEnabled, setScriptEnabled] = useState(player.scriptEnabled ?? true);
  const [replCode, setReplCode] = useState(REPL_STARTER);
  const [terminalOutput, setTerminalOutput] = useState<string>(
    'Python 3.12 REPL initialized. Press "Run Script" to execute Python code directly in WebAssembly.'
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveGambit = () => {
    sfx.playClick();
    onUpdateScript(scriptCode, scriptEnabled);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestGambit = async () => {
    sfx.playClick();
    setIsExecuting(true);
    const mockEnemies = [
      { id: 'dummy_1', name: 'Training Automaton', hp: 120, max_hp: 200, is_boss: false },
      { id: 'dummy_boss', name: 'Colossus Boss Mock', hp: 450, max_hp: 500, is_boss: true },
    ];

    const result = await pythonEngine.executeGambit(scriptCode, player, mockEnemies as any, 1);
    setIsExecuting(false);

    if (result.success) {
      alert(`[Python Execution Success!]\nTactic decided action:\n${JSON.stringify(result.action, null, 2)}`);
    } else {
      alert(`[Python Execution Error]\n${result.error}`);
    }
  };

  const handleRunRepl = async () => {
    sfx.playClick();
    setIsExecuting(true);
    const context = {
      hero: player,
      dungeon: { name: 'Catacombs of the Null Pointer', stage: 2 },
    };

    const res = await pythonEngine.runRepl(replCode, context);
    setIsExecuting(false);

    if (res.success) {
      setTerminalOutput(res.output || '(Execution returned no stdout)');
    } else {
      setTerminalOutput(`Traceback (most recent call last):\n${res.error}\n${res.output}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-slate-100">
              Python Arcana Studio
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Pyodide WebAssembly Active ({pythonLatency}ms)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Inspect, author, and test real Python code. Customize your turn-based combat gambits, run live Python algorithms, or inspect the underlying combat formulas.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('gambit');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'gambit'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tactical Gambit Script
          </button>
          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('repl');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'repl'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Python REPL
          </button>
          <button
            onClick={() => {
              sfx.playClick();
              setActiveTab('engine_code');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'engine_code'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Engine Source (Python)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'gambit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Script Editor (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs text-slate-200">tactical_gambit.py</span>
                <span className="text-[10px] text-slate-500">· Evaluated each combat turn</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scriptEnabled}
                    onChange={(e) => setScriptEnabled(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span>Enable Script in Combat</span>
                </label>
              </div>
            </div>

            <div className="p-4 flex-1">
              <textarea
                value={scriptCode}
                onChange={(e) => setScriptCode(e.target.value)}
                rows={16}
                spellCheck={false}
                className="w-full h-full min-h-[360px] bg-slate-950 font-mono text-xs text-amber-100/90 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 leading-relaxed resize-none selection:bg-amber-500/30"
              />
            </div>

            {/* Actions Bar */}
            <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  disabled={isExecuting}
                  onClick={handleTestGambit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Test Run Script</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}
                <button
                  onClick={handleSaveGambit}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-serif font-bold text-xs shadow transition-all hover:scale-105"
                >
                  Apply & Save Script
                </button>
              </div>
            </div>
          </div>

          {/* Presets and Documentation (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="font-serif font-bold text-sm text-slate-100 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Script Presets</span>
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Load ready-to-use tactical logic tailored to various battle situations:
              </p>

              <div className="space-y-2">
                {SAMPLE_SCRIPTS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      sfx.playClick();
                      setScriptCode(preset.code);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-400/60 text-left transition-all"
                  >
                    <div className="font-serif font-bold text-xs text-slate-200">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {preset.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm text-xs space-y-2">
              <h4 className="font-serif font-bold text-slate-100 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Python Environment API</span>
              </h4>
              <p className="text-slate-400 text-[11px]">
                Your script has access to live arguments:
              </p>
              <ul className="list-disc list-inside text-slate-300 font-mono text-[10px] space-y-1">
                <li><code className="text-amber-300">hero</code>: dict with hp, max_hp, mana, skills</li>
                <li><code className="text-amber-300">enemies</code>: list of enemy dicts (id, hp, is_boss)</li>
                <li><code className="text-amber-300">round_num</code>: integer battle turn</li>
                <li><code className="text-amber-300">math, random</code>: standard Python libraries</li>
              </ul>
              <p className="text-slate-400 text-[11px] pt-1">
                Return a dictionary like: <code className="text-emerald-300 text-[10px] font-mono">{"{'action': 'attack', 'target_id': enemies[0]['id']}"}</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* REPL Tab */}
      {activeTab === 'repl' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-serif font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Python 3 Interactive Shell</span>
                </span>
                <button
                  onClick={() => setReplCode(REPL_STARTER)}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Reset Template
                </button>
              </div>

              <textarea
                value={replCode}
                onChange={(e) => setReplCode(e.target.value)}
                rows={14}
                spellCheck={false}
                className="w-full bg-slate-950 font-mono text-xs text-amber-100/90 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 leading-relaxed resize-none selection:bg-amber-500/30"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end">
              <button
                disabled={isExecuting}
                onClick={handleRunRepl}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-serif font-bold text-xs shadow transition-all hover:scale-105"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute in Python</span>
              </button>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider">
                Output Terminal (stdout)
              </span>
              <button
                onClick={() => setTerminalOutput('')}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Clear Output
              </button>
            </div>

            <pre className="flex-1 whitespace-pre-wrap text-emerald-400/90 leading-relaxed overflow-y-auto max-h-[360px] p-2 bg-slate-900/60 rounded-xl border border-slate-800/50">
              {terminalOutput}
            </pre>
          </div>
        </div>
      )}

      {/* Engine Source Code Tab */}
      {activeTab === 'engine_code' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base text-slate-100">
                Underlying Python 3 Game Engine Source Code
              </h3>
              <p className="text-xs text-slate-400">
                Compiled into WebAssembly via Pyodide to govern stats, formulas, damage equations, and combat actions.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
              engine_core.py
            </span>
          </div>

          <pre className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed selection:bg-amber-500/30">
            {PYTHON_CORE_ENGINE}
          </pre>
        </div>
      )}
    </div>
  );
};
