/**
 * Pristine Python 3 RPG Game Engine
 * Executed directly in WebAssembly via Pyodide.
 */

export const PYTHON_CORE_ENGINE = `
import json
import math
import random

class AttributeStats:
    def __init__(self, vigor=10, might=10, intellect=10, agility=10, resilience=10):
        self.vigor = vigor
        self.might = might
        self.intellect = intellect
        self.agility = agility
        self.resilience = resilience

    def to_dict(self):
        return {
            "vigor": self.vigor,
            "might": self.might,
            "intellect": self.intellect,
            "agility": self.agility,
            "resilience": self.resilience
        }

class ComputedStats:
    def __init__(self, char_class, attrs, gear_bonuses=None, level=1):
        if gear_bonuses is None:
            gear_bonuses = {}
        
        # Base multipliers and class affinities
        class_modifiers = {
            "pyromancer": {"int_scale": 1.3, "might_scale": 0.8, "base_mana": 120, "base_hp": 180},
            "vanguard":   {"int_scale": 0.7, "might_scale": 1.25, "base_mana": 60, "base_hp": 260},
            "shadowblade":{"int_scale": 0.9, "might_scale": 1.15, "base_mana": 80, "base_hp": 200},
            "cleric":     {"int_scale": 1.2, "might_scale": 0.9, "base_mana": 110, "base_hp": 220},
        }
        mod = class_modifiers.get(char_class, {"int_scale": 1.0, "might_scale": 1.0, "base_mana": 80, "base_hp": 200})

        v = attrs.vigor + gear_bonuses.get("vigor", 0)
        m = attrs.might + gear_bonuses.get("might", 0)
        i = attrs.intellect + gear_bonuses.get("intellect", 0)
        a = attrs.agility + gear_bonuses.get("agility", 0)
        r = attrs.resilience + gear_bonuses.get("resilience", 0)

        # Precise formulaic calculations
        self.max_hp = int(mod["base_hp"] + (v * 24) + (level * 18) + gear_bonuses.get("bonus_hp", 0))
        self.current_hp = self.max_hp
        self.max_mana = int(mod["base_mana"] + (i * 16) + (level * 10) + gear_bonuses.get("bonus_mana", 0))
        self.current_mana = self.max_mana

        self.hp_regen = max(1, int(v * 0.4 + 2))
        self.mana_regen = max(2, int(i * 0.5 + 4))

        self.physical_attack = int(12 + (m * 4.2 * mod["might_scale"]) + gear_bonuses.get("bonus_attack", 0))
        self.magic_power = int(10 + (i * 4.5 * mod["int_scale"]) + gear_bonuses.get("bonus_magic_power", 0))

        self.armor = int(8 + (r * 3.4) + gear_bonuses.get("bonus_armor", 0))
        self.magic_resist = int(6 + (r * 2.2) + (i * 1.2) + gear_bonuses.get("bonus_magic_resist", 0))

        # Percentage chances (0.0 to 1.0)
        self.crit_chance = round(min(0.75, 0.05 + (a * 0.009) + gear_bonuses.get("bonus_crit", 0)), 3)
        self.crit_multiplier = round(1.5 + (m * 0.015) + (a * 0.01), 2)
        self.dodge_chance = round(min(0.40, 0.03 + (a * 0.007)), 3)
        self.speed = int(10 + (a * 2.8) + (level * 1.5))
        self.max_ap = 3
        self.current_ap = 3

    def to_dict(self):
        return {
            "maxHp": self.max_hp,
            "currentHp": self.current_hp,
            "maxMana": self.max_mana,
            "currentMana": self.current_mana,
            "hpRegen": self.hp_regen,
            "manaRegen": self.mana_regen,
            "physicalAttack": self.physical_attack,
            "magicPower": self.magic_power,
            "armor": self.armor,
            "magicResist": self.magic_resist,
            "critChance": self.crit_chance,
            "critMultiplier": self.crit_multiplier,
            "dodgeChance": self.dodge_chance,
            "speed": self.speed,
            "maxAp": self.max_ap,
            "currentAp": self.current_ap
        }

class CombatCalculator:
    """Calculates damage, mitigations, crits and status mechanics using Python rules."""
    
    @staticmethod
    def calculate_damage(attacker_stats, target_stats, skill_data, is_player=True):
        damage_type = skill_data.get("damageType", "physical")
        multiplier = skill_data.get("basePowerMultiplier", 1.0)
        is_healing = skill_data.get("isHealing", False)

        if is_healing:
            heal_base = attacker_stats.magic_power * multiplier
            variance = random.uniform(0.92, 1.08)
            final_heal = int(heal_base * variance)
            formula_str = f"heal = int(magic_power({attacker_stats.magic_power}) * mult({multiplier}) * var) => {final_heal}"
            return {
                "heal": final_heal,
                "damage": 0,
                "isCrit": False,
                "isDodged": False,
                "formula": formula_str,
                "damageType": damage_type
            }

        # Check Dodge
        dodge_roll = random.random()
        target_dodge = getattr(target_stats, "dodge_chance", 0.05) if hasattr(target_stats, "dodge_chance") else 0.05
        if dodge_roll < target_dodge:
            return {
                "damage": 0,
                "heal": 0,
                "isCrit": False,
                "isDodged": True,
                "formula": f"DODGED! (roll {dodge_roll:.2f} < dodge {target_dodge:.2f})",
                "damageType": damage_type
            }

        # Raw Offensive Power
        if damage_type in ["physical", "poison"]:
            raw_offense = attacker_stats.physical_attack * multiplier
            defense = target_stats.armor if hasattr(target_stats, "armor") else target_stats.get("armor", 10)
            mitigation_pct = defense / (defense + 120.0)
        elif damage_type in ["fire", "frost", "lightning", "holy", "shadow"]:
            raw_offense = attacker_stats.magic_power * multiplier
            defense = target_stats.magic_resist if hasattr(target_stats, "magic_resist") else target_stats.get("magicResist", 10)
            mitigation_pct = defense / (defense + 140.0)
        else: # Pure damage
            raw_offense = attacker_stats.physical_attack * multiplier
            mitigation_pct = 0.0

        mitigated = raw_offense * (1.0 - mitigation_pct)

        # Critical Strike Roll
        crit_roll = random.random()
        crit_chance = getattr(attacker_stats, "crit_chance", 0.08) if hasattr(attacker_stats, "crit_chance") else 0.08
        crit_mult = getattr(attacker_stats, "crit_multiplier", 1.5) if hasattr(attacker_stats, "crit_multiplier") else 1.5
        is_crit = crit_roll < crit_chance

        if is_crit:
            mitigated *= crit_mult

        # Variance +/- 7%
        variance = random.uniform(0.93, 1.07)
        final_damage = max(1, int(mitigated * variance))

        crit_tag = f" * CRIT({crit_mult}x)" if is_crit else ""
        formula_str = (
            f"dmg = int((offense({raw_offense:.1f}) * (1 - mit({mitigation_pct:.2f})){crit_tag}) * var) => {final_damage}"
        )

        return {
            "damage": final_damage,
            "heal": 0,
            "isCrit": is_crit,
            "isDodged": False,
            "formula": formula_str,
            "damageType": damage_type
        }

def compute_character_stats(class_name, attrs_dict, gear_bonuses_dict, level):
    attrs = AttributeStats(
        vigor=attrs_dict.get("vigor", 10),
        might=attrs_dict.get("might", 10),
        intellect=attrs_dict.get("intellect", 10),
        agility=attrs_dict.get("agility", 10),
        resilience=attrs_dict.get("resilience", 10)
    )
    computed = ComputedStats(class_name, attrs, gear_bonuses_dict, level)
    return json.dumps(computed.to_dict())

def execute_combat_action(action_json_str):
    """
    Executes a turn action using the Python combat math engine.
    """
    data = json.loads(action_json_str)
    attacker = data["attacker"]
    target = data["target"]
    skill = data["skill"]

    class MockAttacker:
        pass
    class MockTarget:
        pass

    att = MockAttacker()
    for k, v in attacker.items():
        setattr(att, k, v)

    tgt = MockTarget()
    for k, v in target.items():
        setattr(tgt, k, v)

    result = CombatCalculator.calculate_damage(att, tgt, skill)
    return json.dumps(result)

def execute_custom_gambit(script_code, hero_dict, enemies_list, round_num):
    """
    Runs player-authored Python script for auto-tactics.
    Safe execution environment with hero, enemies, round context.
    """
    local_env = {
        "hero": hero_dict,
        "enemies": enemies_list,
        "round_num": round_num,
        "random": random,
        "math": math,
        "result_action": None
    }
    
    wrapper = f"""
def run_gambit():
{'\n'.join('    ' + line for line in script_code.splitlines())}

result_action = run_gambit()
"""
    try:
        exec(wrapper, local_env)
        return json.dumps({
            "success": True,
            "action": local_env.get("result_action"),
            "log": "Gambit executed successfully."
        })
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "log": f"Script error: {e}"
        })

def run_repl(code_str, context_json_str):
    """
    Executes arbitrary Python code in the Python Studio REPL.
    """
    import sys
    import io
    old_stdout = sys.stdout
    redirected_output = io.StringIO()
    sys.stdout = redirected_output

    try:
        context = json.loads(context_json_str)
    except:
        context = {}

    local_vars = {
        "context": context,
        "hero": context.get("hero"),
        "dungeon": context.get("dungeon"),
        "CombatCalculator": CombatCalculator,
        "math": math,
        "random": random
    }

    try:
        exec(code_str, local_vars)
        output = redirected_output.getvalue()
        return json.dumps({"success": True, "output": output, "error": None})
    except Exception as err:
        return json.dumps({"success": False, "output": redirected_output.getvalue(), "error": str(err)})
    finally:
        sys.stdout = old_stdout
`;
