// ========== 戦闘システム (Step 1.1) ==========

// 戦場サイズ
const BATTLE_W = 20;
const BATTLE_H = 10;

// バトル状態
const battle = {
  units: [],   // 全ユニット(味方+敵)
  turn: 1,
  currentUnitIdx: 0,
  aoeAimAt: null,  // ★範囲攻撃の中心マス候補(2段階タップ用) {x, y}
};

// ★Phase 3 A-1: MaxST計算ヘルパー(原作仕様)
// 個別スキルLvに基づいて MaxST を動的計算する
// MaxST = 70 + (2番目高Atkスキル×2) + (3番目×4) + (4番目×6)
function calcMaxST(classKey, skillLevels) {
  const cls = CLASSES[classKey];
  if (!cls) return 70;
  if (cls.st_override) return cls.st_override;  // ボス等は固定値

  const skills = SKILLS[classKey] || [];
  // 攻撃スキル(damage > 0)の個別Lvを集める
  const atkLevels = skills
    .map((s, idx) => ({ skill: s, lv: (skillLevels && skillLevels[idx]) || 0 }))
    .filter(x => x.skill.damage > 0 && x.lv > 0)  // 未習得は除外
    .map(x => x.lv)
    .sort((a, b) => b - a);

  let maxST = 70;
  if (atkLevels[1]) maxST += atkLevels[1] * 2;
  if (atkLevels[2]) maxST += atkLevels[2] * 4;
  if (atkLevels[3]) maxST += atkLevels[3] * 6;
  return maxST;
}

// ユニット作成ヘルパー
function makeUnit(opts) {
  const cls = CLASSES[opts.classKey];
  const lv = opts.level || 1;
  let maxHP = cls.hp_base + (cls.hp_per_level * (lv - 1));
  if (cls.hp_override) maxHP = cls.hp_override;  // ボス等の固定HP
  const skills = SKILLS[opts.classKey] || [];
  const passive = CLASS_PASSIVES[opts.classKey] || null;

  // ★Phase 3 A-1: MaxST計算式(原作仕様)
  // MaxST = 70 + (2番目高Atkスキル×2) + (3番目×4) + (4番目×6)
  // 1番目は加算されない(=最低70はキープ)
  // 個別のスキルLvで計算する(makeUnit時点ではまだskillLevels未代入なので、
  //  仮にキャラLvで一律にしておく。後で initBattle 等で再計算する)
  const atkSkillLevels = skills
    .map((s, idx) => ({ skill: s, lv: lv }))  // 暫定: キャラLv均等
    .filter(x => x.skill.damage > 0)
    .map(x => x.lv);
  const sorted = [...atkSkillLevels].sort((a, b) => b - a);
  let maxST = 70;
  if (sorted[1]) maxST += sorted[1] * 2;
  if (sorted[2]) maxST += sorted[2] * 4;
  if (sorted[3]) maxST += sorted[3] * 6;
  if (cls.st_override) maxST = cls.st_override;  // ボス等の固定ST

  // 装甲(パッシブのarmorBonus適用)
  const armor = [...cls.armor];
  if (passive && passive.armorBonus) {
    for (let i = 0; i < 3; i++) armor[i] += passive.armorBonus[i];
  }

  // スキルにindexを付与してコピー
  const skillsWithIdx = skills.map((s, i) => ({ ...s, _skillIdx: i }));

  // ★敵専用: skillLevelsをLvに応じて自動生成(味方と同じ公式)
  // SP = level - 1 を全スキルに均等振り。Lv1=全スキルLv1、Lv5=4SP振りで分散
  let enemySkillLevels = null;
  if (opts.side === 'enemy' && skills.length > 0) {
    enemySkillLevels = {};
    skills.forEach((_, i) => { enemySkillLevels[i] = 1; });
    let sp = Math.max(0, lv - 1);
    let i = 0;
    // スキルLv上限5
    while (sp > 0) {
      const targetIdx = i % skills.length;
      if (enemySkillLevels[targetIdx] < 5) {
        enemySkillLevels[targetIdx]++;
        sp--;
      }
      i++;
      // 全スキルLv5に達したら抜ける
      if (i > skills.length * 5) break;
    }
    // ★Phase 3 A-1: 敵にもMaxSTを再計算(個別スキルLv反映)
    if (!cls.st_override) {
      maxST = calcMaxST(opts.classKey, enemySkillLevels);
    }
  }

  return {
    id: opts.id,
    classKey: opts.classKey,
    name: opts.charName || cls.name_ja,
    charName: opts.charName || null,
    classNameJa: cls.name_ja,
    side: opts.side,
    rank: opts.rank || null,
    level: lv,
    x: opts.x,
    y: opts.y,
    hp: maxHP,
    maxHP: maxHP,
    st: maxST,
    maxST: maxST,
    armor: armor,
    move: cls.move,
    dash: cls.dash,
    dead: false,
    hasMoved: false,
    hasDashed: false,
    hasAttacked: false,
    skills: skillsWithIdx,
    statuses: [],
    initiative: Math.random(),
    passive: passive,
    actionsRemaining: passive && passive.multiAction ? passive.multiAction : 1,
    isPet: false,
    ownerId: null,
    skillLevels: enemySkillLevels,  // ★敵: 自動生成、味方: initBattleでpartyDataから移植
  };
}

// ペットユニット作成
// ====== パッシブをLv連動で強化 ======
// 各パッシブのLv1〜Lv5効果テーブル
function scalePassiveByLevel(basePassive, lv) {
  if (!basePassive) return basePassive;
  // 元のオブジェクトをコピーして、Lv係数を反映
  const p = { ...basePassive };

  // 状態異常無効化率(Lvで強化)
  if (basePassive.statusResist) {
    // モンクLv1=70, Lv5=100% / アナグマLv1=50, Lv5=80% / バーバリアンLv1=30, Lv5=60
    const base = basePassive.statusResist;
    const cap = Math.min(100, base + (lv - 1) * 7);
    p.statusResist = cap;
  }
  // 装甲ボーナス(Lvで増)
  if (basePassive.armorBonus) {
    const mul = 1 + (lv - 1) * 0.5; // Lv1=1, Lv5=3倍
    p.armorBonus = basePassive.armorBonus.map(v => Math.round(v * mul));
  }
  // Critボーナス(Lvで増)
  if (basePassive.critBonus) {
    p.critBonus = basePassive.critBonus + (lv - 1) * 2; // ★抑制: +5→+2(Lv5で base+8)
  }
  // ダメージ倍率(Lvで増)
  if (basePassive.damageMul) {
    // Lv1=base, Lv5=base+0.20 (例: Hound 1.0→1.20、Coyoteなら別の値)
    p.damageMul = basePassive.damageMul + (lv - 1) * 0.05;
  }
  // ★HPボーナス(Lvで増、Houndなど)
  if (basePassive.hpBonus !== undefined) {
    p.hpBonus = basePassive.hpBonus + (lv - 1) * 5; // Lv1=0, Lv5=+20
  }
  // 遠距離ダメージボーナス
  if (basePassive.rangedDmgBonus) {
    p.rangedDmgBonus = basePassive.rangedDmgBonus + (lv - 1) * 2; // Lv1=3, Lv5=11
  }
  // ★FIX: 英雄の威風など、隣接味方に装甲ボーナス
  // Lv1=[1,1,0], Lv2=[1,1,1], Lv3=[2,2,1], Lv4=[2,2,1], Lv5=[3,3,2]
  if (basePassive.auraArmorBonus) {
    const tableM = [1, 1, 2, 2, 3];   // 近接
    const tableR = [1, 1, 2, 2, 3];   // 遠隔
    const tableS = [0, 1, 1, 1, 2];   // 魔法
    const idx = Math.max(0, Math.min(4, lv - 1));
    p.auraArmorBonus = [tableM[idx], tableR[idx], tableS[idx]];
  }
  // ★FIX: 癒しの祈り(Healer) - 隣接味方ターン開始時HP回復
  // Lv1=4, Lv2=5, Lv3=6, Lv4=7, Lv5=8
  if (basePassive.auraHealOnTurn) {
    p.auraHealOnTurn = basePassive.auraHealOnTurn + (lv - 1);
  }
  // ★FIX: 反射神経(Gladiator) - 範囲攻撃軽減
  // Lv1=30%, Lv5=50%
  if (basePassive.aoeReduction) {
    p.aoeReduction = Math.min(0.6, basePassive.aoeReduction + (lv - 1) * 0.05);
  }
  // ★FIX: 猟師の技(Jungleman) - 状態異常成功率
  // Lv1=+20, Lv2=+25, Lv3=+30, Lv4=+35, Lv5=+40
  if (basePassive.statusBonus) {
    p.statusBonus = basePassive.statusBonus + (lv - 1) * 5;
  }
  // ★FIX: 瘴気(Serpent) - 周囲魔法ダメージ
  // damage Lv1=5, Lv2=6, Lv3=7, Lv4=8, Lv5=9
  if (basePassive.auraDamage) {
    p.auraDamage = {
      ...basePassive.auraDamage,
      damage: basePassive.auraDamage.damage + (lv - 1),
    };
  }
  // multiAction(2匹一組)はLvで増えない(2固定、不便すぎる)
  // summonOnStartは「ペットLv連動」で別実装
  return p;
}

// ====== 装備効果適用 ======
function applyEquipment(unit, equippedKeys) {
  unit.equipBonuses = {
    crit: 0,
    allDmg: 0,
    singleDmg: 0,
    hpRegen: 0,
    stRegen: 0,
    waitHP: 0,
    aoeHeal: 0,
    armor: [0, 0, 0],
  };

  equippedKeys.forEach(key => {
    const item = ITEMS[key];
    if (!item) return;
    const s = item.stat;

    if (s.max_hp) {
      unit.maxHP += s.max_hp;
    }
    if (s.max_st) {
      unit.maxST += s.max_st;
      unit.st = Math.min(unit.maxST, unit.st + s.max_st);
    }
    if (s.armor) {
      for (let i = 0; i < 3; i++) {
        unit.armor[i] += s.armor[i];
      }
    }
    if (s.crit_bonus) unit.equipBonuses.crit += s.crit_bonus;
    if (s.all_dmg)    unit.equipBonuses.allDmg += s.all_dmg;
    if (s.single_dmg) unit.equipBonuses.singleDmg += s.single_dmg;
    if (s.hp_regen)   unit.equipBonuses.hpRegen += s.hp_regen;
    if (s.st_regen)   unit.equipBonuses.stRegen += s.st_regen;
    if (s.wait_hp)    unit.equipBonuses.waitHP += s.wait_hp;
    if (s.aoe_heal)   unit.equipBonuses.aoeHeal += s.aoe_heal;
  });
}

function makePet(petKey, owner, x, y) {
  const def = PET_DEFS[petKey];
  const lv = owner.level;
  const maxHP = def.hp_base + (def.hp_per_level * (lv - 1));

  return {
    id: 'pet_' + owner.id + '_' + Math.random().toString(36).slice(2, 7),
    classKey: def.classKey,
    name: def.name_ja,
    side: owner.side,
    rank: null,
    level: lv,
    x: x,
    y: y,
    hp: maxHP,
    maxHP: maxHP,
    st: 70,
    maxST: 70,
    armor: [...def.armor],
    move: def.move,
    dash: def.dash,
    dead: false,
    hasMoved: false,
    hasDashed: false,
    hasAttacked: false,
    skills: def.skills,
    statuses: [],
    initiative: Math.random(),
    passive: null,
    actionsRemaining: 1,
    isPet: true,
    ownerId: owner.id,
  };
}

// 地形タイプ定義
// 'rock': 通行不可・破壊不可
// 'crate': 通行不可・HP30で破壊可能
// 'mud': 通行可能・移動コスト+1(MOVE消費2倍)
// 'bush': 通行可能・遠距離視線遮断
const TERRAIN_DEFS = {
  rock:  { passable: false, label: '岩', moveCost: Infinity },
  crate: { passable: false, label: '木箱', moveCost: Infinity, hp: 30, breakable: true },
  mud:   { passable: true,  label: '泥地', moveCost: 2 },
  bush:  { passable: true,  label: '草むら', moveCost: 1, blocksLOS: true },
};

// 地形マップ生成 (The Trivial Plain用)
function generateTerrain() {
  // 全マスnullで初期化
  const map = {};

  // The Trivial Plainの地形配置(原作っぽく):
  // - 中央に岩が散らばってる
  // - 木箱がいくつか
  // - 端の方に泥地
  // - 草むらがちらほら
  const layout = [
    // 岩(2-3個、中央付近)
    { x: 9, y: 3, type: 'rock' },
    { x: 10, y: 6, type: 'rock' },
    { x: 14, y: 4, type: 'rock' },
    { x: 5, y: 7, type: 'rock' },

    // 木箱(破壊可能、戦術的位置)
    { x: 8, y: 5, type: 'crate' },
    { x: 12, y: 2, type: 'crate' },
    { x: 11, y: 8, type: 'crate' },

    // 泥地(数マスに分散)
    { x: 6, y: 4, type: 'mud' },
    { x: 7, y: 4, type: 'mud' },
    { x: 13, y: 6, type: 'mud' },
    { x: 13, y: 7, type: 'mud' },

    // 草むら(視線遮断、戦術的)
    { x: 4, y: 3, type: 'bush' },
    { x: 4, y: 4, type: 'bush' },
    { x: 15, y: 5, type: 'bush' },
    { x: 16, y: 5, type: 'bush' },
    { x: 9, y: 8, type: 'bush' },
  ];

  layout.forEach(t => {
    const def = TERRAIN_DEFS[t.type];
    map[`${t.x},${t.y}`] = {
      type: t.type,
      hp: def.hp || null,
      maxHP: def.hp || null,
    };
  });

  return map;
}

// バトル初期化
function initBattle(missionId) {
  document.body.classList.remove('attack-mode');
  battle.units = [];
  battle.turn = 1;
  battle.terrain = generateTerrain();

  const mission = MISSIONS[missionId];

  // ★Phase3 v9: playerSlots制限(イベントE1=1v1タイマン等)
  // mission.playerSlotsが設定されていれば、partyDataの最初のN人だけ出撃
  const maxAlly = mission && mission.playerSlots ? mission.playerSlots : state.partyData.length;
  const partyToBattle = state.partyData.slice(0, maxAlly);

  // 味方配置(画面左端)+ partyDataからHP/装備復元
  // ★6人対応: 5人目以降はx=0列に折り返す(BATTLE_H=10 制約のため y=2,4,6,8 まで)
  partyToBattle.forEach((pd, i) => {
    // i=0..3 → x=1, y=2+i*2 (y=2,4,6,8)
    // i=4..5 → x=0, y=2+(i-4)*2 (y=2,4)
    let ax, ay;
    if (i < 4) {
      ax = 1;
      ay = 2 + i * 2;
    } else {
      ax = 0;
      ay = 2 + (i - 4) * 2;
    }
    const unit = makeUnit({
      id: 'ally_' + i,
      classKey: pd.classKey,
      side: 'ally',
      level: pd.level,
      x: ax,
      y: ay,
      charName: pd.charName,
    });
    // ★B-3,B-4: partyIdx記録(EXP分配で本人特定に使う)
    unit.partyIdx = i;
    // スキルLv引き継ぎ
    unit.skillLevels = pd.skillLevels || {};
    // ★Phase 3 A-1: skillLevelsに応じてMaxSTを動的再計算
    const newMaxST = calcMaxST(unit.classKey, unit.skillLevels);
    // 装備による max_st ボーナスは equipBonuses で別途加算されるので、ここでは素のMaxSTのみ
    unit.maxST = newMaxST;
    unit.st = Math.min(unit.maxST, unit.st);  // 現在STをクランプ
    // パッシブLv引き継ぎ + パッシブをLvに応じて強化
    const pLv = pd.passiveLevel || 1;
    unit.passiveLevel = pLv;
    if (unit.passive) {
      unit.passive = scalePassiveByLevel(unit.passive, pLv);
    }
    // 装甲を再計算(passive.armorBonus が変わってる可能性)
    if (unit.passive && unit.passive.armorBonus) {
      const baseCls = CLASSES[unit.classKey];
      unit.armor = [...baseCls.armor];
      for (let j = 0; j < 3; j++) unit.armor[j] += unit.passive.armorBonus[j];
    }
    // ★パッシブのhpBonus(Houndの2匹一組Lv強化など)
    if (unit.passive && unit.passive.hpBonus) {
      unit.maxHP += unit.passive.hpBonus;
      unit.hp = Math.min(unit.maxHP, unit.hp + unit.passive.hpBonus);
    }
    // 装備効果適用
    applyEquipment(unit, pd.equipped || []);
    // HP復元
    unit.hp = pd.hp > 0 ? Math.min(pd.hp, unit.maxHP) : 1;
    battle.units.push(unit);
  });

  // 敵配置(ミッション定義から)
  const enemyConfigs = mission ? mission.enemies : [];
  enemyConfigs.forEach((cfg, i) => {
    const unit = makeUnit({
      id: 'enemy_' + i,
      classKey: cfg.classKey,
      side: 'enemy',
      rank: cfg.rank || 'normal',
      level: cfg.level,
      x: cfg.x,
      y: cfg.y,
      charName: cfg.uniqueName || null,  // ★Phase3 v9: 固有名(Tor, Mortimer等)
    });
    // ★Phase3 v9: HP/ST/AGIボーナス(Mortimer用)
    if (cfg.hpBonus) {
      unit.maxHP += cfg.hpBonus;
      unit.hp = unit.maxHP;
    }
    if (cfg.stBonus) {
      unit.maxST = (unit.maxST || 0) + cfg.stBonus;
      unit.st = unit.maxST;
    }
    if (cfg.agiBonus) {
      unit.agi = (unit.agi || 0) + cfg.agiBonus;
    }
    battle.units.push(unit);
  });

  // パッシブ「召喚」を持つユニットの初期召喚処理
  const summoners = [...battle.units];
  summoners.forEach(u => {
    if (u.passive && u.passive.summonOnStart) {
      // 召喚位置: 隣接の空きマス
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dx, dy] of dirs) {
        const px = u.x + dx, py = u.y + dy;
        if (px >= 0 && px < BATTLE_W && py >= 0 && py < BATTLE_H &&
            !battle.units.some(o => !o.dead && o.x === px && o.y === py) &&
            (!battle.terrain[`${px},${py}`] || TERRAIN_DEFS[battle.terrain[`${px},${py}`].type].passable)) {
          const pet = makePet(u.passive.summonOnStart, u, px, py);
          // ペットを passiveLevel でブースト(攻撃力・HP)
          const pLv = u.passiveLevel || 1;
          if (pLv > 1) {
            const hpMul = 1 + (pLv - 1) * 0.25; // Lv5で 1.0 + 1.0 = 2倍
            pet.maxHP = Math.floor(pet.maxHP * hpMul);
            pet.hp = pet.maxHP;
            // ペットスキルダメージも強化
            const dmgBonus = (pLv - 1) * 4;
            pet.skills = pet.skills.map(s => ({
              ...s,
              damage: s.damage > 0 ? s.damage + dmgBonus : s.damage,
            }));
          }
          battle.units.push(pet);
          break;
        }
      }
    }
  });

  battle.units.sort((a, b) => b.initiative - a.initiative);
  battle.currentUnitIdx = 0;

  // ミッション名表示
  if (mission) {
    document.getElementById('battle-mission').textContent = `⚔ ${mission.name_ja}`;
  }

  battle.log = [`<span class="log-turn">[Turn 1]</span> ${mission ? mission.name_ja : ''} 開始!`];
  startUnitTurn();
}

// 地形チェックヘルパー
function getTerrain(x, y) {
  return battle.terrain[`${x},${y}`] || null;
}

function isPassable(x, y) {
  // 範囲外
  if (x < 0 || x >= BATTLE_W || y < 0 || y >= BATTLE_H) return false;
  // 他ユニット
  if (battle.units.some(u => !u.dead && u.x === x && u.y === y)) return false;
  // 地形
  const t = getTerrain(x, y);
  if (t && !TERRAIN_DEFS[t.type].passable) return false;
  return true;
}

function getMoveCost(x, y) {
  const t = getTerrain(x, y);
  if (!t) return 1;
  return TERRAIN_DEFS[t.type].moveCost;
}

// ====== 現在のキャラ取得 ======
function currentUnit() {
  return battle.units[battle.currentUnitIdx];
}

// ====== ユニットのターン開始 ======
function startUnitTurn() {
  const u = currentUnit();
  if (!u) return;

  // 死んでたらスキップ
  if (u.dead) {
    nextTurn();
    return;
  }

  // ターン開始時のST回復(原作: +20)
  u.st = Math.min(u.maxST, u.st + 20);

  // 装備による継続効果(オレンジ系アイテム)
  if (u.equipBonuses) {
    if (u.equipBonuses.hpRegen > 0 && u.hp < u.maxHP) {
      const heal = u.equipBonuses.hpRegen;
      u.hp = Math.min(u.maxHP, u.hp + heal);
      // ポップアップは省略(うるさいので)
    }
    if (u.equipBonuses.stRegen > 0) {
      u.st = Math.min(u.maxST, u.st + u.equipBonuses.stRegen);
    }
    if (u.equipBonuses.aoeHeal > 0) {
      // 隣接味方を回復
      const adjacent = battle.units.filter(o =>
        !o.dead && o.side === u.side && o.id !== u.id &&
        Math.abs(o.x - u.x) <= 1 && Math.abs(o.y - u.y) <= 1
      );
      adjacent.forEach(a => {
        if (a.hp < a.maxHP) {
          a.hp = Math.min(a.maxHP, a.hp + u.equipBonuses.aoeHeal);
        }
      });
    }
  }

  // ★パッシブ: ヒーラーの auraHealOnTurn(隣接仲間にHP回復)
  if (u.passive && u.passive.auraHealOnTurn && !u.dead) {
    const healAmount = u.passive.auraHealOnTurn;
    const adjacent = battle.units.filter(o =>
      !o.dead && o.side === u.side && o.id !== u.id &&
      Math.abs(o.x - u.x) <= 1 && Math.abs(o.y - u.y) <= 1
    );
    adjacent.forEach(a => {
      if (a.hp < a.maxHP) {
        const before = a.hp;
        a.hp = Math.min(a.maxHP, a.hp + healAmount);
        const actualHeal = a.hp - before;
        if (actualHeal > 0) {
          showHealPopup(a, actualHeal);
        }
      }
    });
    if (adjacent.some(a => a.hp > 0)) {
      addLog(`<span style="color:#6ec844">${u.name} の${u.passive.name}で隣接仲間が回復</span>`);
    }
  }

  u.hasMoved = false;
  u.hasDashed = false;
  u.hasAttacked = false;
  battle.attackMode = false;
  battle.selectedSkill = null;  // ★ターン跨ぎでの残留防止
  battle.aoeAimAt = null;       // ★範囲攻撃プレビューもクリア
  document.body.classList.remove('attack-mode');
  // 攻撃ボタンラベル復元
  const _attackBtn = document.getElementById('action-attack');
  if (_attackBtn) _attackBtn.innerHTML = '⚔ スキル';
  const _actionBar = document.getElementById('action-bar');
  if (_actionBar) _actionBar.classList.remove('attack-mode');

  // 状態異常のターン開始処理
  const skipTurn = processStatusEffects(u);

  // 死亡判定(毒で死んだ場合)
  if (u.hp <= 0) {
    u.hp = 0;
    setTimeout(() => {
      killUnit(u);
      setTimeout(nextTurn, 100);
    }, 600);
    return;
  }

  renderBattle();
  scrollToUnit(u);

  // Stun中なら行動スキップ
  if (skipTurn) {
    addLog(`${u.name} は <span style="color:#ffd700">麻痺</span> で動けない`);
    flashUnit(u, 'stun');
    setTimeout(() => {
      // ターン終了処理
      decrementStatuses(u);
      nextTurn();
    }, 1000);
    return;
  }

  // 敵の場合は自動行動
  if (u.side === 'enemy') {
    setTimeout(() => enemyAction(u), 600);
  } else {
    // 味方は移動範囲を表示
    showMoveRange(u);
  }
}

// ====== 状態異常のターン開始処理 ======
// 戻り値: true なら このターン行動不可(Stun)
function processStatusEffects(unit) {
  let skipTurn = false;

  for (const status of unit.statuses) {
    if (status.type === 'poison') {
      // 毒ダメージ(防御無視)
      const dmg = status.dmg || 5;
      const wasAlive = unit.hp > 0;
      unit.hp = Math.max(0, unit.hp - dmg);
      // ★B-3: 毒で殺した瞬間のcaster記録(複数毒重ねがけの場合は最初に致命傷を入れた毒のcaster)
      if (wasAlive && unit.hp === 0 && status.casterId) {
        unit.killedBy = status.casterId;
      }
      showDamagePopup(unit, dmg, false, 'poison');
      addLog(`${unit.name} は<span style="color:#88e060">毒</span>で${dmg}ダメージ`);
      flashUnit(unit, 'poison');
    }

    if (status.type === 'stun') {
      skipTurn = true;
    }
  }

  // ★毒等でHP0になったらkillUnit
  if (unit.hp <= 0 && !unit.dead) {
    setTimeout(() => killUnit(unit), 400);
    skipTurn = true;
  }

  return skipTurn;
}

// ====== ターン終了時に状態異常のターン数を減らす ======
function decrementStatuses(unit) {
  unit.statuses = unit.statuses.filter(s => {
    s.turns--;
    if (s.turns <= 0) {
      const def = STATUS_EFFECTS[s.type];
      if (def) addLog(`${unit.name} の${def.ja}が解除`);
      return false;
    }
    return true;
  });
}

// ====== ユニットにフラッシュエフェクト ======
function flashUnit(unit, type) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  const cell = grid.children[unit.y * BATTLE_W + unit.x];
  if (!cell) return;
  const unitEl = cell.querySelector('.unit');
  if (!unitEl) return;
  unitEl.classList.add(`flash-${type}`);
  setTimeout(() => unitEl.classList.remove(`flash-${type}`), 500);
}

// ====== 移動範囲計算 (BFS, 地形コスト考慮) ======
function calcMoveRange(unit) {
  const moveCells = [];
  const dashCells = [];

  // Slow状態だと移動範囲が-1
  const isSlow = unit.statuses && unit.statuses.some(s => s.type === 'slow');
  const slowPenalty = isSlow ? 1 : 0;
  const effectiveMove = Math.max(1, unit.move - slowPenalty);
  const effectiveDash = Math.max(1, unit.dash - slowPenalty);

  // BFS: 各マスへの最短移動コストを計算
  const totalBudget = effectiveMove + (unit.st >= 35 && !unit.hasDashed ? effectiveDash : 0);
  const distMap = {};
  distMap[`${unit.x},${unit.y}`] = 0;

  const queue = [{x: unit.x, y: unit.y, cost: 0}];
  while (queue.length > 0) {
    const {x, y, cost} = queue.shift();

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (!isPassable(nx, ny)) continue;

      const stepCost = getMoveCost(nx, ny);
      const newCost = cost + stepCost;

      if (newCost > totalBudget) continue;

      const key = `${nx},${ny}`;
      if (distMap[key] !== undefined && distMap[key] <= newCost) continue;

      distMap[key] = newCost;
      queue.push({x: nx, y: ny, cost: newCost});
    }
  }

  // 結果を分類
  Object.entries(distMap).forEach(([key, cost]) => {
    if (cost === 0) return; // 自分の位置
    const [x, y] = key.split(',').map(Number);

    if (cost <= effectiveMove && !unit.hasMoved) {
      moveCells.push({x, y, cost});
    } else if (cost <= totalBudget && unit.st >= 35 && !unit.hasDashed) {
      dashCells.push({x, y, cost});
    }
  });

  return { moveCells, dashCells };
}

// ====== 移動範囲表示 ======
function showMoveRange(unit) {
  // 既存のハイライトをクリア
  document.querySelectorAll('.grid-cell.move-range, .grid-cell.dash-range').forEach(c => {
    c.classList.remove('move-range', 'dash-range');
    c.onclick = null;
  });

  if (unit.side !== 'ally' || unit.dead) return;

  const { moveCells, dashCells } = calcMoveRange(unit);
  const grid = document.getElementById('battle-grid');

  moveCells.forEach(({x, y}) => {
    const cell = grid.children[y * BATTLE_W + x];
    cell.classList.add('move-range');
    cell.onclick = () => moveUnit(unit, x, y, false);
  });

  dashCells.forEach(({x, y}) => {
    const cell = grid.children[y * BATTLE_W + x];
    cell.classList.add('dash-range');
    cell.onclick = () => moveUnit(unit, x, y, true);
  });
}

// ====== ユニットへスクロール ======
function scrollToUnit(unit) {
  if (!unit) return;
  const grid = document.getElementById('battle-grid');
  const wrap = document.querySelector('.battle-grid-wrap');
  if (!grid || !wrap) return;
  const cellIdx = unit.y * BATTLE_W + unit.x;
  const cell = grid.children[cellIdx];
  if (!cell) return;
  const cellRect = cell.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  if (cellRect.left < wrapRect.left || cellRect.right > wrapRect.right) {
    cell.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
  }
}

// ====== キャラ詳細画面(スクショ準拠) ======
let charDetailIdx = 0;
let selectedItemSlotIdx = -1; // 詳細表示中のアイテムスロット(-1なら未選択)

function openEquipScreen() {
  charDetailIdx = 0;
  selectedItemSlotIdx = -1;
  renderCharDetail();
}

// キャラの装備込みステータスを計算して表示HTML返す
function renderCharStats(pd) {
  const cls = CLASSES[pd.classKey];
  const skills = SKILLS[pd.classKey] || [];

  // 装備ボーナス計算(applyEquipment と同じロジック簡易版)
  let armorBonus = [0, 0, 0];
  let maxHpBonus = 0, maxStBonus = 0;
  let allDmg = 0, singleDmg = 0, critBonus = 0;
  let hpRegen = 0, stRegen = 0, waitHp = 0, aoeHeal = 0;

  (pd.equipped || []).forEach(key => {
    const item = ITEMS[key];
    if (!item) return;
    const s = item.stat;
    if (s.armor) for (let i = 0; i < 3; i++) armorBonus[i] += s.armor[i];
    if (s.max_hp) maxHpBonus += s.max_hp;
    if (s.max_st) maxStBonus += s.max_st;
    if (s.all_dmg) allDmg += s.all_dmg;
    if (s.single_dmg) singleDmg += s.single_dmg;
    if (s.crit_bonus) critBonus += s.crit_bonus;
    if (s.hp_regen) hpRegen += s.hp_regen;
    if (s.st_regen) stRegen += s.st_regen;
    if (s.wait_hp) waitHp += s.wait_hp;
    if (s.aoe_heal) aoeHeal += s.aoe_heal;
  });

  // パッシブのarmorBonus
  const passive = CLASS_PASSIVES[pd.classKey];
  const pLv = pd.passiveLevel || 1;
  let passiveArmor = [0, 0, 0];
  let passiveCritBonus = 0;
  if (passive) {
    const scaled = scalePassiveByLevel(passive, pLv);
    if (scaled.armorBonus) passiveArmor = scaled.armorBonus;
    if (scaled.critBonus) passiveCritBonus = scaled.critBonus;
  }

  const baseArmor = cls.armor;
  const totalArmor = [
    baseArmor[0] + passiveArmor[0] + armorBonus[0],
    baseArmor[1] + passiveArmor[1] + armorBonus[1],
    baseArmor[2] + passiveArmor[2] + armorBonus[2],
  ];

  const armorBonusStr = (i) => {
    const eq = passiveArmor[i] + armorBonus[i];
    return eq > 0 ? `<span style="color:#6c4;">(+${eq})</span>` : '';
  };

  // ★Phase 3 A-1: MaxST計算をヘルパーで統一
  // 未習得スキル(Lv0)は計算に含まない、原作仕様通り
  let maxST = calcMaxST(pd.classKey, pd.skillLevels);
  maxST += maxStBonus;

  // ★代表スキル(攻撃)の値を計算
  const attackSkills = skills.filter(s => s.damage > 0);
  let attackSummaryHTML = '';
  if (attackSkills.length > 0) {
    // ★クラス毎の基本攻撃(BASIC_ATTACKS)を代表として表示
    // BASIC_ATTACKS が SKILLS 配列内に存在すればそれを使う、なければ最初の攻撃スキル
    const basicAtk = BASIC_ATTACKS[pd.classKey];
    let main = attackSkills[0];
    if (basicAtk) {
      const found = attackSkills.find(s => s.name === basicAtk.name);
      if (found) main = found;
    }
    const realIdx = skills.indexOf(main);
    const sLv = (pd.skillLevels && pd.skillLevels[realIdx]) || 1;
    const dmgTable = [0, 5, 10, 18, 28];
    const lvDmgBonus = Math.floor((dmgTable[sLv - 1] || 0) / Math.max(1, main.hits));
    const totalDmg = main.damage + allDmg + (main.hits === 1 ? singleDmg : 0) + lvDmgBonus;
    const dmgStr = main.hits > 1 ? `${totalDmg}×${main.hits}` : `${totalDmg}`;
    const typeLabel = { M: '近接', R: '遠距', S: '魔法' }[main.type] || '';
    const totalCrit = main.crit + critBonus + passiveCritBonus + (sLv - 1) * 5;
    attackSummaryHTML = `
      <div class="char-stat-pill char-stat-attack">
        <span class="char-stat-label">攻撃</span>
        <span class="char-stat-value">${dmgStr}<span class="char-stat-sub">(${typeLabel} R${main.range})</span></span>
      </div>
      <div class="char-stat-pill char-stat-crit">
        <span class="char-stat-label">Crit</span>
        <span class="char-stat-value">${totalCrit}%</span>
      </div>
    `;
  }

  // 装備ボーナス効果のサマリ
  const bonusParts = [];
  if (maxHpBonus > 0) bonusParts.push(`HP+${maxHpBonus}`);
  if (allDmg > 0) bonusParts.push(`攻撃+${allDmg}`);
  if (singleDmg > 0) bonusParts.push(`単発+${singleDmg}`);
  if (critBonus > 0) bonusParts.push(`Crit+${critBonus}%`);
  if (hpRegen > 0) bonusParts.push(`HP再生+${hpRegen}/T`);
  if (stRegen > 0) bonusParts.push(`ST再生+${stRegen}/T`);
  if (waitHp > 0) bonusParts.push(`待機HP+${waitHp}`);
  if (aoeHeal > 0) bonusParts.push(`隣接回復+${aoeHeal}/T`);

  const bonusHTML = bonusParts.length > 0
    ? `<div class="char-stats-bonus">⚡ ${bonusParts.join(' / ')}</div>`
    : '';

  // ★HP/XPバー(ステータス内に統合)
  const hpPct = pd.maxHP > 0 ? (pd.hp / pd.maxHP) * 100 : 0;
  const expReq = expRequired(pd.level);
  const xpPct = expReq > 0 ? Math.min(100, (pd.exp / expReq) * 100) : 0;
  const nearLevelup = xpPct >= 80 ? 'near-levelup' : '';
  const hpxpHTML = `
    <div class="char-hpxp-row">
      <div class="char-hpxp-line">
        <div class="char-hpxp-label">HP</div>
        <div class="char-hpxp-bar"><div class="char-hpxp-fill hp" style="width: ${hpPct}%"></div></div>
        <div class="char-hpxp-text">${pd.hp}/${pd.maxHP}</div>
      </div>
      <div class="char-hpxp-line">
        <div class="char-hpxp-label">XP</div>
        <div class="char-hpxp-bar"><div class="char-hpxp-fill xp ${nearLevelup}" style="width: ${xpPct}%"></div></div>
        <div class="char-hpxp-text">${pd.exp}/${expReq}</div>
      </div>
    </div>
  `;

  return `
    <div class="char-stats-area">
      <div class="char-stats-row">
        ${attackSummaryHTML}
      </div>
      <div class="char-stats-row">
        <div class="char-stat-pill"><span class="char-stat-label">ST</span><span class="char-stat-value">${pd.st !== undefined ? pd.st : maxST}/${maxST}</span></div>
        <div class="char-stat-pill"><span class="char-stat-label">移動</span><span class="char-stat-value">${cls.move}/${cls.dash}</span></div>
      </div>
      <div class="char-stats-row">
        <div class="char-stat-pill armor-m" onclick="showArmorInfoPopup('M')"><span class="char-stat-label">近接</span><span class="char-stat-value">${totalArmor[0]}${armorBonusStr(0)}</span></div>
        <div class="char-stat-pill armor-r" onclick="showArmorInfoPopup('R')"><span class="char-stat-label">遠距</span><span class="char-stat-value">${totalArmor[1]}${armorBonusStr(1)}</span></div>
        <div class="char-stat-pill armor-s" onclick="showArmorInfoPopup('S')"><span class="char-stat-label">魔法</span><span class="char-stat-value">${totalArmor[2]}${armorBonusStr(2)}</span></div>
      </div>
      ${hpxpHTML}
      ${bonusHTML}
    </div>
  `;
}

// ★防御軸の説明ポップアップ(タップで開く、外タッチで閉じる)
function showArmorInfoPopup(type) {
  // 既存のポップアップは閉じる
  document.querySelectorAll('.armor-info-popup').forEach(p => p.remove());

  const info = {
    M: { title: '近接防御 (Melee)', icon: '⚔', color: '#c44',
         desc: '剣・拳・牙など、隣接攻撃に対する防御値。\n\nタイプMのスキルからのダメージを軽減する。\n\n値が高いほど被ダメージが減る(完全防御は基本ダメージ - 防御値 が最終ダメージ、最低1)。' },
    R: { title: '遠距離防御 (Ranged)', icon: '🏹', color: '#4a8',
         desc: '弓・投擲・銃など、物理飛び道具に対する防御値。\n\nタイプRのスキルからのダメージを軽減する。\n\nアーチャー・レンジャー等の主要攻撃に効く。' },
    S: { title: '魔法防御 (Spell)', icon: '✨', color: '#a4c',
         desc: '錬金術・呪文・毒など、魔法/特殊攻撃に対する防御値。\n\nタイプSのスキルからのダメージを軽減する。\n\nアルケミスト・ロケッティア・サーペント等のスキルに効く。' },
  }[type];

  if (!info) return;

  const popup = document.createElement('div');
  popup.className = 'armor-info-popup';
  popup.innerHTML = `
    <div class="armor-info-content" onclick="event.stopPropagation();">
      <div class="armor-info-header" style="border-bottom-color: ${info.color};">
        <span class="armor-info-icon" style="color: ${info.color};">${info.icon}</span>
        <span class="armor-info-title">${info.title}</span>
      </div>
      <div class="armor-info-desc">${info.desc.replace(/\n/g, '<br>')}</div>
      <div class="armor-info-hint">外をタップで閉じる</div>
    </div>
  `;
  // 外側タップで閉じる
  popup.onclick = () => popup.remove();
  document.body.appendChild(popup);
}

function renderCharDetail() {
  // 既存削除
  document.querySelectorAll('.char-detail-overlay').forEach(o => o.remove());

  const pd = state.partyData[charDetailIdx];
  if (!pd) return;
  const cls = CLASSES[pd.classKey];
  const skills = SKILLS[pd.classKey] || [];
  const passive = CLASS_PASSIVES[pd.classKey];

  // EXP / HP の割合
  const expPct = Math.min(100, (pd.exp / expRequired(pd.level)) * 100);
  const hpPct = (pd.hp / pd.maxHP) * 100;

  // アイテムスロット(最大3つ)
  const slots = [0, 1, 2].map(i => {
    const itemKey = pd.equipped[i];
    if (!itemKey) {
      return `
        <div class="char-item-slot empty" onclick="openInvPicker(${i})">
          <div class="char-item-label">Item ${i + 1}:</div>
          <div class="char-item-icon empty">+</div>
        </div>
      `;
    }
    const item = ITEMS[itemKey];
    const colorClass = `color-${item.color}`;
    const icon = item.color === 'orange' ? '🍞' : (item.color === 'blue' ? '🛡' : '✨');
    const selected = (i === selectedItemSlotIdx) ? 'selected' : '';
    return `
      <div class="char-item-slot ${selected}" onclick="selectItemSlot(${i})">
        <div class="char-item-label">Item ${i + 1}:</div>
        <div class="char-item-icon ${colorClass}">${icon}</div>
      </div>
    `;
  }).join('');

  // 中央下: アイテム詳細
  let itemDetailHTML;
  if (selectedItemSlotIdx >= 0 && pd.equipped[selectedItemSlotIdx]) {
    const item = ITEMS[pd.equipped[selectedItemSlotIdx]];
    itemDetailHTML = `
      <div class="char-item-detail-header">
        <div class="char-item-detail-name">${item.name_ja}</div>
        <div class="char-item-detail-value">Value: ${item.value}</div>
      </div>
      <div class="char-item-detail-text">${item.effect}</div>
      <button class="btn" onclick="unequipItem(${selectedItemSlotIdx})" style="margin-top: 4px; font-size: 9px; padding: 3px 8px;">外す</button>
    `;
  } else {
    itemDetailHTML = `
      <div class="char-item-detail-text" style="color: #5a4a30;">
        アイテムを選択すると詳細が表示されます<br>
        空きスロットをタップで装備可能
      </div>
    `;
  }

  // スキル分類: 攻撃 / パッシブ
  // ★バフ・自分対象スキル(damage=0, range=0)も含める。passiveフラグなし=アクティブスキル全部
  // ★FIX: 元のSKILLS配列でのindexを保持(_origIdx)、skillLevels参照のキーずれ防止
  const attackSkills = skills
    .map((s, origIdx) => ({ ...s, _origIdx: origIdx }))
    .filter(s => !s.isPassive);
  const passiveSkills = passive ? [{ name_ja: passive.name, lv: pd.level, isPassive: true, desc: passive.desc }] : [];

  const skillPointsLeft = pd.skillPoints || 0;
  const attackSkillsHTML = attackSkills.map((s) => {
    const sIdx = s._origIdx;  // ★元のSKILLS配列でのindex(skillLevelsはこれで参照)
    const rawLv = pd.skillLevels && (pd.skillLevels[sIdx] !== undefined) ? pd.skillLevels[sIdx] : 1;
    const isUnlearned = rawLv === 0;
    const sLv = isUnlearned ? 0 : rawLv;
    // ★Phase 2修正: 未習得スキルはLv10未満ならSP振り不可(報酬イベント限定)
    const canSpUnlearn = isUnlearned && pd.level >= 10;
    const canUpgrade = skillPointsLeft > 0 && sLv < 5 && (!isUnlearned || canSpUnlearn);
    const upBtn = canUpgrade
      ? `<button class="sp-up-btn" onclick="event.stopPropagation(); upgradeSkill(${sIdx})">+</button>`
      : '';

    // ★ダメージ計算(Lvボーナス込み)
    const dmgTable = [0, 5, 10, 18, 28];
    const lvDmgBonus = sLv > 0 ? Math.floor((dmgTable[sLv - 1] || 0) / Math.max(1, s.hits)) : 0;
    const dispDmg = s.damage + lvDmgBonus;
    let dmgStr;
    if (s.damage < 0) {
      dmgStr = `回復${-s.damage}`;
    } else if (s.damage === 0) {
      dmgStr = '効果のみ';
    } else {
      dmgStr = s.hits > 1 ? `${dispDmg}×${s.hits}` : `${dispDmg}`;
    }

    // タイプ・射程
    const typeLabel = { M: '近', R: '遠', S: '魔' }[s.type] || '';
    const typeColor = { M: 'type-m', R: 'type-r', S: 'type-s' }[s.type] || '';
    const rangeStr = s.range > 0 ? `R${s.range}` : '自';

    // 状態異常タグ(短縮形)
    let statusTag = '';
    if (s.status) {
      const statusMap = {
        stun: '麻痺', daze: '混乱', daze_aoe: '混乱範',
        slow: '鈍化', poison: '毒', poison_strong: '強毒', poison_aoe: '毒範',
        heal: '回復', armor_down: '防↓', armor_down_full: '防↓↓', armor_down_all: '全防↓',
        buff_crit: 'C+', self_atk_up: '攻+', self_def_up: '防+',
        self_heal: '自回', buff_atk_aoe: '攻範',
        st_drain: 'ST奪', st_drain_full: 'ST全奪', st_drain_50: 'ST50奪',
        aoe_around: '範', aoe_2: '範2', aoe_3: '範3',
      };
      const label = statusMap[s.status] || s.status.slice(0, 2);
      statusTag = `<span class="char-skill-status">${label}</span>`;
    }

    return `
    <div class="char-skill-row${isUnlearned ? ' skill-unlearned' : ''}" onclick="showSkillDetail('attack', ${sIdx})">
      <div class="char-skill-info">
        <div class="char-skill-name">${s.name}${isUnlearned ? ' <span style="color:#888; font-size:9px;">(未習得)</span>' : ''}</div>
        <div class="char-skill-meta">
          <span class="char-skill-type ${typeColor}">${typeLabel}</span>
          <span class="char-skill-dmg">${dmgStr}</span>
          <span class="char-skill-range">${rangeStr}</span>
          ${statusTag}
        </div>
      </div>
      ${upBtn}
      <div class="char-skill-lv">${isUnlearned ? '-' : sLv}</div>
    </div>
  `;
  }).join('');

  const pLv = pd.passiveLevel || 1;
  const passiveSkillsHTML = passiveSkills.length > 0
    ? passiveSkills.map((p, pIdx) => {
        const canUpgrade = skillPointsLeft > 0 && pLv < 5;
        const upBtn = canUpgrade
          ? `<button class="sp-up-btn" onclick="event.stopPropagation(); upgradePassive()">+</button>`
          : '';
        return `
        <div class="char-skill-row" onclick="showSkillDetail('passive', ${pIdx})">
          <div class="char-skill-name">${p.name_ja}</div>
          ${upBtn}
          <div class="char-skill-lv">${pLv}</div>
        </div>
      `;
      }).join('')
    : '<div style="font-size: 9px; color: #5a4a30; text-align: center; padding: 8px;">パッシブなし</div>';

  // ナビゲーションドット
  const dotsHTML = state.partyData.map((_, i) => `
    <div class="nav-dot ${i === charDetailIdx ? 'active' : ''}" onclick="navToChar(${i})"></div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'char-detail-overlay';
  overlay.innerHTML = `
    <div class="char-detail-main">
      <!-- 左: アイテムスロット -->
      <div class="char-items-col">
        ${slots}
      </div>

      <!-- 中央: キャラ + ステータス + アイテム詳細 -->
      <div class="char-center-col">
        <div class="char-portrait-area">
          <div class="char-name-display">
            ${pd.charName ? pd.charName : cls.name_ja}<span class="level-badge">Lv${pd.level}</span>
            ${pd.skillPoints > 0 ? `<span class="sp-badge">SP ${pd.skillPoints}</span>` : ''}
          </div>
          ${pd.charName ? `<div style="font-size: 9px; color: #a8956e; letter-spacing: 1px; margin-bottom: 2px;">${cls.name_ja}</div>` : ''}
          <div class="char-portrait-img">
            <img src="data:image/png;base64,${SPRITES[pd.classKey]}">
          </div>
        </div>
        ${renderCharStats(pd)}
        <div class="char-item-detail">
          ${itemDetailHTML}
        </div>
      </div>

      <!-- 右: スキル一覧 -->
      <div class="char-skills-col">
        <div class="char-skills-section">
          <div class="char-skills-title">Attacks</div>
          <div class="char-skill-list">${attackSkillsHTML}</div>
        </div>
        <div class="char-skills-section">
          <div class="char-skills-title">Passives</div>
          <div class="char-skill-list">${passiveSkillsHTML}</div>
        </div>
      </div>
    </div>

    <!-- 下部: ナビ -->
    <div class="char-detail-footer">
      <button class="btn" onclick="closeCharDetail()" style="font-size: 11px; padding: 5px 14px;">◀ 閉じる</button>
      <button class="btn" onclick="navToChar(${charDetailIdx - 1})" style="font-size: 11px; padding: 5px 12px;" ${charDetailIdx === 0 ? 'disabled' : ''}>＜</button>
      <div class="char-nav-dots">${dotsHTML}</div>
      <button class="btn" onclick="navToChar(${charDetailIdx + 1})" style="font-size: 11px; padding: 5px 12px;" ${charDetailIdx === state.partyData.length - 1 ? 'disabled' : ''}>＞</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function upgradePassive() {
  const pd = state.partyData[charDetailIdx];
  if (!pd || !pd.skillPoints || pd.skillPoints <= 0) return;
  const cur = pd.passiveLevel || 1;
  if (cur >= 5) {
    addLogEquipToast('パッシブLv上限(5)');
    return;
  }
  pd.passiveLevel = cur + 1;
  pd.skillPoints--;

  const passive = CLASS_PASSIVES[pd.classKey];
  const pName = passive ? passive.name : 'パッシブ';
  addLogEquipToast(`${pName} Lv${cur + 1} に強化!`);

  renderCharDetail();
}

function upgradeSkill(sIdx) {
  const pd = state.partyData[charDetailIdx];
  if (!pd || !pd.skillPoints || pd.skillPoints <= 0) return;
  if (!pd.skillLevels) pd.skillLevels = {};
  const cur = pd.skillLevels[sIdx];
  // 未定義 → 1扱い、0(未習得) → 0、それ以外はそのまま
  const curLv = (cur === undefined) ? 1 : cur;

  // ★Phase 2修正: 未習得(Lv0)スキルはSPで習得不可。
  // 報酬イベントでのみ習得できる仕様。Lv10以上のキャラなら例外的にSP習得を許可。
  if (curLv === 0 && pd.level < 10) {
    addLogEquipToast('未習得スキルはイベント報酬で習得 (Lv10以降はSPで可)');
    return;
  }

  if (curLv >= 5) {
    addLogEquipToast('スキルLv上限(5)');
    return;
  }
  pd.skillLevels[sIdx] = curLv + 1;
  pd.skillPoints--;

  // トースト
  const skills = SKILLS[pd.classKey] || [];
  const sName = skills[sIdx] ? skills[sIdx].name : 'スキル';
  if (curLv === 0) {
    addLogEquipToast(`${sName} を習得!`);
  } else {
    addLogEquipToast(`${sName} Lv${curLv + 1} に強化!`);
  }

  // 再描画
  renderCharDetail();
}

function addLogEquipToast(msg) {
  const existing = document.querySelector('.equip-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'equip-toast';
  toast.style.cssText = 'position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); background: rgba(40,30,20,0.95); color: #d4c5a9; padding: 8px 16px; border: 1px solid #d4a020; font-size: 11px; z-index: 200;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function closeCharDetail() {
  document.querySelectorAll('.char-detail-overlay').forEach(o => o.remove());
  document.querySelectorAll('.inv-picker').forEach(o => o.remove());
  document.querySelectorAll('.skill-detail-popup').forEach(o => o.remove());
}

// ====== スキル詳細ポップアップ ======
function showSkillDetail(kind, idx) {
  const pd = state.partyData[charDetailIdx];
  if (!pd) return;

  let popupHTML = '';

  if (kind === 'attack') {
    const skills = SKILLS[pd.classKey] || [];
    // ★FIX: idxは renderCharDetail で _origIdx を渡すように修正済み = 元SKILLS配列のindex
    const s = skills[idx];
    if (!s) return;

    const sLv = (pd.skillLevels && pd.skillLevels[idx]) || 1;
    const dmgTable = [0, 5, 10, 18, 28];
    const lvDmgBonus = dmgTable[sLv - 1] || 0;
    const lvCritBonus = (sLv - 1) * 5;
    const nextDmgBonus = dmgTable[sLv] || 0;
    const nextCritBonus = sLv * 5;

    const typeLabel = { M: '近接', R: '遠距離', S: '魔法' }[s.type];
    let dmgStr;
    if (s.damage < 0) dmgStr = `回復 ${-s.damage}`;
    else if (s.damage === 0) dmgStr = '効果のみ';
    else {
      const baseDmg = s.damage + lvDmgBonus;
      dmgStr = s.hits > 1 ? `${baseDmg}×${s.hits}` : `${baseDmg}`;
    }

    // 状態異常名を日本語化
    let statusLabel = '';
    if (s.status) {
      const map = {
        'stun': '麻痺付与', 'daze': '混乱付与', 'daze_aoe': '範囲混乱',
        'slow': '鈍化付与', 'poison': '毒付与', 'poison_strong': '強毒',
        'poison_aoe': '範囲毒', 'heal': '回復',
        'armor_down': '防御Down', 'armor_down_full': '完全防御Down',
        'armor_down_all': '全軸防御Down',
        'buff_crit': 'Crit付与', 'buff_atk_aoe': '範囲攻撃UP',
        'self_atk_up': '自身攻撃UP', 'self_def_up': '自身防御UP',
        'self_heal': 'HP回復',
        'st_drain': 'ST奪取', 'st_drain_full': 'ST奪取(確定)',
        'st_drain_50': 'ST奪取(50%)',
        'aoe_2': '範囲2', 'aoe_3': '前方3', 'aoe_around': '隣接全',
        'extra_magic': '追加魔法',
        'self_st_save': 'STコスト削減', 'self_st_recover': 'ST全快',
        'slow_st_drain': '鈍化+ST減',
      };
      statusLabel = map[s.status] || s.status;
    }

    const statusTag = statusLabel
      ? `<div class="skill-detail-status-tag">${statusLabel}</div>`
      : '';

    const finalCrit = s.crit + lvCritBonus;
    const nextLvNote = sLv < 5
      ? `<div style="font-size: 9px; color: #6c4; margin-bottom: 8px; padding: 4px 8px; background: rgba(60, 100, 60, 0.15); border-left: 2px solid #6c4;">
           ▼ 次Lv${sLv + 1}: 威力 +${nextDmgBonus - lvDmgBonus} / Crit +${nextCritBonus - lvCritBonus}%
         </div>`
      : '<div style="font-size: 9px; color: #d4a020; margin-bottom: 8px; text-align: center;">★ 最大Lv到達</div>';

    popupHTML = `
      <div class="skill-detail-header">
        <div>
          <span class="skill-detail-name">${s.name}</span>
          <span class="skill-detail-name-en">Lv ${sLv}/5</span>
        </div>
        <div class="skill-detail-type-badge type-${s.type}">${typeLabel}</div>
      </div>
      <div class="skill-detail-stats">
        <div class="skill-detail-stat">
          <div class="skill-detail-stat-label">威力</div>
          <div class="skill-detail-stat-value">${dmgStr}</div>
        </div>
        <div class="skill-detail-stat">
          <div class="skill-detail-stat-label">射程</div>
          <div class="skill-detail-stat-value">${s.minRange && s.minRange > 1 ? `${s.minRange}-${s.range}` : s.range}</div>
        </div>
        <div class="skill-detail-stat">
          <div class="skill-detail-stat-label">ST消費</div>
          <div class="skill-detail-stat-value">${s.cost}</div>
        </div>
        <div class="skill-detail-stat">
          <div class="skill-detail-stat-label">Crit率</div>
          <div class="skill-detail-stat-value">${finalCrit}%</div>
        </div>
        <div class="skill-detail-stat">
          <div class="skill-detail-stat-label">ヒット数</div>
          <div class="skill-detail-stat-value">${s.hits}</div>
        </div>
        <div class="skill-detail-stat">
          <div class="skill-detail-stat-label">スキルLv</div>
          <div class="skill-detail-stat-value">${sLv}</div>
        </div>
      </div>
      ${statusTag}
      <div class="skill-detail-desc">${s.note || '基本攻撃スキル。'}</div>
      ${nextLvNote}
      <button class="skill-detail-close" onclick="closeSkillDetail()">閉じる</button>
    `;
  } else if (kind === 'passive') {
    const basePassive = CLASS_PASSIVES[pd.classKey];
    if (!basePassive) return;
    const pLv = pd.passiveLevel || 1;
    const scaled = scalePassiveByLevel(basePassive, pLv);

    let currentParts = [];
    let nextParts = [];
    const nextScaled = pLv < 5 ? scalePassiveByLevel(basePassive, pLv + 1) : null;

    if (scaled.statusResist) {
      currentParts.push(`状態異常を ${scaled.statusResist}% 無効化`);
      if (nextScaled) nextParts.push(`${nextScaled.statusResist}% 無効化`);
    }
    if (scaled.armorBonus) {
      currentParts.push(`全軸装甲 +${scaled.armorBonus[0]}`);
      if (nextScaled) nextParts.push(`全軸装甲 +${nextScaled.armorBonus[0]}`);
    }
    if (scaled.critBonus) {
      currentParts.push(`Crit率 +${scaled.critBonus}%`);
      if (nextScaled) nextParts.push(`Crit率 +${nextScaled.critBonus}%`);
    }
    if (scaled.damageMul) {
      currentParts.push(`ダメージ ×${scaled.damageMul.toFixed(2)}`);
      if (nextScaled) nextParts.push(`ダメージ ×${nextScaled.damageMul.toFixed(2)}`);
    }
    if (scaled.multiAction) {
      currentParts.push(`1ターン ${scaled.multiAction} 回行動`);
    }
    if (scaled.hpBonus !== undefined && scaled.hpBonus > 0) {
      currentParts.push(`最大HP +${scaled.hpBonus}`);
      if (nextScaled && nextScaled.hpBonus > scaled.hpBonus) nextParts.push(`最大HP +${nextScaled.hpBonus}`);
    }
    if (scaled.summonOnStart) {
      const hpMul = 1 + (pLv - 1) * 0.25;
      const dmgBonus = (pLv - 1) * 4;
      currentParts.push(`戦闘開始時 番犬召喚`);
      currentParts.push(`└ ペットHP ×${hpMul.toFixed(2)} / 攻撃 +${dmgBonus}`);
      if (nextScaled) {
        const nHpMul = 1 + pLv * 0.25;
        const nDmgBonus = pLv * 4;
        nextParts.push(`ペットHP ×${nHpMul.toFixed(2)} / 攻撃 +${nDmgBonus}`);
      }
    }
    if (scaled.rangedDmgBonus) {
      currentParts.push(`遠距離・魔法ダメージ +${scaled.rangedDmgBonus}`);
      if (nextScaled) nextParts.push(`遠距離・魔法ダメージ +${nextScaled.rangedDmgBonus}`);
    }
    // ★FIX: 英雄の威風 (Champion)
    if (scaled.auraArmorBonus) {
      const a = scaled.auraArmorBonus;
      currentParts.push(`隣接味方の装甲 近+${a[0]} / 遠+${a[1]} / 魔+${a[2]}`);
      if (nextScaled && nextScaled.auraArmorBonus) {
        const n = nextScaled.auraArmorBonus;
        nextParts.push(`隣接味方の装甲 近+${n[0]} / 遠+${n[1]} / 魔+${n[2]}`);
      }
    }
    // ★FIX: 癒しの祈り (Healer)
    if (scaled.auraHealOnTurn) {
      currentParts.push(`ターン開始時、隣接仲間のHPを +${scaled.auraHealOnTurn} 回復`);
      if (nextScaled && nextScaled.auraHealOnTurn) {
        nextParts.push(`隣接仲間のHPを +${nextScaled.auraHealOnTurn} 回復`);
      }
    }
    // ★FIX: 反射神経 (Gladiator)
    if (scaled.aoeReduction) {
      currentParts.push(`範囲攻撃のダメージを ${Math.round(scaled.aoeReduction * 100)}% 軽減`);
      if (nextScaled && nextScaled.aoeReduction) {
        nextParts.push(`範囲攻撃のダメージを ${Math.round(nextScaled.aoeReduction * 100)}% 軽減`);
      }
    }
    // ★FIX: 猟師の技 (Jungleman)
    if (scaled.statusBonus) {
      currentParts.push(`状態異常付与の確率 +${scaled.statusBonus}%`);
      if (nextScaled && nextScaled.statusBonus) {
        nextParts.push(`状態異常付与の確率 +${nextScaled.statusBonus}%`);
      }
    }
    // ★FIX: 瘴気 (Serpent)
    if (scaled.auraDamage) {
      currentParts.push(`ターン開始時、${scaled.auraDamage.range}マス以内の敵に 魔法${scaled.auraDamage.damage} ダメージ`);
      if (nextScaled && nextScaled.auraDamage) {
        nextParts.push(`${nextScaled.auraDamage.range}マス以内の敵に 魔法${nextScaled.auraDamage.damage} ダメージ`);
      }
    }
    // ★ 盗賊団首領のフレーバー専用パッシブ
    if (basePassive.flavorOnly) {
      currentParts = [basePassive.desc];
      nextParts = [];
    }

    const currentText = currentParts.length > 0 ? currentParts.join('<br>') : basePassive.desc;
    const nextText = nextParts.length > 0 ? nextParts.join('<br>') : '';

    popupHTML = `
      <div class="skill-detail-header">
        <div>
          <span class="skill-detail-name">${basePassive.name}</span>
          <span class="skill-detail-name-en">Lv ${pLv}/5</span>
        </div>
        <div class="skill-detail-type-badge passive">パッシブ</div>
      </div>
      <div class="skill-detail-desc">
        <div style="color: #d4a020; font-size: 10px; margin-bottom: 4px;">▼ 現在 (Lv${pLv})</div>
        ${currentText}
      </div>
      ${nextText ? `
        <div class="skill-detail-desc" style="border-left-color: #6c4;">
          <div style="color: #6c4; font-size: 10px; margin-bottom: 4px;">▼ 次Lv${pLv + 1}</div>
          ${nextText}
        </div>
      ` : '<div style="font-size: 10px; color: #d4a020; text-align: center; margin-bottom: 8px;">★ 最大Lvに到達</div>'}
      <div style="font-size: 10px; color: #8b7355; margin-bottom: 10px; text-align: center;">
        ※常時発動。戦闘中ずっと効果を発揮します。
      </div>
      <button class="skill-detail-close" onclick="closeSkillDetail()">閉じる</button>
    `;
  }

  // 既存ポップアップ削除
  document.querySelectorAll('.skill-detail-popup').forEach(o => o.remove());

  const overlay = document.createElement('div');
  overlay.className = 'skill-detail-popup';
  overlay.onclick = (e) => { if (e.target === overlay) closeSkillDetail(); };

  const content = document.createElement('div');
  content.className = 'skill-detail-content';
  content.innerHTML = popupHTML;
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

function closeSkillDetail() {
  document.querySelectorAll('.skill-detail-popup').forEach(o => o.remove());
}

function navToChar(idx) {
  if (idx < 0 || idx >= state.partyData.length) return;
  charDetailIdx = idx;
  selectedItemSlotIdx = -1;
  renderCharDetail();
}

function selectItemSlot(slotIdx) {
  selectedItemSlotIdx = (selectedItemSlotIdx === slotIdx) ? -1 : slotIdx;
  renderCharDetail();
}

function unequipItem(slotIdx) {
  const pd = state.partyData[charDetailIdx];
  pd.equipped.splice(slotIdx, 1);
  selectedItemSlotIdx = -1;
  renderCharDetail();
}

// ====== インベントリピッカー(空きスロットからアイテムを装備) ======
function openInvPicker(slotIdx) {
  document.querySelectorAll('.inv-picker').forEach(o => o.remove());

  const pd = state.partyData[charDetailIdx];

  // 装備可能なアイテム = 自分が装備していない & 他のキャラも装備していない
  const availableItems = [];
  state.inventory.forEach((key, invIdx) => {
    const equippedBy = state.partyData.findIndex(p => p.equipped.includes(key));
    if (equippedBy < 0) {
      availableItems.push({ key, invIdx });
    }
  });

  const overlay = document.createElement('div');
  overlay.className = 'inv-picker';
  overlay.innerHTML = `
    <div class="inv-picker-content">
      <div class="inv-picker-title">Item ${slotIdx + 1} に装備</div>
      <div class="inv-picker-list" id="inv-picker-list"></div>
      <button class="btn" onclick="closeInvPicker()" style="width: 100%; font-size: 11px; padding: 6px;">キャンセル</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const list = overlay.querySelector('#inv-picker-list');

  if (availableItems.length === 0) {
    list.innerHTML = '<div style="color: #5a4a30; font-size: 10px; text-align: center; padding: 20px;">装備可能なアイテムがありません</div>';
    return;
  }

  availableItems.forEach(({ key, invIdx }) => {
    const item = ITEMS[key];
    const colorClass = `color-${item.color}`;
    const icon = item.color === 'orange' ? '🍞' : (item.color === 'blue' ? '🛡' : '✨');

    const el = document.createElement('div');
    el.className = 'inventory-item';
    el.innerHTML = `
      <div class="item-icon-small ${colorClass}">${icon}</div>
      <div class="item-info">
        <div class="item-name">${item.name_ja}</div>
        <div class="item-effect">${item.effect}</div>
      </div>
      <div class="item-value">★${item.value}</div>
    `;
    el.onclick = () => equipItemAtSlot(slotIdx, key);
    list.appendChild(el);
  });
}

function closeInvPicker() {
  document.querySelectorAll('.inv-picker').forEach(o => o.remove());
}

function equipItemAtSlot(slotIdx, itemKey) {
  const pd = state.partyData[charDetailIdx];

  // 既存スロットに上書き
  if (pd.equipped[slotIdx]) {
    pd.equipped[slotIdx] = itemKey;
  } else {
    pd.equipped.push(itemKey);
  }
  selectedItemSlotIdx = slotIdx;
  closeInvPicker();
  renderCharDetail();
}

// ====== ユニットステータスポップアップ ======
function showUnitStatusPopup(u) {
  // 既存の閉じる
  document.querySelectorAll('.unit-status-popup').forEach(p => p.remove());

  const cls = CLASSES[u.classKey];
  const passive = u.passive;
  const skills = u.skills || [];

  // ステータス表示
  const hpPct = (u.hp / u.maxHP) * 100;
  const stPct = (u.st / u.maxST) * 100;

  // 装備ボーナス情報(味方のみ)
  let equipInfo = '';
  if (u.side === 'ally' && u.equipBonuses) {
    const eb = u.equipBonuses;
    const parts = [];
    if (eb.allDmg > 0) parts.push(`攻撃+${eb.allDmg}`);
    if (eb.singleDmg > 0) parts.push(`単発+${eb.singleDmg}`);
    if (eb.crit > 0) parts.push(`Crit+${eb.crit}%`);
    if (eb.hpRegen > 0) parts.push(`HP再生+${eb.hpRegen}/T`);
    if (eb.stRegen > 0) parts.push(`ST再生+${eb.stRegen}/T`);
    if (parts.length > 0) {
      equipInfo = `<div class="usp-equip">⚡ ${parts.join(' / ')}</div>`;
    }
  }

  // ステータス異常
  const statusParts = (u.statuses || []).map(s => {
    const def = STATUS_EFFECTS[s.type];
    return def ? `<span class="usp-status-tag">${def.ja}</span>` : '';
  }).join(' ');
  const statusHTML = statusParts ? `<div class="usp-statuses">${statusParts}</div>` : '';

  // パッシブ
  const passiveHTML = passive ? `<div class="usp-passive">⭐ ${passive.name}</div>` : '';

  // スキル一覧(コンパクト)
  const skillsList = skills.filter(s => s.damage !== 0 || s.range > 0).slice(0, 4).map(s => {
    const sLv = (u.skillLevels && u.skillLevels[s._skillIdx]) || 1;
    const dmgTable = [0, 5, 10, 18, 28];
    // ★味方も敵もスキルLvでダメージ補正(makeUnitで敵にもskillLevels自動生成済み)
    const totalBonus = dmgTable[sLv - 1] || 0;
    const dBonus = Math.floor(totalBonus / Math.max(1, s.hits));
    const dmg = s.damage > 0 ? `${s.damage + dBonus}${s.hits > 1 ? '×' + s.hits : ''}` : '-';
    return `<div class="usp-skill">
      <span class="usp-skill-name">${s.name}</span>
      <span class="usp-skill-stats">威${dmg} 射${s.range} ST${s.cost}</span>
    </div>`;
  }).join('');

  const popup = document.createElement('div');
  popup.className = 'unit-status-popup';
  popup.innerHTML = `
    <div class="usp-header">
      <div class="usp-name">
        <span style="color: ${u.side === 'ally' ? '#6cf' : '#f64'};">●</span>
        ${u.name}
        ${u.charName ? `<span style="font-size:9px;color:#a8956e;margin-left:4px;">(${u.classNameJa || u.name})</span>` : ''}
        <span class="usp-level">Lv${u.level}</span>
        ${u.isPet ? '<span class="usp-pet">PET</span>' : ''}
      </div>
      <button class="usp-close" onclick="closeUnitStatusPopup()">✕</button>
    </div>
    <div class="usp-body">
      <div class="usp-bars">
        <div class="usp-bar-row">
          <span class="usp-bar-label">HP</span>
          <div class="usp-bar"><div class="usp-bar-fill hp" style="width:${hpPct}%"></div></div>
          <span class="usp-bar-value">${u.hp}/${u.maxHP}</span>
        </div>
        <div class="usp-bar-row">
          <span class="usp-bar-label">ST</span>
          <div class="usp-bar"><div class="usp-bar-fill st" style="width:${stPct}%"></div></div>
          <span class="usp-bar-value">${u.st}/${u.maxST}</span>
        </div>
      </div>
      <div class="usp-stats">
        ${(() => {
          // 隣接味方からの auraArmorBonus を計算
          let aura = [0, 0, 0];
          if (battle && battle.units) {
            battle.units.forEach(o => {
              if (o.dead || o.id === u.id || o.side !== u.side) return;
              if (Math.abs(o.x - u.x) > 1 || Math.abs(o.y - u.y) > 1) return;
              if (o.passive && o.passive.auraArmorBonus) {
                for (let i = 0; i < 3; i++) aura[i] += o.passive.auraArmorBonus[i] || 0;
              }
            });
          }
          const armorStr = (i, label, cls) => {
            const base = u.armor[i] || 0;
            const total = base + aura[i];
            const bonus = aura[i] > 0 ? `<span style="color:#6c4;font-size:9px;">+${aura[i]}</span>` : '';
            return `<span class="usp-stat-pill ${cls}" title="${label}装甲">${label[0]}${total}${bonus}</span>`;
          };
          return armorStr(0, '近接', 'armor-m') + armorStr(1, '遠距', 'armor-r') + armorStr(2, '魔法', 'armor-s');
        })()}
        <span class="usp-stat-pill" title="移動">MV${u.move}</span>
        <span class="usp-stat-pill" title="DASH">DS${u.dash}</span>
      </div>
      ${equipInfo}
      ${passiveHTML}
      ${statusHTML}
      ${skillsList ? `<div class="usp-skills-section">${skillsList}</div>` : ''}
    </div>
  `;
  document.body.appendChild(popup);
}

function closeUnitStatusPopup() {
  document.querySelectorAll('.unit-status-popup').forEach(p => p.remove());
}

// ====== 距離計算(マンハッタン) ======
function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ====== スキル選択モーダルを開く ======
function toggleAttackMode() {
  const u = currentUnit();
  if (!u || u.side !== 'ally') return;

  // ★既に攻撃モード中なら、解除して移動範囲を復元
  if (battle.attackMode) {
    cancelAttackMode();
    return;
  }

  if (u.hasAttacked) {
    addLog(`${u.name} は既に攻撃済み`);
    return;
  }

  showSkillModal(u);
}

// ★攻撃モード解除 + 移動範囲復元(まだ動いてないなら)
function cancelAttackMode() {
  const u = currentUnit();
  if (!u) return;

  battle.attackMode = false;
  battle.selectedSkill = null;
  battle.aoeAimAt = null;  // ★範囲攻撃のプレビューもクリア
  document.body.classList.remove('attack-mode');
  const actionBar = document.getElementById('action-bar');
  if (actionBar) actionBar.classList.remove('attack-mode');

  // 攻撃ボタンのラベルを元に戻す
  const attackBtn = document.getElementById('action-attack');
  if (attackBtn) attackBtn.innerHTML = '⚔ スキル';

  // 攻撃範囲ハイライトクリア
  document.querySelectorAll('.grid-cell.attack-range, .aoe-preview, .aoe-preview-center').forEach(c => {
    c.classList.remove('attack-range', 'has-target', 'aoe-target', 'aoe-preview', 'aoe-preview-center');
    c.onclick = null;
  });

  // 移動範囲を復元(まだ動いてない場合)
  if (!u.hasMoved && !u.hasAttacked) {
    showMoveRange(u);
  }
}

// ====== スキル選択モーダル ======
function showSkillModal(unit) {
  // 既存モーダル削除
  const existing = document.querySelector('.skill-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'skill-modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeSkillModal(); };

  const modal = document.createElement('div');
  modal.className = 'skill-modal';
  modal.innerHTML = `
    <div class="skill-modal-title">
      <span class="caster-name">${unit.name}</span>のスキル
    </div>
    <div class="skill-list" id="skill-list"></div>
    <button class="skill-modal-close" onclick="closeSkillModal()">キャンセル</button>
  `;
  overlay.appendChild(modal);
  document.getElementById('screen-battle').appendChild(overlay);

  // スキル一覧描画(★未習得スキルは除外)
  const list = modal.querySelector('#skill-list');
  unit.skills.forEach((skill, idx) => {
    // ★未習得スキル(skillLevels[idx] === 0)は表示しない
    if (unit.skillLevels && unit.skillLevels[idx] === 0) return;
    const canAfford = unit.st >= skill.cost;
    const item = document.createElement('div');
    item.className = `skill-item ${!canAfford ? 'disabled' : ''}`;

    const typeLabel = { M: '近接', R: '遠距', S: '魔法' }[skill.type];
    const dmgStr = skill.damage < 0
      ? `回復${-skill.damage}`
      : skill.damage === 0
        ? '効果のみ'
        : (skill.hits > 1 ? `${skill.damage}×${skill.hits}` : `${skill.damage}`);

    // 状態異常タグの色分け
    let tagClass = '';
    if (skill.status) {
      if (skill.status.includes('stun')) tagClass = 'tag-stun';
      else if (skill.status.includes('daze')) tagClass = 'tag-daze';
      else if (skill.status.includes('slow')) tagClass = 'tag-slow';
      else if (skill.status.includes('poison')) tagClass = 'tag-poison';
      else if (skill.status === 'heal' || skill.status.includes('heal')) tagClass = 'tag-heal';
      else if (skill.status.includes('armor')) tagClass = 'tag-armor';
    }
    // 状態異常名を日本語に
    let statusLabel = skill.status;
    if (skill.status === 'stun') statusLabel = '麻痺';
    else if (skill.status === 'daze' || skill.status === 'daze_aoe') statusLabel = '混乱';
    else if (skill.status === 'slow') statusLabel = '鈍化';
    else if (skill.status === 'poison' || skill.status === 'poison_strong') statusLabel = '毒';
    else if (skill.status === 'poison_aoe') statusLabel = '範囲毒';
    else if (skill.status === 'heal') statusLabel = '回復';
    else if (skill.status === 'armor_down') statusLabel = '防御↓';
    else if (skill.status === 'armor_down_full' || skill.status === 'armor_down_all') statusLabel = '防御↓↓';
    else if (skill.status === 'buff_crit') statusLabel = 'Critバフ';
    else if (skill.status === 'self_atk_up' || skill.status === 'buff_atk_aoe') statusLabel = '攻撃UP';
    else if (skill.status === 'self_def_up') statusLabel = '防御UP';
    else if (skill.status === 'self_heal') statusLabel = '自己回復';
    else if (skill.status && skill.status.includes('st_drain')) statusLabel = 'ST奪取';
    else if (skill.status === 'aoe_around' || skill.status === 'aoe_2' || skill.status === 'aoe_3') statusLabel = '範囲';

    const statusTag = skill.status ? `<span class="skill-status-tag ${tagClass}">${statusLabel}</span>` : '';
    const critPart = skill.crit > 0 ? `<span class="stat-pair">Crit <strong>${skill.crit}%</strong></span>` : '';
    const rangeDisp = skill.minRange && skill.minRange > 1 ? `${skill.minRange}-${skill.range}` : skill.range;
    const rangePart = skill.range > 0 ? `<span class="stat-pair">射程 <strong>${rangeDisp}</strong></span>` : '<span class="stat-pair">自身</span>';

    item.innerHTML = `
      <div class="skill-type-badge type-${skill.type}">${typeLabel}</div>
      <div class="skill-info">
        <div class="skill-name">${skill.name}${statusTag}</div>
        <div class="skill-stats">
          <span class="stat-pair">威力 <strong>${dmgStr}</strong></span>
          ${rangePart}
          ${critPart}
        </div>
      </div>
      <div class="skill-cost">
        <div class="skill-cost-st">${skill.cost}</div>
        <div class="skill-cost-label">ST</div>
      </div>
    `;

    if (canAfford) {
      item.onclick = () => selectSkill(unit, idx);
    }

    list.appendChild(item);
  });
}

function closeSkillModal() {
  const overlay = document.querySelector('.skill-modal-overlay');
  if (overlay) overlay.remove();
  // ★モーダル閉じた = キャンセル。まだスキル選択してないなら、移動範囲復元
  const u = currentUnit();
  if (u && !battle.attackMode && !u.hasMoved && !u.hasAttacked) {
    showMoveRange(u);
  }
}

// ====== スキル選択 → 範囲表示 ======
function selectSkill(unit, skillIdx) {
  closeSkillModal();
  battle.selectedSkill = unit.skills[skillIdx];
  battle.attackMode = true;
  document.body.classList.add('attack-mode');

  // 移動範囲ハイライトをクリア
  document.querySelectorAll('.grid-cell.move-range, .grid-cell.dash-range, .grid-cell.attack-range').forEach(c => {
    c.classList.remove('move-range', 'dash-range', 'attack-range', 'has-target', 'aoe-target', 'aoe-preview', 'aoe-preview-center');
    c.onclick = null;
  });

  document.getElementById('action-bar').classList.add('attack-mode');

  // ★攻撃ボタンを「キャンセル」表示に
  const attackBtn = document.getElementById('action-attack');
  if (attackBtn) attackBtn.innerHTML = '✕ キャンセル';

  showAttackRange(unit);
}

// ====== 攻撃範囲表示(選択中スキル使用) ======
function showAttackRange(unit) {
  const grid = document.getElementById('battle-grid');
  const skill = battle.selectedSkill;
  if (!skill) return;
  const range = skill.range;
  const isHeal = skill.damage < 0 || skill.status === 'heal';
  const isSelfTarget = range === 0;

  // ★aoe_around / daze_aoe / poison_aoe (Whirlwind/Roar/毒薬/Detonate等): 攻撃者の周囲8マスにダメージ
  // ★FIX: Detonate(range=0かつaoe_around)はここで捕まえる(isSelfTargetより先に判定)
  if (skill.status === 'aoe_around' || skill.status === 'daze_aoe' || skill.status === 'poison_aoe') {
    const cell = grid.children[unit.y * BATTLE_W + unit.x];
    cell.classList.add('attack-range', 'has-target');
    // 周囲8マスをハイライト
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = unit.x + dx, ny = unit.y + dy;
        if (nx < 0 || nx >= BATTLE_W || ny < 0 || ny >= BATTLE_H) continue;
        const ncell = grid.children[ny * BATTLE_W + nx];
        const target = battle.units.find(t => !t.dead && t.x === nx && t.y === ny && t.side !== unit.side);
        ncell.classList.add('attack-range');
        if (target) ncell.classList.add('has-target');
      }
    }
    cell.onclick = () => executeSkill(unit, unit.x, unit.y, unit, null);
    return;
  }

  // 自分対象のスキル(Snake Rage、Battle Shoutなど。aoe_aroundは上で処理済み)
  if (isSelfTarget) {
    const cell = grid.children[unit.y * BATTLE_W + unit.x];
    cell.classList.add('attack-range', 'has-target');
    cell.onclick = () => executeSkill(unit, unit.x, unit.y, unit, null);
    return;
  }

  // ★範囲攻撃判定: 指定マスに敵いなくても発動可
  const isAoeSkill = skill.status === 'aoe_2' || skill.status === 'aoe_3' || skill.status === 'stun_aoe';
  // ★最低射程(minRange): 弓系スキルは隣接マスを攻撃できない
  const minRange = skill.minRange || 1;

  for (let y = 0; y < BATTLE_H; y++) {
    for (let x = 0; x < BATTLE_W; x++) {
      if (x === unit.x && y === unit.y) continue;
      const dist = manhattan({x, y}, unit);
      if (dist > range || dist < minRange) continue;

      const cell = grid.children[y * BATTLE_W + x];

      // 視線判定(範囲2以上)
      if (range > 1 && !hasLineOfSight(unit, {x, y})) continue;

      // 対象判定: 回復スキルなら味方、攻撃なら敵
      let target;
      if (isHeal) {
        target = battle.units.find(t => !t.dead && t.x === x && t.y === y && t.side === unit.side);
      } else {
        target = battle.units.find(t => !t.dead && t.x === x && t.y === y && t.side !== unit.side);
      }
      const terrain = getTerrain(x, y);
      const isCrate = !isHeal && terrain && terrain.type === 'crate';

      cell.classList.add('attack-range');
      if (isAoeSkill) {
        // ★範囲攻撃: 全マスを「中心候補」として扱う(2段階タップ)
        if (target || isCrate) cell.classList.add('has-target');
        else cell.classList.add('aoe-target');
        cell.onclick = () => aimAoeSkill(unit, x, y);
      } else if (target || isCrate) {
        cell.classList.add('has-target');
        cell.onclick = () => executeSkill(unit, x, y, target, isCrate ? terrain : null);
      }
    }
  }
}

// ★範囲攻撃の2段階タップ: 1回目=プレビュー、2回目=確定
function aimAoeSkill(unit, x, y) {
  const skill = battle.selectedSkill;
  if (!skill) return;

  const aim = battle.aoeAimAt;
  // 同じマスを2回タップ → 確定発動
  if (aim && aim.x === x && aim.y === y) {
    battle.aoeAimAt = null;
    // executeSkill に飛ばす(targetUnitは中心マスにいる敵)
    const target = battle.units.find(t => !t.dead && t.x === x && t.y === y && t.side !== unit.side);
    executeSkill(unit, x, y, target, null);
    return;
  }

  // 別マス or 初回タップ → 中心候補をセット + プレビュー表示
  battle.aoeAimAt = {x, y};
  refreshAoePreview(unit);
}

// ★プレビューハイライト更新: 中心候補マス + 巻き込み範囲を強調表示
function refreshAoePreview(unit) {
  const skill = battle.selectedSkill;
  if (!skill || !battle.aoeAimAt) return;
  const grid = document.getElementById('battle-grid');
  if (!grid) return;

  // 既存のプレビュー表示をクリア
  document.querySelectorAll('.aoe-preview, .aoe-preview-center').forEach(c => {
    c.classList.remove('aoe-preview', 'aoe-preview-center');
  });

  const {x: cx, y: cy} = battle.aoeAimAt;
  // 範囲セル計算
  let offsets;
  if (skill.status === 'aoe_2' || skill.status === 'stun_aoe') {
    offsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  } else if (skill.status === 'aoe_3') {
    // ★前方3マス直線(攻撃者の向きで決まる)
    const dir = unit.side === 'ally' ? 1 : -1;
    offsets = [[0, 0], [dir, 0], [dir * 2, 0]];
  } else {
    return;
  }

  offsets.forEach(([dx, dy]) => {
    const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || nx >= BATTLE_W || ny < 0 || ny >= BATTLE_H) return;
    const cell = grid.children[ny * BATTLE_W + nx];
    if (!cell) return;
    if (dx === 0 && dy === 0) {
      cell.classList.add('aoe-preview-center');
    } else {
      cell.classList.add('aoe-preview');
    }
  });
}

// ====== 視線判定(草むら遮断) ======
function hasLineOfSight(from, to) {
  // ブレゼンハム的に経路上の全マスをチェック
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return true;

  for (let i = 1; i < steps; i++) {
    const x = Math.round(from.x + (dx * i / steps));
    const y = Math.round(from.y + (dy * i / steps));
    const t = getTerrain(x, y);
    if (t && TERRAIN_DEFS[t.type].blocksLOS) return false;
    // 岩・木箱も視線遮断
    if (t && (t.type === 'rock' || t.type === 'crate')) return false;
  }
  return true;
}

// ====== スキル実行 ======
// ★範囲攻撃のターゲット計算
// skill.status が aoe_around/aoe_2/aoe_3/daze_aoe/poison_aoe の場合、波及対象を返す
// 通常攻撃は空配列を返す(=非範囲)
function getAoeTargets(skill, attacker, mainTarget, tx, ty) {
  const aoeType = skill.status;
  const isAoe = aoeType && (
    aoeType === 'aoe_around' || aoeType === 'aoe_2' || aoeType === 'aoe_3' ||
    aoeType === 'daze_aoe' || aoeType === 'poison_aoe' || aoeType === 'stun_aoe'
  );
  if (!isAoe) return [];

  const targets = [];
  const enemySide = attacker.side === 'ally' ? 'enemy' : 'ally';

  // daze_aoe / poison_aoe は攻撃者中心の周囲(原作仕様: Roar/Poison Potion)
  if (aoeType === 'aoe_around' || aoeType === 'daze_aoe' || aoeType === 'poison_aoe') {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const t = battle.units.find(u => !u.dead && u.x === attacker.x + dx && u.y === attacker.y + dy && u.side === enemySide);
        if (t) targets.push(t);
      }
    }
  } else if (aoeType === 'aoe_2' || aoeType === 'stun_aoe') {
    // 着弾地点 + 上下左右4マス = 5マス十字範囲
    const offsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    offsets.forEach(([dx, dy]) => {
      const t = battle.units.find(u => !u.dead && u.x === tx + dx && u.y === ty + dy && u.side === enemySide);
      if (t && !targets.includes(t)) targets.push(t);
    });
  } else if (aoeType === 'aoe_3') {
    // 前方3マス直線(攻撃者の向きで決まる)
    const dir = attacker.side === 'ally' ? 1 : -1;
    const offsets = [[0, 0], [dir, 0], [dir * 2, 0]];
    offsets.forEach(([dx, dy]) => {
      const t = battle.units.find(u => !u.dead && u.x === tx + dx && u.y === ty + dy && u.side === enemySide);
      if (t && !targets.includes(t)) targets.push(t);
    });
  }

  return targets;
}

function executeSkill(attacker, tx, ty, targetUnit, targetCrate) {
  const skill = battle.selectedSkill;
  if (!skill) return;

  attacker.st -= skill.cost;
  attacker.hasAttacked = true;
  battle.attackMode = false;
  battle.aoeAimAt = null;  // ★範囲攻撃プレビューもクリア
  document.body.classList.remove('attack-mode');
  battle.selectedSkill = null;
  document.getElementById('action-bar').classList.remove('attack-mode');
  // ★攻撃ボタンのラベルを元に戻す
  const attackBtn = document.getElementById('action-attack');
  if (attackBtn) attackBtn.innerHTML = '⚔ スキル';

  // 範囲ハイライトクリア(プレビュー含む)
  document.querySelectorAll('.grid-cell.attack-range, .grid-cell.aoe-preview, .grid-cell.aoe-preview-center').forEach(c => {
    c.classList.remove('attack-range', 'has-target', 'aoe-target', 'aoe-preview', 'aoe-preview-center');
    c.onclick = null;
  });

  // 自爆スキル(Detonate)
  if (skill.name === 'Detonate') {
    addLog(`${attacker.name} の${skill.name}!`);
    // 周囲8マスに自爆ダメージ
    const detonateTargets = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const target = battle.units.find(t => !t.dead && t.x === attacker.x + dx && t.y === attacker.y + dy && t.side !== attacker.side);
        if (target) {
          applyDamage(attacker, target, skill);
          detonateTargets.push(target);
        }
      }
    }
    // ★HP0になった敵をkillUnit(他のaoe_aroundと同じ処理)
    setTimeout(() => {
      detonateTargets.forEach(t => {
        if (t.hp <= 0 && !t.dead) {
          t.hp = 0;
          killUnit(t);
        }
      });
    }, 600);
    // 自身も死亡
    attacker.hp = 0;
    setTimeout(() => killUnit(attacker), 700);
    return;
  }

  // ★aoe_around / daze_aoe / poison_aoe 範囲攻撃(攻撃者中心)
  if ((skill.status === 'aoe_around' || skill.status === 'daze_aoe' || skill.status === 'poison_aoe') && skill.damage >= 0) {
    addLog(`<span style="color:#ffaa44">${attacker.name} の${skill.name}!【範囲攻撃】</span>`);

    // 範囲セル座標(攻撃者周囲8マス)
    const aoeCells = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        aoeCells.push({x: attacker.x + dx, y: attacker.y + dy});
      }
    }
    // 全マスにフラッシュエフェクト
    playAoeFlash(aoeCells);
    playSkillEffect(skill, aoeCells, attacker);
    // ★範囲攻撃発動時の背景フラッシュ + 画面シェイク
    if (skill.status === 'aoe_around') {
      playBackgroundFlash('rgba(255, 200, 80, 0.3)');
      setTimeout(() => playScreenShake('medium'), 100);
    } else if (skill.status === 'daze_aoe') {
      playBackgroundFlash('rgba(180, 130, 255, 0.25)');
    } else if (skill.status === 'poison_aoe') {
      playBackgroundFlash('rgba(120, 220, 80, 0.25)');
    }

    // ★フレンドリーファイア対応: 攻撃者以外の全ユニット(味方も巻き込む)
    const enemies = [];
    aoeCells.forEach(({x, y}) => {
      const t = battle.units.find(u => !u.dead && u.x === x && u.y === y && u.id !== attacker.id);
      if (t) enemies.push(t);
    });
    enemies.forEach(t => {
      if (skill.damage > 0) {
        applyDamage(attacker, t, skill);
        applyStDrainFromSkill(skill, t);
      } else {
        // ダメージ0だが状態異常だけ付与(Poison Potion等)
        applyStatusFromSkill(skill, t, attacker);
      }
    });
    setTimeout(() => {
      enemies.forEach(t => {
        if (t.hp <= 0 && !t.dead) {
          t.hp = 0;
          killUnit(t);
        }
      });
    }, 600);
    renderBattle();
    if (!attacker.hasMoved) showMoveRange(attacker);
    return;
  }

  // 自分対象スキル(Snake Rage, Battle Shout など)
  if (skill.range === 0 && skill.damage === 0) {
    addLog(`${attacker.name} の${skill.name}!`);
    applySelfStatus(attacker, skill);
    renderBattle();
    if (!attacker.hasMoved) showMoveRange(attacker);
    return;
  }

  // ★aoe_2 / aoe_3 / stun_aoe 範囲攻撃(空マスタップでも発動可)
  if (skill.status === 'aoe_2' || skill.status === 'aoe_3' || skill.status === 'stun_aoe') {
    addLog(`<span style="color:#ffaa44">${attacker.name} の${skill.name}!【範囲攻撃】</span>`);

    // 範囲セルの座標リストを取得(エフェクト用)
    const aoeCells = [];
    if (skill.status === 'aoe_3') {
      // aoe_3: 攻撃者から見た前方3マス直線
      const dir = attacker.side === 'ally' ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        aoeCells.push({x: tx + dir * i, y: ty});
      }
    } else {
      // aoe_2 / stun_aoe: 着弾点中心の十字5マス
      const offsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
      offsets.forEach(([dx, dy]) => aoeCells.push({x: tx + dx, y: ty + dy}));
    }

    // 全マスにエフェクト(光るフラッシュ)
    playAoeFlash(aoeCells);
    playSkillEffect(skill, aoeCells, attacker);
    // ★範囲攻撃発動時の背景フラッシュ + 画面シェイク
    playBackgroundFlash('rgba(255, 180, 60, 0.3)');
    setTimeout(() => playScreenShake('medium'), 100);

    // ★フレンドリーファイア対応: 範囲内の攻撃者以外の全ユニット(味方も巻き込む)
    const enemies = [];
    aoeCells.forEach(({x, y}) => {
      const t = battle.units.find(u => !u.dead && u.x === x && u.y === y && u.id !== attacker.id);
      if (t && !enemies.includes(t)) enemies.push(t);
    });

    enemies.forEach(t => {
      applyDamage(attacker, t, skill);
      applyStDrainFromSkill(skill, t);
    });
    setTimeout(() => {
      enemies.forEach(t => {
        if (t.hp <= 0 && !t.dead) {
          t.hp = 0;
          killUnit(t);
        }
      });
    }, 600);
    renderBattle();
    if (!attacker.hasMoved) showMoveRange(attacker);
    return;
  }

  if (targetUnit) {
    // 回復スキル(damage<0)
    if (skill.damage < 0) {
      const healAmount = -skill.damage;
      targetUnit.hp = Math.min(targetUnit.maxHP, targetUnit.hp + healAmount);
      showHealPopup(targetUnit, healAmount);
      addLog(`${attacker.name} の${skill.name}! ${targetUnit.name} のHPが ${healAmount} 回復`);
      renderBattle();
      if (!attacker.hasMoved) showMoveRange(attacker);
      return;
    }

    // 通常攻撃: 単発のみ(範囲は上で処理済み)
    applyDamage(attacker, targetUnit, skill);

    // ST奪取系
    applyStDrainFromSkill(skill, targetUnit);

    if (targetUnit.hp <= 0) {
      targetUnit.hp = 0;
      setTimeout(() => killUnit(targetUnit), 600);
    } else {
      renderBattle();
      if (!attacker.hasMoved) showMoveRange(attacker);
    }
  } else if (targetCrate) {
    const totalDmg = skill.damage * skill.hits;
    targetCrate.hp = Math.max(0, targetCrate.hp - totalDmg);  // ★負ガード追加
    addLog(`${attacker.name} が木箱を攻撃! ${totalDmg}ダメージ`);

    if (targetCrate.hp <= 0) {
      delete battle.terrain[`${tx},${ty}`];
      addLog(`木箱が破壊された`);
    }
    renderBattle();
    if (!attacker.hasMoved) showMoveRange(attacker);
  }
}

// ダメージ適用ヘルパー(連撃対応 + 状態異常)
function applyDamage(attacker, target, skill) {
  // Daze状態だとCrit無効
  const isDazed = target.statuses.some(s => s.type === 'daze');
  // 攻撃側のbuff_atk
  const atkBuff = attacker.statuses.filter(s => s.type === 'buff_atk').length;
  const atkBoost = atkBuff * 5; // バフ1個につき+5

  // 防御計算: 対応軸 - armor_down状態の効果
  const armorIdx = skill.type === 'M' ? 0 : (skill.type === 'R' ? 1 : 2);
  let defense = target.armor[armorIdx];
  // armor_down状態の処理
  const armorDownStatus = target.statuses.find(s => s.type === 'armor_down');
  if (armorDownStatus) {
    if (armorDownStatus.dn && Array.isArray(armorDownStatus.dn)) {
      // ★軸別固定値減算(Javelin Sting等)
      defense = Math.max(0, defense - (armorDownStatus.dn[armorIdx] || 0));
    } else {
      // 旧仕様(半減)
      defense = Math.floor(defense / 2);
    }
  }
  // ★隣接味方のauraArmorBonus(チャンピオンの「英雄の威風」など)
  let auraArmor = 0;
  let auraSourceName = '';
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const ally = battle.units.find(u =>
        !u.dead && u.x === target.x + dx && u.y === target.y + dy &&
        u.side === target.side &&
        u.passive && u.passive.auraArmorBonus
      );
      if (ally) {
        auraArmor += ally.passive.auraArmorBonus[armorIdx] || 0;
        if (!auraSourceName) auraSourceName = ally.name;
      }
    }
  }
  defense += auraArmor;

  let totalDamage = 0;
  let critCount = 0;

  // パッシブのダメージ倍率(ハウンドのDog Pair: 1.5倍)
  const passiveDmgMul = (attacker.passive && attacker.passive.damageMul) ? attacker.passive.damageMul : 1;
  // パッシブのCritボーナス(ナイトのParrying: +10%)
  const passiveCritBonus = (attacker.passive && attacker.passive.critBonus) ? attacker.passive.critBonus : 0;
  const effectiveCrit = skill.crit + passiveCritBonus;
  // パッシブの遠距離/魔法ダメージボーナス(アーチャー、レンジャー、ロケッティアなど)
  let rangedBonus = 0;
  if (attacker.passive && attacker.passive.rangedDmgBonus && (skill.type === 'R' || skill.type === 'S')) {
    rangedBonus = attacker.passive.rangedDmgBonus;
  }

  // 装備ボーナス
  let equipDmgBonus = 0;
  let equipCritBonus = 0;
  if (attacker.equipBonuses) {
    equipDmgBonus = attacker.equipBonuses.allDmg;
    if (skill.hits === 1) equipDmgBonus += attacker.equipBonuses.singleDmg;
    equipCritBonus = attacker.equipBonuses.crit;
  }

  // スキルLvボーナス
  // ★味方/敵 共通: skillLevelsから個別スキルLvを参照(makeUnitで敵にも自動振り分け済み)
  let skillLvDmgBonus = 0;
  let skillLvCritBonus = 0;
  if (attacker.skillLevels && skill._skillIdx !== undefined) {
    const sLv = attacker.skillLevels[skill._skillIdx] || 1;
    // Lv1=0, Lv2=+5, Lv3=+10, Lv4=+18, Lv5=+28 のような累進(合計値)
    const dmgTable = [0, 5, 10, 18, 28];
    const totalBonus = dmgTable[sLv - 1] || 0;
    // 連撃スキルの場合は合計を均等に分配(連打 5×3 が +28×3=84になる暴走を防ぐ)
    skillLvDmgBonus = Math.floor(totalBonus / Math.max(1, skill.hits));
    skillLvCritBonus = (sLv - 1) * 3;  // ★Crit爆発防止: +5→+3に抑制(Lv5で+12%)
  }

  const finalCrit = Math.min(95, effectiveCrit + equipCritBonus + skillLvCritBonus);  // ★Crit上限95%
  for (let i = 0; i < skill.hits; i++) {
    const isCrit = !isDazed && Math.random() * 100 < finalCrit;
    if (isCrit) critCount++;
    let baseDamage = (skill.damage + atkBoost + rangedBonus + equipDmgBonus + skillLvDmgBonus) * passiveDmgMul;
    if (isCrit) baseDamage = baseDamage * 1.5;
    baseDamage = Math.floor(baseDamage);
    const finalDamage = Math.max(1, baseDamage - defense);
    totalDamage += finalDamage;
    const wasAlive = target.hp > 0;
    target.hp = Math.max(0, target.hp - finalDamage);  // ★HPが負にならないようガード
    // ★B-3: 殺した瞬間に attacker を記録(EXP分配で使う)
    if (wasAlive && target.hp === 0 && attacker.side === 'ally' && !attacker.isPet) {
      target.killedBy = attacker.id;
    }
    // ペットが殺した場合は主人にEXP帰属
    if (wasAlive && target.hp === 0 && attacker.isPet && attacker.ownerId) {
      target.killedBy = attacker.ownerId;
    }
  }

  showDamagePopup(target, totalDamage, critCount > 0 && critCount === skill.hits);
  const hitsStr = skill.hits > 1 ? ` (${skill.hits}連撃)` : '';
  const critStr = critCount === skill.hits && critCount > 0 ? ` (CRIT×${critCount}!)` : (critCount > 0 ? ` (Crit ${critCount}/${skill.hits})` : '');
  const dazeNote = isDazed ? ' <span style="color:#c4a8e8">[Daze:Crit無効]</span>' : '';
    // ボーナス内訳
  const bonusBreakdown = [];
  if (skillLvDmgBonus > 0) {
    const sLv = attacker.skillLevels[skill._skillIdx] || 1;
    bonusBreakdown.push(`<span style="color:#d4a020">スキルLv${sLv}</span>`);
  }
  if (equipDmgBonus > 0) bonusBreakdown.push(`<span style="color:#88ccff">装備+${equipDmgBonus}</span>`);
  if (rangedBonus > 0) bonusBreakdown.push(`<span style="color:#88ddff">遠距+${rangedBonus}</span>`);
  if (atkBoost > 0) bonusBreakdown.push(`<span style="color:#ff8855">攻撃UP+${atkBoost}</span>`);
  if (passiveDmgMul > 1) bonusBreakdown.push(`<span style="color:#ff88aa">×${passiveDmgMul.toFixed(1)}</span>`);
  // ★隣接味方のオーラ装甲ボーナス(チャンピオンの英雄の威風など、防御側が受けた軽減)
  if (auraArmor > 0) bonusBreakdown.push(`<span style="color:#88ddff">${auraSourceName}装甲+${auraArmor}</span>`);
  const breakdownStr = bonusBreakdown.length > 0 ? ` <span style="font-size:9px;opacity:0.85;">[${bonusBreakdown.join(' ')}]</span>` : '';

  addLog(`${attacker.name} の${skill.name}! ${target.name} に ${totalDamage}${hitsStr}${critStr}${dazeNote}${breakdownStr}`);

  // ====== 視覚演出 ======
  // 攻撃モーション(攻撃者が前進)
  playAttackLunge(attacker);
  // ★スキルエフェクト: ターゲットマスに発動(単発攻撃用)
  playSkillEffect(skill, [{x: target.x, y: target.y}], attacker);

  // ★画面シェイク強度をダメージに応じて決定
  let shakeStrength = 'light';
  if (critCount > 0 || totalDamage >= 30) shakeStrength = 'heavy';
  else if (totalDamage >= 15 || skill.hits >= 3) shakeStrength = 'medium';
  // 高コストor高ダメ攻撃のみシェイク発動(細かいヒットでは揺らさない)
  if (totalDamage >= 8 || critCount > 0) {
    setTimeout(() => playScreenShake(shakeStrength), 180);
  }

  // ★Crit時は背景フラッシュ(黄色)
  if (critCount > 0) {
    setTimeout(() => playBackgroundFlash('rgba(255, 220, 80, 0.35)'), 150);
  }

  // ダメージポップアップ + ヒット揺れ
  setTimeout(() => {
    showDamagePopup(target, totalDamage, critCount > 0);
    playHitEffect(target, critCount > 0 && critCount === skill.hits);
  }, 200);

  // 状態異常付与(target が生きてる場合のみ)
  if (target.hp > 0) {
    applyStatusFromSkill(skill, target, attacker);
  }
}

// スキルから状態異常を付与
function applyStatusFromSkill(skill, target, attacker) {
  if (!skill.status) return;
  let chance = STATUS_CHANCE[skill.status] || 100;
  // ジャングルマンのstatusBonus: 状態異常付与確率UP
  if (attacker && attacker.passive && attacker.passive.statusBonus) {
    chance += attacker.passive.statusBonus;
  }
  if (Math.random() * 100 >= chance) return;

  // パッシブで状態異常を耐性チェック
  if (target.passive && target.passive.statusResist) {
    if (Math.random() * 100 < target.passive.statusResist) {
      addLog(`<span style="color:#88ddff">${target.name} の${target.passive.name}で状態異常を無効化!</span>`);
      flashUnit(target, 'stun'); // 耐性発動エフェクト(黄色フラッシュ流用)
      // 上記でclassListに'flash-stun'付くが、別途passive-resistも付ける
      const grid = document.getElementById('battle-grid');
      const cell = grid.children[target.y * BATTLE_W + target.x];
      const unitEl = cell ? cell.querySelector('.unit') : null;
      if (unitEl) {
        unitEl.classList.add('passive-resist');
        setTimeout(() => unitEl.classList.remove('passive-resist'), 600);
      }
      return;
    }
  }

  // statusキー → 実際の状態異常type にマッピング
  const statusMap = {
    'stun': 'stun',
    'stun_aoe': 'stun',
    'daze': 'daze',
    'daze_aoe': 'daze',
    'slow': 'slow',
    'poison': 'poison',
    'poison_strong': 'poison',
    'poison_aoe': 'poison',
    'armor_down': 'armor_down',
    'armor_down_jav': 'armor_down',
    'armor_down_full': 'armor_down',
    'armor_down_all': 'armor_down',
    'slow_st_drain': 'slow',
  };

  const statusType = statusMap[skill.status];
  if (!statusType) return; // バフ系はここでは処理しない(別途)

  const def = STATUS_EFFECTS[statusType];
  if (!def) return;

  // 強毒判定: poison_strongは8ダメ、それ以外5
  let dmg = def.dmg;
  if (skill.status === 'poison_strong') dmg = 8;
  else if (skill.status === 'poison_aoe') dmg = 6;

  // 既存の同種状態があればターン上書き(重複ありの毒は重ねがけ)
  if (statusType === 'poison') {
    // 毒は重ねがけ(原作仕様: 重複可)
    // ★B-3: caster記録(毒キル時のEXP帰属用)
    const casterId = attacker.isPet ? attacker.ownerId : attacker.id;
    target.statuses.push({ type: 'poison', turns: def.default_turns, dmg, casterId });
  } else if (skill.status === 'armor_down_jav') {
    // ★Javelin Sting: 近接-2 / 遠距離-3 / 特殊0 (Lvで増加するロジックは後で)
    const dn = [2, 3, 0];
    const existing = target.statuses.find(s => s.type === 'armor_down');
    if (existing) {
      existing.turns = Math.max(existing.turns, def.default_turns);
      existing.dn = dn; // 上書き
    } else {
      target.statuses.push({ type: 'armor_down', turns: def.default_turns, dn });
    }
  } else if (skill.status === 'armor_down_all') {
    // ★Bolas: 全軸 [2,2,2]
    const dn = [2, 2, 2];
    const existing = target.statuses.find(s => s.type === 'armor_down');
    if (existing) {
      existing.turns = Math.max(existing.turns, def.default_turns);
      existing.dn = dn;
    } else {
      target.statuses.push({ type: 'armor_down', turns: def.default_turns, dn });
    }
  } else {
    // 他は上書き
    const existing = target.statuses.find(s => s.type === statusType);
    if (existing) {
      existing.turns = Math.max(existing.turns, def.default_turns);
    } else {
      target.statuses.push({ type: statusType, turns: def.default_turns });
    }
  }

  flashUnit(target, statusType === 'armor_down' ? 'daze' : statusType);
  // ★状態異常アイコンポップアップ
  showStatusPopup(target, statusType);
  addLog(`<span style="color:#d4a020">→ ${target.name} に ${def.ja}!</span>`);
}

// ★状態異常付与時のポップアップ(target上に "麻痺!" など表示)
function showStatusPopup(unit, statusType) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  const cell = grid.children[unit.y * BATTLE_W + unit.x];
  if (!cell) return;

  // 状態異常タイプ別の表示テキスト・色
  const statusInfo = {
    'stun':       { text: '⚡ 気絶',   color: '#ffe080' },
    'daze':       { text: '💫 朦朧',   color: '#c8a0ff' },
    'slow':       { text: '🌀 鈍足',   color: '#88ddff' },
    'poison':     { text: '☠ 毒',     color: '#aaff66' },
    'armor_down': { text: '🛡 防御↓', color: '#ff9966' },
    'st_down':    { text: '💧 ST減',   color: '#7ec6e6' },
  };
  const info = statusInfo[statusType] || { text: statusType, color: '#fff' };

  const popup = document.createElement('div');
  popup.className = 'status-popup';
  popup.textContent = info.text;
  popup.style.color = info.color;
  popup.style.left = '50%';
  popup.style.top = '5%';
  cell.appendChild(popup);
  setTimeout(() => popup.remove(), 1400);
}

// ST奪取系の処理(executeSkillから呼ぶ)
function applyStDrainFromSkill(skill, target) {
  if (!skill.status) return false;
  const drainMap = {
    'st_drain_full': 20,
    'st_drain_50': 10,
    'st_drain': 13,
  };
  const amount = drainMap[skill.status];
  if (!amount) return false;
  const chance = STATUS_CHANCE[skill.status] || 100;
  if (Math.random() * 100 >= chance) return false;

  const before = target.st;
  target.st = Math.max(0, target.st - amount);
  const drained = before - target.st;
  if (drained > 0) {
    addLog(`<span style="color:#fc4">→ ${target.name} のSTが${drained}減少</span>`);
  }
  return true;
}

// 自分対象スキルの効果適用(Step 1.4ではログのみだったのを実装)
function applySelfStatus(attacker, skill) {
  const map = {
    'self_atk_up':    { type: 'buff_atk', turns: 999, msg: '攻撃力UP(重ねがけ可)' },
    'self_def_up':    { type: 'buff_def', turns: 3, msg: '防御UP' },
    'self_heal':      { type: null, msg: 'HP回復' },
    'buff_crit':      { type: 'buff_crit', turns: 2, msg: 'Crit付与' },
    'buff_atk_aoe':   { type: 'buff_atk', turns: 3, msg: '範囲攻撃力UP' },
    'self_st_save':   { type: null, msg: 'ST消費削減' },
    'self_st_recover':{ type: null, msg: '次々ターンST全快' },
  };
  const info = map[skill.status];
  if (!info) return;

  if (skill.status === 'self_heal') {
    const healAmount = 15;
    attacker.hp = Math.min(attacker.maxHP, attacker.hp + healAmount);
    showHealPopup(attacker, healAmount);
    return;
  }

  if (skill.status === 'self_atk_up' || skill.status === 'self_def_up') {
    attacker.statuses.push({ type: info.type, turns: info.turns });
    addLog(`<span style="color:#d4a020">→ ${attacker.name} ${info.msg}</span>`);
    return;
  }

  if (skill.status === 'buff_atk_aoe') {
    // ★原作仕様: 自身+隣接仲間に攻撃力UP・3ターン・重ねがけ不可
    const targets = battle.units.filter(u =>
      !u.dead && u.side === attacker.side &&
      Math.abs(u.x - attacker.x) <= 1 && Math.abs(u.y - attacker.y) <= 1
    );
    targets.forEach(t => {
      const existing = t.statuses.find(s => s.type === 'buff_atk');
      if (existing) {
        existing.turns = Math.max(existing.turns, info.turns);
      } else {
        t.statuses.push({ type: 'buff_atk', turns: info.turns });
      }
    });
    addLog(`<span style="color:#d4a020">→ ${attacker.name} と隣接仲間に${info.msg}</span>`);
    return;
  }
}

// 回復ポップアップ
function showHealPopup(unit, amount) {
  const grid = document.getElementById('battle-grid');
  const cell = grid.children[unit.y * BATTLE_W + unit.x];
  if (!cell) return;
  const popup = document.createElement('div');
  popup.className = 'damage-popup heal';
  popup.textContent = amount;
  cell.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

// ====== 演出: ダメージポップアップ(Crit時は大きく派手に) ======
function showDamagePopup(unit, amount, isCrit, kind) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  const cell = grid.children[unit.y * BATTLE_W + unit.x];
  if (!cell) return;

  const popup = document.createElement('div');
  // ★kind === 'poison' なら緑色クラス追加
  let extraClass = '';
  if (isCrit) extraClass += ' crit';
  if (kind === 'poison') extraClass += ' poison-dmg';
  popup.className = 'damage-popup' + extraClass;
  popup.textContent = isCrit ? `${amount}!` : `${amount}`;
  // セル中央に配置
  popup.style.left = '50%';
  popup.style.top = '40%';
  cell.appendChild(popup);

  setTimeout(() => popup.remove(), isCrit ? 1600 : 1300);

  // ★Crit時は「CRITICAL!」テキストも一緒に出す
  if (isCrit) {
    const critLabel = document.createElement('div');
    critLabel.className = 'crit-label';
    critLabel.textContent = 'CRITICAL!';
    critLabel.style.left = '50%';
    critLabel.style.top = '15%';
    cell.appendChild(critLabel);
    setTimeout(() => critLabel.remove(), 1300);
  }
}

// 回復ポップアップ
function showHealPopup(unit, amount) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  const cell = grid.children[unit.y * BATTLE_W + unit.x];
  if (!cell) return;
  const popup = document.createElement('div');
  popup.className = 'damage-popup heal';
  popup.textContent = `+${amount}`;
  popup.style.left = '50%';
  popup.style.top = '40%';
  cell.appendChild(popup);
  setTimeout(() => popup.remove(), 1400);
}

// ====== 演出: ヒット時の揺れ ======
function playHitEffect(unit, isCrit) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  const cell = grid.children[unit.y * BATTLE_W + unit.x];
  if (!cell) return;
  const unitEl = cell.querySelector('.unit');
  if (!unitEl) return;

  const cls = isCrit ? 'hit-crit' : 'hit-shake';
  unitEl.classList.remove('hit-shake', 'hit-crit');
  // 強制リフロー
  void unitEl.offsetWidth;
  unitEl.classList.add(cls);
  setTimeout(() => unitEl.classList.remove(cls), isCrit ? 700 : 400);

  // ★Crit時は被弾マスを赤フラッシュ
  if (isCrit) {
    cell.classList.remove('hit-flash');
    void cell.offsetWidth;
    cell.classList.add('hit-flash');
    setTimeout(() => cell.classList.remove('hit-flash'), 400);
  }
  // 画面シェイクはapplyDamage側で集中管理
}

// ====== 演出: 攻撃時の前進モーション ======
function playAttackLunge(attacker) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  const cell = grid.children[attacker.y * BATTLE_W + attacker.x];
  if (!cell) return;
  const unitEl = cell.querySelector('.unit');
  if (!unitEl) return;

  // ★攻撃者の向きで前進方向決定
  unitEl.classList.remove('attack-lunge', 'attack-lunge-left');
  void unitEl.offsetWidth;
  if (attacker.side === 'enemy') {
    unitEl.classList.add('attack-lunge-left');
  } else {
    unitEl.classList.add('attack-lunge');
  }
  setTimeout(() => unitEl.classList.remove('attack-lunge', 'attack-lunge-left'), 400);
}

// ====== ★画面シェイク(強度別) ======
// strength: 'light' / 'medium' / 'heavy'
function playScreenShake(strength = 'light') {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  const className = `screen-shake-${strength}`;
  grid.classList.remove('screen-shake-light', 'screen-shake-medium', 'screen-shake-heavy');
  void grid.offsetWidth;
  grid.classList.add(className);
  setTimeout(() => grid.classList.remove(className), strength === 'heavy' ? 500 : 300);
}

// ====== ★背景フラッシュ(色を一瞬かぶせる) ======
function playBackgroundFlash(color = 'rgba(255, 220, 100, 0.3)') {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  const flash = document.createElement('div');
  flash.className = 'bg-flash';
  flash.style.background = color;
  grid.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
}

// ====== 範囲攻撃エフェクト: 指定マスすべてにフラッシュ ======
function playAoeFlash(cells) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  cells.forEach(({x, y}) => {
    if (x < 0 || x >= BATTLE_W || y < 0 || y >= BATTLE_H) return;
    const cell = grid.children[y * BATTLE_W + x];
    if (!cell) return;
    cell.classList.remove('aoe-flash');
    void cell.offsetWidth;
    cell.classList.add('aoe-flash');
    setTimeout(() => cell.classList.remove('aoe-flash'), 600);
  });
}

// ★スキルエフェクトタイプ判定: スキル名から打撃/斬撃/噛み を区別
const IMPACT_SKILLS = new Set([
  // 打撃: 拳・タックル・棒・杖・盾・頭突き・体当たり
  'Tackle', 'Bounding Kick', 'Disrupting Palm', 'Pummel',
  'Buckler Bash', 'Cane', 'Shillelagh', 'Immaterial Bash',
  'Lupine Strike', 'Head Butt'
]);
const BITE_SKILLS = new Set([
  // 噛み系: 牙で噛む
  'Maul', 'Nip', 'Badger Maul', 'Venomous Bite'
]);
function getMeleeEffectClass(skill) {
  if (IMPACT_SKILLS.has(skill.name)) return 'impact-fx';
  if (BITE_SKILLS.has(skill.name)) return 'bite-fx';
  return 'slash-fx'; // デフォルトは斬撃
}

// ★スキルエフェクト: スキルタイプ・連撃数・範囲タイプに応じて切り替え
function playSkillEffect(skill, cells, attacker) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;

  // ★攻撃者中心に1個だけ大型エフェクト(aoe_around / daze_aoe / poison_aoe)
  if (attacker && (skill.status === 'aoe_around' || skill.status === 'daze_aoe' || skill.status === 'poison_aoe')) {
    const cell = grid.children[attacker.y * BATTLE_W + attacker.x];
    if (cell) {
      let cls;
      if (skill.status === 'aoe_around') cls = 'whirlwind-fx';     // 渦巻き旋風(黄)
      else if (skill.status === 'daze_aoe') cls = 'daze-aoe-fx';   // 混乱の渦(紫)
      else cls = 'poison-aoe-fx';                                  // 毒霧(緑)
      cell.classList.remove(cls);
      void cell.offsetWidth;
      cell.classList.add(cls);
      setTimeout(() => cell.classList.remove(cls), 1000);
    }
    return;
  }

  // ★遠距離攻撃(R型 + range > 1)は弾道アニメ
  if (skill.type === 'R' && skill.range > 1 && attacker && cells.length > 0) {
    cells.forEach(({x, y}) => {
      playProjectile(attacker, {x, y}, skill);
    });
    return;
  }

  // エフェクトクラス決定
  let effectClass;
  let isMultiHit = false;
  if (skill.name === 'Flame Potion') {
    effectClass = 'fire-fx';         // ★火炎薬: 燃え盛る火エフェクト
  } else if (skill.status === 'aoe_2' || skill.status === 'aoe_3' || skill.status === 'stun_aoe') {
    effectClass = 'multi-slash-fx';  // 範囲攻撃: 複数斬撃エフェクト
  } else if (skill.type === 'M') {
    // ★打撃/斬撃/噛みを判定
    effectClass = getMeleeEffectClass(skill);
    if (skill.hits > 1) isMultiHit = true; // 連撃時は複数回発動
  } else if (skill.type === 'R') {
    effectClass = 'arrow-fx';      // 遠距離(隣接): 矢の軌跡
  } else if (skill.type === 'S') {
    effectClass = 'magic-fx';      // 魔法: スパークル
  } else {
    return;
  }

  // ★連撃時は hits 回エフェクトを順次発動(各回 独立した要素で重ねる)
  const hitCount = isMultiHit ? Math.min(skill.hits, 6) : 1;
  for (let i = 0; i < hitCount; i++) {
    setTimeout(() => {
      cells.forEach(({x, y}) => {
        if (x < 0 || x >= BATTLE_W || y < 0 || y >= BATTLE_H) return;
        const cell = grid.children[y * BATTLE_W + x];
        if (!cell) return;
        // ★独立したオーバーレイ要素を作って追加(連撃感を出す)
        const fx = document.createElement('div');
        fx.className = `fx-overlay ${effectClass}-overlay`;
        // 連撃のたびに微妙に位置をずらす(±4pxくらい)
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;
        fx.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        cell.appendChild(fx);
        setTimeout(() => fx.remove(), 500);
      });
    }, i * 110); // 連撃間隔
  }
}

// ★遠距離弾道アニメ: 攻撃者から目標まで「弾」を飛ばす
function playProjectile(from, to, skill) {
  const grid = document.getElementById('battle-grid');
  if (!grid) return;
  // battle-grid の画面上の絶対位置を取得
  const gridRect = grid.getBoundingClientRect();
  const cellSize = 39; // 38px + 1px gap
  const padding = 1;   // battle-gridのpadding

  // セル中央の画面座標を計算
  const startX = gridRect.left + padding + from.x * cellSize + 38 / 2 + window.scrollX;
  const startY = gridRect.top + padding + from.y * cellSize + 38 / 2 + window.scrollY;
  const endX = gridRect.left + padding + to.x * cellSize + 38 / 2 + window.scrollX;
  const endY = gridRect.top + padding + to.y * cellSize + 38 / 2 + window.scrollY;

  // 弾の見た目はスキルタイプで切り替え
  const projectile = document.createElement('div');
  if (skill.type === 'R') {
    projectile.className = 'projectile projectile-arrow';
  } else if (skill.type === 'S') {
    projectile.className = 'projectile projectile-magic';
  } else {
    return;
  }

  // 角度計算(矢の向きをアジャスト)
  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  projectile.style.position = 'fixed'; // ★ビューポート基準
  projectile.style.left = startX + 'px';
  projectile.style.top = startY + 'px';
  projectile.style.setProperty('--r', `${angle}deg`);
  projectile.style.setProperty('--end-x', `${endX - startX}px`);
  projectile.style.setProperty('--end-y', `${endY - startY}px`);

  document.body.appendChild(projectile);

  // アニメ終了で削除
  const dist = Math.sqrt(dx * dx + dy * dy);
  const duration = Math.min(0.5, Math.max(0.25, dist / 500));
  projectile.style.animationDuration = `${duration}s`;
  setTimeout(() => projectile.remove(), duration * 1000 + 100);
}

// ====== ユニット死亡処理 ======
function killUnit(unit) {
  // 死亡演出
  const grid = document.getElementById('battle-grid');
  if (grid) {
    const cell = grid.children[unit.y * BATTLE_W + unit.x];
    if (cell) {
      const unitEl = cell.querySelector('.unit');
      if (unitEl) {
        unitEl.classList.add('dying');
      }
    }
  }
  unit.dead = true;
  addLog(`<span style="color:#aaa">${unit.name} が倒れた</span>`);

  // 主人が死んだらペットも消える
  if (!unit.isPet) {
    const pets = battle.units.filter(p => p.isPet && p.ownerId === unit.id && !p.dead);
    pets.forEach(p => {
      p.dead = true;
      addLog(`<span style="color:#aaa">${p.name} (主人を失い消滅)</span>`);
    });
  }

  renderBattle();

  // 勝敗判定 → 終わってなければターン進行チェック
  setTimeout(() => {
    if (checkBattleEnd()) return;  // 勝敗ついたら終了

    // ★FIX: 死んだのが現在のターンキャラ(または死んだペットの主人)なら自動でターン進行
    // 待機ボタン押さないと進まない問題を解消
    const cur = battle.units[battle.currentUnitIdx];
    if (cur && cur.dead) {
      // ハイライト解除
      document.querySelectorAll('.grid-cell.move-range, .grid-cell.dash-range, .grid-cell.attack-range').forEach(c => {
        c.classList.remove('move-range', 'dash-range', 'attack-range', 'has-target', 'aoe-target', 'aoe-preview', 'aoe-preview-center');
        c.onclick = null;
      });
      battle.attackMode = false;
      battle.selectedSkill = null;
      battle.aoeAimAt = null;
      document.body.classList.remove('attack-mode');
      setTimeout(() => nextTurn(), 500);
    }
  }, 200);
}

// ====== 勝敗判定 ======
function checkBattleEnd() {
  const aliveAllies = battle.units.filter(u => !u.dead && u.side === 'ally');
  const aliveEnemies = battle.units.filter(u => !u.dead && u.side === 'enemy');

  if (aliveEnemies.length === 0) {
    onMissionVictory();
    return true;
  }
  if (aliveAllies.length === 0) {
    onMissionDefeat();
    return true;
  }
  return false;
}

// ====== ミッション勝利処理 ======
// ★Step2: 宝箱を開封して中身を入手(共通関数)
//   - 既に開封済みなら何もしない
//   - 開封したら state.chestsOpened に記録
//   - 戻り値: { text: string, html: string } / 開封できなかったら null
function openMissionChest(missionId) {
  const mission = MISSIONS[missionId];
  if (!mission || !mission.chest) return null;
  if (!state.chestsOpened) state.chestsOpened = [];
  if (state.chestsOpened.includes(missionId)) return null;  // 開封済みは無視

  state.chestsOpened.push(missionId);
  const chest = mission.chest;

  if (chest.type === 'gold_key') {
    if (!state.keys) state.keys = { gold: 0, blue: 0 };
    state.keys.gold = (state.keys.gold || 0) + 1;
    return {
      text: '📦 宝箱から GOLD KEY を入手!',
      html: '📦 宝箱から <span style="color:#ffd770">GOLD KEY</span> を入手!',
    };
  }
  if (chest.type === 'blue_key') {
    if (!state.keys) state.keys = { gold: 0, blue: 0 };
    state.keys.blue = (state.keys.blue || 0) + 1;
    return {
      text: '📦 宝箱から BLUE KEY を入手!',
      html: '📦 宝箱から <span style="color:#88ddff">BLUE KEY</span> を入手!',
    };
  }
  if (chest.type === 'item_rare') {
    // 将来用: ピンクアイテムをinventoryに追加(まだ未実装)
    return { text: '📦 宝箱からレアアイテムを入手!', html: '📦 宝箱からレアアイテムを入手!' };
  }

  return null;
}

function onMissionVictory() {
  const missionId = state.currentMission;
  const mission = MISSIONS[missionId];
  if (!mission) {
    showResult('VICTORY', 'すべての敵を撃破した');
    return;
  }

  // ★Phase3 v9: イベントは独自フローで処理(XP画面・報酬画面なし)
  if (mission.isEvent) {
    console.log('[onMissionVictory] イベント検出:', mission.id);
    // パーティHP復元
    const allyUnits = battle.units.filter(u => u.side === 'ally' && !u.isPet);
    state.partyData.forEach((pd, i) => {
      const unit = allyUnits[i];
      if (unit) {
        pd.hp = unit.dead ? 0 : unit.hp;
      }
    });
    // HP全回復
    state.partyData.forEach(pd => {
      pd.hp = pd.maxHP;
    });
    // VICTORY表示後、handleEventVictoryへ
    handleEventVictory(mission, 0, []);
    return;
  }

  // ★再挑戦フラグ: 既にクリア済みのサブミッション or エリア
  const isReplay = (state.currentSubMissionId && state.clearedSubMissions.includes(state.currentSubMissionId))
                || (!state.currentSubMissionId && state.cleared.includes(missionId));

  // パーティのHP状態を保存(ペット除外)
  const allyUnits = battle.units.filter(u => u.side === 'ally' && !u.isPet);
  state.partyData.forEach((pd, i) => {
    const unit = allyUnits[i];
    if (unit) {
      pd.hp = unit.dead ? 0 : unit.hp;
    }
  });

  // ★B-3,B-4: HP回復前にEXP計算する(HP=1判定が消えないよう)
  // EXP計算 (再挑戦時は全員0)
  let expData;
  if (isReplay) {
    const perChar = {};
    state.partyData.forEach((pd, idx) => { perChar[idx] = 0; });
    expData = { perChar, baseBonus: 0 };
  } else {
    expData = calculateExpGain(mission, allyUnits);
  }

  // EXP獲得前のスナップショットを取る(アニメーション用)
  const expSnapshots = state.partyData.map((pd, idx) => ({
    classKey: pd.classKey,
    name: CLASSES[pd.classKey].name_ja,
    levelBefore: pd.level,
    expBefore: pd.exp,
    expGained: expData.perChar[idx] || 0,
  }));

  // 経験値分配 + Lvアップ判定
  state.partyData.forEach((pd, idx) => {
    pd.exp += expData.perChar[idx] || 0;

    while (pd.exp >= expRequired(pd.level)) {
      pd.exp -= expRequired(pd.level);
      pd.level++;
      const hpGain = HP_GAIN_PER_LV[pd.classKey] || 4;
      pd.maxHP += hpGain;
      pd.hp += hpGain;
      pd.skillPoints = (pd.skillPoints || 0) + 1;
    }
  });

  // ★戦闘後HP全回復(EXP計算後に実施 - HP=1判定が必要なので)
  state.partyData.forEach(pd => {
    pd.hp = pd.maxHP;
  });

  // ミッションクリア + 次ノード解放
  // ★SHIBAさん仕様: サブミッション1つクリアすればエリアクリア(残りはお好みで挑戦可)
  let isAreaCleared = false;
  if (state.currentSubMissionId) {
    if (!state.clearedSubMissions) state.clearedSubMissions = [];
    if (!state.clearedSubMissions.includes(state.currentSubMissionId)) {
      state.clearedSubMissions.push(state.currentSubMissionId);
    }
    // ★1つでもクリアしてればエリアクリア扱い → 次エリアへ進める
    isAreaCleared = true;
  } else {
    // サブミッション指定なし(従来動作) → エリアクリア
    isAreaCleared = true;
  }

  if (isAreaCleared && !state.cleared.includes(missionId)) {
    state.cleared.push(missionId);
  }
  // available からの除去・unlocks解放はエリアクリア時のみ
  if (isAreaCleared) {
    state.available = state.available.filter(id => id !== missionId);
    mission.unlocks.forEach(unlockId => {
      if (!state.available.includes(unlockId) && !state.cleared.includes(unlockId)) {
        state.available.push(unlockId);
      }
    });
  }

  // ★段階1: エリアデータの復元(サブミッション戦闘でenemies/chest上書きしてた場合)
  if (state.currentAreaBackup) {
    mission.enemies = state.currentAreaBackup.enemies;
    if (state.currentAreaBackup.chest !== undefined) {
      mission.chest = state.currentAreaBackup.chest;
    }
    state.currentAreaBackup = null;
  }
  // ★fix: currentSubMissionIdのクリアは showRewardScreen内でサブミッション判定した後にやる
  // (ここでクリアすると報酬画面でサブミッション情報が失われる)

  // ★Step2: 宝箱処理(あれば中身を取得、後でトースト通知)
  const chestNotice = openMissionChest(missionId);

  // 流れ: VICTORY結果 → XP獲得アニメ → 報酬画面 (ACT最終戦は別)
  if (mission.isFinal) {
    if (chestNotice) addLog(chestNotice.html);
    showResult('ACT CLEAR', 'ACT 1 をクリアした!');
    return;
  }

  // 宝箱トーストはXP画面の後に通知(競合を避けるため800ms遅延)
  if (chestNotice) {
    addLog(chestNotice.html);
    setTimeout(() => addLogEquipToast(chestNotice.text), 800);
  }

  // ★再挑戦時はXPアニメ&報酬画面をスキップして即マップへ
  if (isReplay) {
    state.currentSubMissionId = null;
    addLogEquipToast('再挑戦のため報酬なし');
    setTimeout(() => goTo('map'), 600);
    return;
  }

  // XP獲得アニメ → 報酬画面
  // ★B-3,B-4: 表示用のtotal(全員合計)
  const expGainedTotal = Object.values(expData.perChar).reduce((a, b) => a + b, 0);

  // ★v3.10: ボス戦の場合、XP画面の前に撃破ダイアログを挟む
  if (mission.isBossBattle) {
    showBossPostBattleDialog(mission, () => {
      showXpGainScreen(mission, expGainedTotal, expSnapshots);
    });
  } else {
    showXpGainScreen(mission, expGainedTotal, expSnapshots);
  }
}

// ====== EXP計算(原作仕様 7.1) ======
// ★B-3,B-4 + レベルキャップ補正
// 戻り値: { perChar: {pdId: expValue}, totalDistributed: number, levelCap: number }
function calculateExpGain(mission, allyUnits) {
  const partySize = state.partyData.length;

  // ★レベルキャップ = そのバトルの最高敵Lv (原作仕様)
  const enemyLevels = (mission.enemies || []).map(e => e.level || 1);
  const levelCap = enemyLevels.length > 0 ? Math.max(...enemyLevels) : 1;

  // ① 出撃ボーナス: 全員一律
  const enemyTotalLv = enemyLevels.reduce((sum, lv) => sum + lv, 0);
  const baseBonus = 30 + enemyTotalLv * 15;

  // ② 撃破ボーナス: killedBy で本人のみ
  // 敵ユニットの killedBy を集計
  const killCredits = {};  // {pdId: totalKillBonus}
  battle.units.filter(u => u.side === 'enemy' && u.dead).forEach(enemy => {
    if (enemy.killedBy) {
      const lv = enemy.level || 1;
      killCredits[enemy.killedBy] = (killCredits[enemy.killedBy] || 0) + lv * 25;
    }
  });

  // ★レベルキャップ補正(原作: 仕様書「レベルキャップによる経験値減少」)
  // 自Lv ≤ レベルキャップ : 100%
  // 自Lv = キャップ+1     : 84%
  // 自Lv = キャップ+2     : 72%
  // 自Lv = キャップ+3     : 60%
  // 以下12%ずつ減 (最低 4%)
  function levelCapMultiplier(charLv) {
    const diff = charLv - levelCap;
    if (diff <= 0) return 1.0;       // 同値以下 = 100%
    if (diff === 1) return 0.84;     // +1 = 84%
    if (diff === 2) return 0.72;     // +2 = 72%
    if (diff === 3) return 0.60;     // +3 = 60%
    // +4以降は12%ずつ減、最低 4%
    return Math.max(0.04, 0.60 - (diff - 3) * 0.12);
  }

  // ★B-4 (原作仕様): 生存ボーナスは総額固定×生存者で分配
  // 「生存者人数が多くても総量は変わらない」「効率よく稼ぐには死なないこと」
  // バトル難度に応じてプール額を決める(雑魚バトル 60、強敵バトル up to 200)
  const survivalPool = 60 + enemyTotalLv * 8;  // 例: 敵総Lv5で 100、Lv10で 140
  const aliveAllies = allyUnits.filter(u => !u.dead && !u.isPet);
  const survivors = aliveAllies.length;
  // HP=1 は半分の枠扱いにする(生き残ったが瀕死ペナルティ)
  const aliveWeights = aliveAllies.map(u => u.hp <= 1 ? 0.5 : 1.0);
  const totalWeight = aliveWeights.reduce((a, b) => a + b, 0);
  const survivalPerWeight = totalWeight > 0 ? survivalPool / totalWeight : 0;

  // ③ 生存ボーナス + キャップ補正
  const perChar = {};
  state.partyData.forEach((pd, idx) => {
    const ally = allyUnits.find(u => u.classKey === pd.classKey && u.partyIdx === idx);
    let exp = baseBonus;

    if (ally) {
      // 撃破ボーナス
      const killBonus = killCredits[ally.id] || 0;
      exp += killBonus;

      // 生存ボーナス(原作: 総額固定×生存者で分配)
      if (!ally.dead) {
        const weight = ally.hp <= 1 ? 0.5 : 1.0;
        exp += Math.floor(survivalPerWeight * weight);
      }
      // 死亡: 出撃ボーナスのみ(=baseBonus単独)
    }

    // ★レベルキャップ補正を適用
    const mult = levelCapMultiplier(pd.level);
    exp = Math.floor(exp * mult);

    perChar[idx] = exp;
  });

  return { perChar, baseBonus, levelCap, survivalPool };
}

// ====== ミッション敗北処理 ======
function onMissionDefeat() {
  // ★敗北時もHP全回復(再挑戦のしやすさ重視)
  state.partyData.forEach(pd => {
    pd.hp = pd.maxHP;
  });

  // ★段階1: エリアデータの復元(サブミッション戦闘でenemies/chest上書きしてた場合)
  const missionId = state.currentMission;
  const mission = MISSIONS[missionId];
  if (mission && state.currentAreaBackup) {
    mission.enemies = state.currentAreaBackup.enemies;
    if (state.currentAreaBackup.chest !== undefined) {
      mission.chest = state.currentAreaBackup.chest;
    }
    state.currentAreaBackup = null;
  }
  state.currentSubMissionId = null;

  showResult('DEFEAT', 'パーティ全滅 / HP回復、別ミッションで再挑戦可');
}

// ====== 結果表示 ======
function showResult(title, message) {
  const screen = document.getElementById('screen-battle');
  const overlay = document.createElement('div');
  overlay.className = 'battle-result';
  const cls = (title === 'VICTORY' || title === 'ACT CLEAR') ? 'victory' : 'defeat';
  overlay.innerHTML = `
    <div class="result-title ${cls}">${title}</div>
    <div class="result-message">${message}</div>
    <button class="btn btn-primary" onclick="goTo('map'); this.parentElement.remove();">マップへ戻る</button>
  `;
  screen.appendChild(overlay);
}

// ====== XP獲得アニメーション画面 ======
function showXpGainScreen(mission, expGained, snapshots) {
  const screen = document.getElementById('screen-battle');
  const overlay = document.createElement('div');
  overlay.className = 'xp-gain-overlay';
  overlay.id = 'xp-gain-overlay';

  // 各キャラの初期state(アニメーション前) - currentLevel/currentExpはアニメで変動
  const animStates = snapshots.map(s => ({
    ...s,
    currentLevel: s.levelBefore,
    currentExp: s.expBefore,
    expRemainingToAdd: s.expGained,
    isLevelingUp: false,
    leveledUp: false,
  }));

  // HTMLを構築
  let charsHTML = animStates.map((st, idx) => {
    const expPct = Math.min(100, (st.currentExp / expRequired(st.currentLevel)) * 100);
    return `
      <div class="xp-gain-char">
        <div class="xp-gain-char-name">${st.name}</div>
        <div class="xp-gain-char-level" id="xp-level-${idx}">Lv${st.currentLevel}</div>
        <div class="xp-gain-char-sprite">
          <img src="data:image/png;base64,${SPRITES[st.classKey]}">
        </div>
        <div class="xp-tube-wrap">
          <div class="xp-tube-label">XP</div>
          <div class="xp-tube" id="xp-tube-${idx}">
            <div class="xp-tube-fill" id="xp-fill-${idx}" style="height: ${expPct}%"></div>
          </div>
          <div class="xp-tube-text" id="xp-text-${idx}">
            ${st.currentExp}<br>/${expRequired(st.currentLevel)}
          </div>
        </div>
      </div>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="xp-gain-title">EXPERIENCE GAINED</div>
    <div class="xp-gain-subtitle">${mission.name_ja} 制圧 / 総獲得 <span class="xp-gain-total">+${expGained} EXP</span></div>
    <div class="xp-gain-row">${charsHTML}</div>
    <button class="xp-gain-next-btn" id="xp-gain-next" disabled>...計算中...</button>
  `;
  screen.appendChild(overlay);

  // アニメーション開始
  startXpAnimation(animStates, mission, expGained);
}

function startXpAnimation(animStates, mission, expGained) {
  const totalDuration = 1800; // 全体で約1.8秒
  const stepInterval = 30; // 30msごとに更新
  const totalSteps = Math.floor(totalDuration / stepInterval);

  // 全キャラ通算で配るEXP合計(各キャラ別々のexpGainedがあるので per-char)
  // 各キャラ独立に進める(同期して止まる)
  let stepCount = 0;

  const intervalId = setInterval(() => {
    stepCount++;
    const progress = stepCount / totalSteps;
    let allDone = true;

    animStates.forEach((st, idx) => {
      if (st.expRemainingToAdd <= 0) return;

      // 1ステップで加算する量
      const addThisStep = Math.max(1, Math.ceil(st.expGained / totalSteps));
      const actualAdd = Math.min(st.expRemainingToAdd, addThisStep);

      st.currentExp += actualAdd;
      st.expRemainingToAdd -= actualAdd;
      allDone = false;

      // Lvアップ判定
      while (st.currentExp >= expRequired(st.currentLevel)) {
        st.currentExp -= expRequired(st.currentLevel);
        st.currentLevel++;
        st.leveledUp = true;
        st.isLevelingUp = true;

        // Lvアップエフェクト
        const tube = document.getElementById(`xp-tube-${idx}`);
        if (tube) {
          tube.classList.add('leveling');
          // バッジ表示
          const badge = document.createElement('div');
          badge.className = 'xp-levelup-badge';
          badge.textContent = `Lv UP! → Lv${st.currentLevel}`;
          tube.appendChild(badge);
          setTimeout(() => {
            tube.classList.remove('leveling');
          }, 600);
        }

        // Lv表示更新
        const lvEl = document.getElementById(`xp-level-${idx}`);
        if (lvEl) lvEl.textContent = `Lv${st.currentLevel}`;
      }

      // バー更新
      const expPct = Math.min(100, (st.currentExp / expRequired(st.currentLevel)) * 100);
      const fill = document.getElementById(`xp-fill-${idx}`);
      if (fill) fill.style.height = expPct + '%';

      const text = document.getElementById(`xp-text-${idx}`);
      if (text) text.innerHTML = `${st.currentExp}<br>/${expRequired(st.currentLevel)}`;
    });

    // 全部終わったら止める
    if (allDone || stepCount >= totalSteps) {
      clearInterval(intervalId);
      // 「次へ」ボタン有効化
      const nextBtn = document.getElementById('xp-gain-next');
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = '◆ 次へ ◆';
        nextBtn.onclick = () => {
          document.getElementById('xp-gain-overlay').remove();
          // ACT最終戦じゃなければ報酬画面へ
          showRewardScreen(mission, expGained, []);
        };
      }
    }
  }, stepInterval);
}

// ====== バトル後 報酬選択画面 ======
// ====== ★段階1: サブミッション報酬(rewardTypeに応じた1択モーダル) ======
function showSubMissionReward(mission, subMission, expGained) {
  const rewardType = subMission.rewardType;

  // EXPだけ即付与(全タイプ共通)
  // ※ EXPは onMissionVictory で既に付与済み

  // ★starter_pack: EXP(済) + ランダムアイテム1個(自動付与) + ランダム仲間1人
  if (rewardType === 'starter_pack') {
    // 1. ランダムアイテム自動付与 (★Phase 2 Step 3: commonランクから)
    let starterPool = getItemsByRank('common');
    if (starterPool.length === 0) starterPool = Object.keys(ITEMS);
    const randomItem = starterPool[Math.floor(Math.random() * starterPool.length)];
    if (!state.inventory) state.inventory = [];
    state.inventory.push(randomItem);
    const itemDef = ITEMS[randomItem];
    addLogEquipToast(`🎁 ${itemDef.name_ja} を入手!`);

    // 2. 少し遅延して仲間モーダル
    setTimeout(() => {
      const warriorOptions = generateSubMissionWarriorOptions(subMission, mission);
      if (warriorOptions.length > 0) {
        showWarriorPickModal(warriorOptions);
      } else {
        goTo('map');
      }
    }, 600);
    return;
  }

  if (rewardType === 'item') {
    // ★Phase 2 Step 3: 難易度+BLUEゲートからランク抽選してそのランクのアイテムから選ぶ
    const difficulty = subMission.difficulty || 'easy';
    const isBlueGate = !!(subMission.blueGate || mission.blueGate);
    // 3候補を出すが、それぞれ別ランクで抽選するとバラエティが出る
    const candidates = [];
    for (let i = 0; i < 3; i++) {
      const rank = rollRewardRank(difficulty, isBlueGate);
      let pool = getItemsByRank(rank);
      // フォールバック(空ならcommon、それでも空なら全アイテム)
      if (pool.length === 0) pool = getItemsByRank('common');
      if (pool.length === 0) pool = Object.keys(ITEMS);
      // 同候補との重複を避ける
      const filtered = pool.filter(k => !candidates.includes(k));
      const usePool = filtered.length > 0 ? filtered : pool;
      candidates.push(usePool[Math.floor(Math.random() * usePool.length)]);
    }
    showItemPickModal(candidates);
    return;
  }

  if (rewardType === 'warrior') {
    // 仲間選択モーダル: ミッションのwarriorPoolから2-3人(同職業重複OK)
    const warriorOptions = generateSubMissionWarriorOptions(subMission, mission);
    if (warriorOptions.length > 0) {
      showWarriorPickModal(warriorOptions);
    } else {
      // 候補なし(満員等) → 即マップへ
      goTo('map');
    }
    return;
  }

  if (rewardType === 'key') {
    // 鍵入手: トーストで通知して即マップへ
    // (鍵自体の付与は openMissionChest で処理されるが、念のためここでも付与)
    if (!state.keys) state.keys = { gold: 0, blue: 0 };
    // サブミッションに chest 設定があれば優先、なければデフォルトでblue_key
    const chestType = (subMission.chest && subMission.chest.type) || 'blue_key';
    if (chestType === 'gold_key') {
      // openMissionChest経由で既に増えていれば二重加算しない
      // (chestsOpenedで管理されてる)
    }
    addLogEquipToast('🔑 鍵を入手!');
    goTo('map');
    return;
  }

  // ★追加スキル: キャラ選択 → そのキャラの未習得スキルから3つ提示 → 1つ習得
  if (rewardType === 'add_skill') {
    showCharPickerForSkill();
    return;
  }

  // ★追加EXP: 既に勝利時EXP付与済み + 追加分(全員にボーナスEXP)
  if (rewardType === 'extra_exp') {
    const bonusEXP = subMission.bonusExp || 50;
    state.partyData.forEach(pd => {
      pd.exp += bonusEXP;
      while (pd.exp >= expRequired(pd.level)) {
        pd.exp -= expRequired(pd.level);
        pd.level++;
        const hpGain = HP_GAIN_PER_LV[pd.classKey] || 4;
        pd.maxHP += hpGain;
        pd.hp += hpGain;
        pd.skillPoints = (pd.skillPoints || 0) + 1;
      }
    });
    addLogEquipToast(`🌟 全員にボーナスEXP +${bonusEXP}!`);
    setTimeout(() => goTo('map'), 800);
    return;
  }

  // 想定外のtype: 旧来の3択画面にフォールバック
  showLegacyRewardScreen(mission, expGained, []);
}

// ★追加スキル報酬: キャラ選択モーダル
function showCharPickerForSkill() {
  document.querySelectorAll('.reward-overlay, .warrior-pick-overlay').forEach(o => o.remove());

  const overlay = document.createElement('div');
  overlay.className = 'reward-overlay warrior-pick-overlay';
  overlay.innerHTML = `
    <div class="reward-title" style="font-size: 13px; margin-bottom: 2px;">📜 スキル授与 - 誰に教える?</div>
    <div class="reward-options" id="char-pick-options" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; width: 100%; max-width: 760px; padding: 0 4px;"></div>
    <button class="btn" onclick="skipSkillReward()" style="font-size: 9px; padding: 4px 12px; margin-top: 4px;">スキップ</button>
  `;
  document.getElementById('screen-battle').appendChild(overlay);

  const container = overlay.querySelector('#char-pick-options');

  state.partyData.forEach((pd, idx) => {
    const cls = CLASSES[pd.classKey];
    // 未習得スキルがあるキャラのみクリック可能に
    const allSkills = SKILLS[pd.classKey] || [];
    const hasUnlearned = allSkills.some((s, sIdx) => {
      const lv = pd.skillLevels && pd.skillLevels[sIdx];
      return lv === 0; // 未習得
    });
    // 全スキル習得済みのキャラもいるかも → そういう場合は disabled
    const allMastered = !hasUnlearned;

    const card = document.createElement('div');
    card.className = 'reward-card' + (allMastered ? ' disabled-card' : '');
    card.style.cssText = 'padding: 4px; flex-direction: column; align-items: stretch; min-width: 0;' + (allMastered ? ' opacity: 0.4;' : '');
    card.innerHTML = `
      <div style="display: flex; gap: 4px; align-items: center;">
        <div style="width: 28px; height: 28px; background: rgba(0,0,0,0.3); flex-shrink: 0;">
          <img src="data:image/png;base64,${SPRITES[pd.classKey]}" style="width: 100%; height: 100%; image-rendering: pixelated;">
        </div>
        <div style="flex: 1; text-align: left; min-width: 0;">
          <div style="font-size: 9px; color: #e8d8b8; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${pd.charName || cls.name_ja}
          </div>
          <div style="font-size: 8px; color: #a8956e; line-height: 1.1;">${cls.name_ja.slice(0,4)} <span style="color:#d4a020;">Lv${pd.level}</span></div>
          ${allMastered ? '<div style="font-size: 8px; color: #888;">全習得済み</div>' : ''}
        </div>
      </div>
    `;
    if (!allMastered) {
      card.onclick = () => {
        overlay.remove();
        showSkillPickModalForChar(idx);
      };
    }
    container.appendChild(card);
  });
}

// ★追加スキル報酬: スキル選択モーダル(キャラ確定後)
function showSkillPickModalForChar(charIdx) {
  const pd = state.partyData[charIdx];
  if (!pd) { goTo('map'); return; }
  const cls = CLASSES[pd.classKey];
  const allSkills = SKILLS[pd.classKey] || [];

  // 未習得スキルのインデックスを集める
  const unlearned = [];
  allSkills.forEach((s, sIdx) => {
    const lv = pd.skillLevels && pd.skillLevels[sIdx];
    if (lv === 0) unlearned.push(sIdx);
  });
  if (unlearned.length === 0) { goTo('map'); return; }

  // 3つランダム抽出(全部習得可能なら全部表示)
  const shuffled = [...unlearned].sort(() => Math.random() - 0.5);
  const candidates = shuffled.slice(0, Math.min(3, shuffled.length));

  const overlay = document.createElement('div');
  overlay.className = 'reward-overlay warrior-pick-overlay';
  overlay.innerHTML = `
    <div class="reward-title" style="font-size: 13px; margin-bottom: 2px;">
      📜 ${pd.charName || cls.name_ja} に教えるスキル
    </div>
    <div class="reward-options" id="skill-pick-options" style="display: grid; grid-template-columns: ${candidates.length === 1 ? '1fr' : (candidates.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr')}; gap: 6px; width: 100%; max-width: 700px; padding: 0 8px;"></div>
    <button class="btn" onclick="skipSkillReward()" style="font-size: 9px; padding: 4px 12px; margin-top: 4px;">スキップ</button>
  `;
  document.getElementById('screen-battle').appendChild(overlay);

  const container = overlay.querySelector('#skill-pick-options');

  candidates.forEach(sIdx => {
    const s = allSkills[sIdx];
    const typeLabel = { M: '近接', R: '遠距', S: '魔法' }[s.type];
    const dmgStr = s.damage > 0 ? `${s.damage}${s.hits>1?`×${s.hits}`:''}` : (s.damage<0 ? '回復' : '効果');
    const rangeDisp = s.minRange && s.minRange > 1 ? `${s.minRange}-${s.range}` : s.range;

    const card = document.createElement('div');
    card.className = 'reward-card';
    card.style.cssText = 'padding: 8px; flex-direction: column; align-items: stretch; cursor: pointer;';
    card.innerHTML = `
      <div style="font-size: 11px; color: #e8d8b8; margin-bottom: 4px; font-weight: bold;">${s.name}</div>
      <div style="font-size: 9px; color: #a8956e; margin-bottom: 4px;">
        ${typeLabel} / 威${dmgStr} / 射${rangeDisp} / ST${s.cost} / Crit${s.crit}%
      </div>
      <div style="font-size: 9px; color: #d4c5a9; line-height: 1.3;">
        ${s.note || ''}
      </div>
    `;
    card.onclick = () => {
      overlay.remove();
      // 習得処理: skillLevels[sIdx] = 1
      if (!pd.skillLevels) pd.skillLevels = {};
      pd.skillLevels[sIdx] = 1;
      addLogEquipToast(`📜 ${pd.charName || cls.name_ja} が「${s.name}」を習得!`);
      setTimeout(() => goTo('map'), 800);
    };
    container.appendChild(card);
  });
}

function skipSkillReward() {
  document.querySelectorAll('.reward-overlay, .warrior-pick-overlay').forEach(o => o.remove());
  goTo('map');
}

// ★段階1: サブミッション仲間候補生成(各候補は完全なpartyDataオブジェクト)
// SHIBAさん仕様:
//  - パーティ平均±1のレベル(ランダム)
//  - 基本攻撃(BASIC_ATTACKS)+ランダム2スキル
//  - 獲得Lv分のSP所持(プレイヤー振り分け)
//  - レア確率10%で高Lv & レア職業
function generateSubMissionWarriorOptions(subMission, area) {
  const maxParty = 9;
  if (state.partyData.length >= maxParty + 1) return []; // 入替UIに任せる、超過は見送り

  // 平均レベル計算
  const avgLv = state.partyData.length > 0
    ? Math.max(1, Math.round(state.partyData.reduce((s, pd) => s + pd.level, 0) / state.partyData.length))
    : 1;

  // ★Phase 2 Step 3: 難易度+BLUEゲートからランク確率を決定
  const difficulty = subMission.difficulty || 'easy';
  const isBlueGate = !!(subMission.blueGate || area.blueGate);
  // 各候補ごとにランクを抽選(3人で違うランクが出る可能性あり)
  // common→通常、rare→中堅、epic→主人公格Lv+1、event→ストーリー限定なので除外
  // pool は最終的にランクから決まる
  const defaultPool = subMission.warriorPool
    || area.warriorPool
    || null;  // 指定無ければランクで自動選定

  // 3人分の候補を生成
  const candidates = [];
  const usedNamesGlobal = state.partyData.map(p => p.charName).filter(Boolean);

  for (let i = 0; i < 3; i++) {
    // ★各候補ごとにランク抽選
    const rank = rollRewardRank(difficulty, isBlueGate);
    let pool;
    let levelBoost = 0;

    if (defaultPool) {
      // ステージ指定があれば優先(従来通り)
      pool = defaultPool;
    } else {
      // ランクから自動プール選定
      pool = getClassesByRank(rank);
      // フォールバック(空なら common にする)
      if (pool.length === 0) pool = getClassesByRank('common');
    }

    // epicランクの仲間はLv+1ブースト
    if (rank === 'epic') levelBoost = 1;

    const classKey = pool[Math.floor(Math.random() * pool.length)];
    const cls = CLASSES[classKey];

    // レベル: 平均±1 + ランクブースト
    const baseLv = Math.max(1, avgLv - 1 + Math.floor(Math.random() * 3)); // -1, 0, +1
    const lv = baseLv + levelBoost;
    const maxHP = cls.hp_base + (cls.hp_per_level * (lv - 1));

    // スキル選定: 基本攻撃を必ず含む + ランダム2つ
    const allSkills = SKILLS[classKey] || [];
    const basicAtk = BASIC_ATTACKS[classKey];
    let skillSet = [];
    if (basicAtk) {
      const basicIdx = allSkills.findIndex(s => s.name === basicAtk.name);
      if (basicIdx >= 0) skillSet.push(basicIdx);
    }
    const otherIndices = allSkills.map((_, idx) => idx).filter(idx => !skillSet.includes(idx));
    while (skillSet.length < 3 && otherIndices.length > 0) {
      const pickIdx = Math.floor(Math.random() * otherIndices.length);
      skillSet.push(otherIndices.splice(pickIdx, 1)[0]);
    }
    skillSet.sort((a, b) => a - b);

    const skillLevels = {};
    allSkills.forEach((s, idx) => {
      skillLevels[idx] = skillSet.includes(idx) ? 1 : 0;
    });

    // ★Phase 3 B-1: 仲間のスキルLv合計 = キャラLv + 2 (原作仕様)
    // 持ってるスキル数(初期Lv1分)を引いた残りがSP
    // 例: Lv4で2スキル持ち → 合計目標6、初期2 → SP振れる数=4
    const skillTotalTarget = lv + 2;
    const initialSkillCount = skillSet.length;
    const skillPoints = Math.max(0, skillTotalTarget - initialSkillCount);

    const charName = pickCharName(classKey, [...usedNamesGlobal, ...candidates.map(c => c.charName).filter(Boolean)]);

    candidates.push({
      classKey,
      charName,
      level: lv,
      hp: maxHP,
      maxHP,
      exp: 0,
      equipped: [],
      skillPoints,
      skillLevels,
      ownedSkills: skillSet,
      passiveLevel: 1,
      isRare: rank === 'epic',  // ★epic = レア仲間フラグ(UI互換のため残す)
      rewardRank: rank,  // ★新規: 抽選されたランクを記録
    });
  }

  return candidates;
}

// ★旧来の3択画面を別関数に分離(フォールバック用)
function showLegacyRewardScreen(mission, expGained, levelUps) {
  const rewardCandidates = generateRewardCandidates(mission);

  const screen = document.getElementById('screen-battle');
  const overlay = document.createElement('div');
  overlay.className = 'reward-overlay';

  const levelUpHTML = levelUps.length > 0
    ? `<div style="color: #d4a020; font-size: 11px; margin-bottom: 12px;">
         🎉 ${levelUps.map(l => `${l.name} Lv${l.newLevel}!`).join(' / ')}
       </div>`
    : '';

  overlay.innerHTML = `
    <div class="reward-title">VICTORY</div>
    <div class="reward-subtitle">${mission.name_ja} 制圧 / EXP +${expGained}</div>
    ${levelUpHTML}
    <div style="font-size: 11px; color: #d4c5a9; margin-bottom: 10px; letter-spacing: 1px;">
      ◆ 報酬を1つ選択 ◆
    </div>
    <div class="reward-options" id="reward-options"></div>
    <button class="btn" onclick="this.parentElement.remove(); goTo('map');" style="font-size: 10px; padding: 6px 14px;">スキップ</button>
  `;
  screen.appendChild(overlay);

  const optionsContainer = overlay.querySelector('#reward-options');
  rewardCandidates.forEach((reward, idx) => {
    const card = document.createElement('div');
    card.className = 'reward-card';
    card.innerHTML = renderRewardCard(reward);
    card.onclick = () => {
      overlay.remove();
      if (reward.type === 'item') {
        showItemPickModal(reward.items);
      } else if (reward.type === 'warrior') {
        showWarriorPickModal(reward.warriors);
      } else if (reward.type === 'exp') {
        applyExpReward(reward.amount);
        goTo('map');
      }
    };
    optionsContainer.appendChild(card);
  });
}

// ★Phase3 v9: イベント勝利時の処理(加入 + マップ復帰)
function handleEventVictory(mission, expGained, levelUps) {
  console.log('[handleEventVictory] 開始:', mission.id);
  const screen = document.getElementById('screen-battle');

  // 加入処理: イベントごとに加入対象を決定
  let recruit = null;
  let recruitMessage = '';

  if (mission.id === 'event_lone_challenger') {
    // E1: Tor (barbarian Lv2, Great Stamina Lv1, Bash Lv1) が加入
    // 既存のCLASS_NAMES等のシステムに合わせて partyData にプッシュ
    recruit = createRecruitUnit('barbarian', 2, 'Tor');
    recruitMessage = '🎉 Tor が仲間に加入した!';
  } else if (mission.id === 'event_potion_master') {
    // E2: Mortimerの弟子(alchemist Lv5)がランダム名で加入
    const alchemistNames = (CHAR_NAMES && CHAR_NAMES.alchemist) || ['Wilbur', 'Reginald', 'Theobald', 'Algernon'];
    const usedNames = (state.partyData || []).map(p => p.charName).filter(Boolean);
    const available = alchemistNames.filter(n => n !== 'Mortimer' && !usedNames.includes(n));
    const name = available[Math.floor(Math.random() * available.length)] || 'Wilbur';
    recruit = createRecruitUnit('alchemist', 5, name);
    recruitMessage = `🎉 ${name} (Mortimerの弟子) が仲間に加入した!`;
  } else if (mission.id === 'event_bandit_chief') {
    // E3: 加入なし、宝箱(BLUE KEY + Oil of Dazing)獲得
    recruit = null;
    recruitMessage = '🎉 山賊の宝を発見! BLUE KEY と Oil of Dazing を入手した!';
    // BLUE KEY 付与
    if (!state.keys) state.keys = { gold: 0, blue: 0 };
    state.keys.blue = (state.keys.blue || 0) + 1;
    // Oil of Dazing 付与(state.itemsか何か、シンプルに)
    if (!state.items) state.items = [];
    state.items.push({ id: 'oil_of_dazing', name: 'Oil of Dazing', acquired: Date.now() });
  }

  // 加入処理(state.partyDataとstate.partyに追加)
  if (recruit) {
    if (!state.partyData) state.partyData = [];
    if (!state.party) state.party = [];
    state.partyData.push(recruit);
    state.party.push(recruit.classKey);  // ★既存仕様: state.partyにもclassKey追加
  }

  // マップ復帰オーバーレイ(★Phase3 v9: bodyに直接追加、z-index高)
  const overlay = document.createElement('div');
  overlay.className = 'event-victory-overlay';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.85); z-index:99999;
    display:flex; align-items:center; justify-content:center;
  `;
  overlay.innerHTML = `
    <div style="background:linear-gradient(180deg,#2a1810 0%,#1a0e08 100%);
                border:2px solid #d4a020; border-radius:8px;
                padding:28px 24px; max-width:480px; width:90%;
                box-shadow:0 0 40px rgba(212,160,32,0.6);
                text-align:center;">
      <div style="font-size:16px; color:#d4a020; margin-bottom: 16px; font-weight:800; letter-spacing:2px;">
        ⚔️ ${mission.name_ja} クリア
      </div>
      <div style="font-size:14px; color:#fff; margin-bottom: 24px; line-height: 1.7;">
        ${recruitMessage}
      </div>
      <button id="event-victory-close" style="min-width: 160px; padding:12px 20px; background:linear-gradient(180deg,#d4a020 0%,#a07810 100%); border:1px solid #ffe060; color:#1a0e08; font-weight:800; border-radius:4px; cursor:pointer; font-size:14px;">
        マップへ戻る
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  // ★Phase3 v9 fix: ボタン取得を確実にしてからonclick設定
  const closeBtn = document.getElementById('event-victory-close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      console.log('[event-victory] マップへ戻るボタン押下');
      try { overlay.remove(); } catch(e) { console.error(e); }
      // クリア記録
      if (!state.cleared) state.cleared = [];
      if (!state.cleared.includes(mission.id)) {
        state.cleared.push(mission.id);
      }
      // unlocks解放処理
      if (mission.unlocks) {
        if (!state.available) state.available = [];
        mission.unlocks.forEach(uid => {
          if (!state.available.includes(uid)) state.available.push(uid);
        });
      }
      state.currentMission = null;
      state.currentSubMissionId = null;
      // マップに戻る
      try { goTo('map'); } catch(e) { console.error('[goTo map error]', e); }
      if (typeof renderMap === 'function') {
        try { renderMap(); } catch(e) { console.error('[renderMap error]', e); }
      }
    };
    console.log('[event-victory] ボタンハンドラ設定完了');
  } else {
    console.error('[event-victory] event-victory-close ボタンが見つからない!');
  }
}

// ★Phase3 v9: 加入ユニットを作成(state.partyDataフォーマット準拠)
function createRecruitUnit(classKey, level, charName) {
  const cls = CLASSES[classKey];
  if (!cls) return null;
  const skills = SKILLS[classKey] || [];
  // 初期スキルレベル(全Lv1)
  const skillLevels = {};
  skills.forEach((_, i) => { skillLevels[i] = 1; });
  // HP計算
  let maxHP = cls.hp_base + (cls.hp_per_level * (level - 1));
  if (cls.hp_override) maxHP = cls.hp_override;
  return {
    classKey: classKey,
    charName: charName,
    level: level,
    hp: maxHP,
    maxHP: maxHP,
    exp: 0,
    equipped: [],          // ★既存仕様: equipped(配列)
    skillPoints: 0,
    skillLevels: skillLevels,
    passiveLevel: 1,       // ★必須: passiveLevel
    addedSkills: [],
  };
}

function showRewardScreen(mission, expGained, levelUps) {
  // ★Phase3 v9: イベントは報酬画面なし、独自の勝利処理(加入&マップ復帰)
  if (mission.isEvent) {
    handleEventVictory(mission, expGained, levelUps);
    return;
  }

  // ★段階1更新: サブミッション報酬タイプに応じて1択モーダルを直接表示
  const subMissionId = state.currentSubMissionId;
  let subMission = null;
  if (subMissionId && mission.missions) {
    subMission = mission.missions.find(m => m.id === subMissionId);
  }

  // ★FIX: ここでの isReplay 判定は削除。
  // onMissionVictory() で既にクリア記録(clearedSubMissions.push)済みのため、
  // ここで再判定すると初回クリアでも必ず true になり「再挑戦のため報酬なし」と誤表示されていた。
  // 再挑戦時は onMissionVictory 側で先に return しているので、ここに来る時点で常に初回。

  if (subMission && subMission.rewardType) {
    showSubMissionReward(mission, subMission, expGained);
    state.currentSubMissionId = null;  // ★fix: 報酬モーダル表示後にクリア
    return;
  }

  // ここまで来たらサブミッション情報は不要
  state.currentSubMissionId = null;

  // 以下は旧来の3択画面(サブミッションがない/rewardType未設定の場合のみ)
  // ランダムに3種類の報酬候補を生成
  const rewardCandidates = generateRewardCandidates(mission);

  const screen = document.getElementById('screen-battle');
  const overlay = document.createElement('div');
  overlay.className = 'reward-overlay';

  // Lvアップ通知文
  const levelUpHTML = levelUps.length > 0
    ? `<div style="color: #d4a020; font-size: 11px; margin-bottom: 12px;">
         🎉 ${levelUps.map(l => `${l.name} Lv${l.newLevel}!`).join(' / ')}
       </div>`
    : '';

  overlay.innerHTML = `
    <div class="reward-title">VICTORY</div>
    <div class="reward-subtitle">${mission.name_ja} 制圧 / EXP +${expGained}</div>
    ${levelUpHTML}
    <div style="font-size: 11px; color: #d4c5a9; margin-bottom: 10px; letter-spacing: 1px;">
      ◆ 報酬を1つ選択 ◆
    </div>
    <div class="reward-options" id="reward-options"></div>
    <button class="btn" onclick="this.parentElement.remove(); goTo('map');" style="font-size: 10px; padding: 6px 14px;">スキップ</button>
  `;
  screen.appendChild(overlay);

  const optionsContainer = overlay.querySelector('#reward-options');
  rewardCandidates.forEach((reward, idx) => {
    const card = document.createElement('div');
    card.className = 'reward-card';
    card.innerHTML = renderRewardCard(reward);
    card.onclick = () => {
      // 親モーダルは消す
      overlay.remove();
      // 報酬タイプに応じてサブモーダルor即時処理
      if (reward.type === 'item') {
        showItemPickModal(reward.items);
      } else if (reward.type === 'warrior') {
        showWarriorPickModal(reward.warriors);
      } else if (reward.type === 'exp') {
        // EXP は即時付与してマップへ
        applyExpReward(reward.amount);
        goTo('map');
      }
    };
    optionsContainer.appendChild(card);
  });
}

// EXP報酬を全員に分配
function applyExpReward(amount) {
  state.partyData.forEach(pd => {
    pd.exp += amount;
    while (pd.exp >= expRequired(pd.level)) {
      pd.exp -= expRequired(pd.level);
      pd.level++;
      const hpGain = HP_GAIN_PER_LV[pd.classKey] || 4;
      pd.maxHP += hpGain;
      pd.hp += hpGain;
      pd.skillPoints = (pd.skillPoints || 0) + 1;
    }
  });
}

// ====== 報酬候補生成 ======
function generateRewardCandidates(mission) {
  const candidates = [];
  const maxParty = 9;
  const isWarriorMission = mission.warriorReward && state.partyData.length < maxParty;

  if (isWarriorMission) {
    // 仲間ミッション: 仲間 + アイテム + EXP
    const warriorOptions = generateWarriorOptions(mission);
    if (warriorOptions.length > 0) {
      candidates.push({ type: 'warrior', warriors: warriorOptions });
    }
    const itemReward = pickRandomItems(Object.keys(ITEMS), 3);
    candidates.push({ type: 'item', items: itemReward });
    candidates.push({ type: 'exp', amount: 100 + Math.floor(Math.random() * 80) });
  } else {
    // 通常ミッション: アイテム×2 + EXP
    const itemKeys = Object.keys(ITEMS);
    candidates.push({ type: 'item', items: pickRandomItems(itemKeys, 3) });
    candidates.push({ type: 'item', items: pickRandomItems(itemKeys, 3) });
    candidates.push({ type: 'exp', amount: 120 + Math.floor(Math.random() * 100) });
  }

  return candidates.slice(0, 3);
}

function pickRandomItems(itemKeys, count) {
  const shuffled = [...itemKeys].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 仲間候補生成(ミッションのwarriorPool優先)
function generateWarriorOptions(mission) {
  const ownedClasses = state.partyData.map(pd => pd.classKey);
  // ミッション固有のプールがあればそこから
  let pool = mission.warriorPool || ['monk', 'gladiator', 'archer', 'alchemist', 'ranger', 'jungleman', 'healer', 'knight'];
  const available = pool.filter(c => !ownedClasses.includes(c));

  if (available.length === 0) return [];

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(2, shuffled.length));
}

// ====== 報酬カード描画 ======
function renderRewardCard(reward) {
  if (reward.type === 'item') {
    const itemsHTML = reward.items.map(key => {
      const item = ITEMS[key];
      const colorClass = `color-${item.color}`;
      const icon = item.color === 'orange' ? '🍞' : (item.color === 'blue' ? '🛡' : '✨');
      return `<div class="reward-item-display ${colorClass}" title="${item.name_ja}">${icon}</div>`;
    }).join('');
    return `
      <div class="reward-icon">📦</div>
      <div class="reward-card-title">アイテム</div>
      <div style="display: flex; gap: 4px; justify-content: center;">${itemsHTML}</div>
      <div class="reward-card-detail">3つから1つ獲得</div>
    `;
  }

  if (reward.type === 'warrior') {
    const warriorsHTML = reward.warriors.map(classKey => `
      <div class="reward-warrior-mini">
        <img src="data:image/png;base64,${SPRITES[classKey]}">
      </div>
    `).join('');
    const names = reward.warriors.map(c => CLASSES[c].name_ja).join(' or ');
    return `
      <div class="reward-icon">🤝</div>
      <div class="reward-card-title">新たな仲間</div>
      <div class="reward-warriors">${warriorsHTML}</div>
      <div class="reward-card-detail">${names}<br>1人をパーティに追加</div>
    `;
  }

  if (reward.type === 'exp') {
    return `
      <div class="reward-icon">⭐</div>
      <div class="reward-card-title">経験値ボーナス</div>
      <div style="font-size: 18px; color: #d4a020;">+${reward.amount}</div>
      <div class="reward-card-detail">パーティ全員に経験値分配</div>
    `;
  }
}

// ====== 報酬獲得処理 ======
function claimReward(reward) {
  if (reward.type === 'item') {
    // 3つから1つ選ぶ → サブモーダル
    showItemPickModal(reward.items);
    return; // モーダル側でgoTo呼ぶ(skip遷移はclaimReward呼び出し元でやる)
  }

  if (reward.type === 'warrior') {
    showWarriorPickModal(reward.warriors);
    return;
  }

  if (reward.type === 'exp') {
    state.partyData.forEach(pd => {
      pd.exp += reward.amount;
      while (pd.exp >= expRequired(pd.level)) {
        pd.exp -= expRequired(pd.level);
        pd.level++;
        const cls = CLASSES[pd.classKey];
        const hpGain = HP_GAIN_PER_LV[pd.classKey] || 4;
        pd.maxHP += hpGain;
        pd.hp += hpGain;
      }
    });
  }
}

// アイテム3択サブモーダル(分かりやすい大きめUI)
function showItemPickModal(itemKeys) {
  const overlay = document.createElement('div');
  overlay.className = 'reward-overlay';
  overlay.innerHTML = `
    <div class="reward-title" style="font-size: 16px;">⚔ アイテム獲得 ⚔</div>
    <div class="reward-subtitle">下記から1つを選んでください</div>
    <div class="reward-options" id="item-pick-options"></div>
    <div style="font-size: 9px; color: #5a4a30; margin-top: 8px;">※選んだアイテムはインベントリに追加されます</div>
  `;
  document.getElementById('screen-battle').appendChild(overlay);

  const container = overlay.querySelector('#item-pick-options');
  itemKeys.forEach(key => {
    const item = ITEMS[key];
    const colorClass = `color-${item.color}`;
    const icon = item.color === 'orange' ? '🍞' : (item.color === 'blue' ? '🛡' : '✨');
    const colorJa = { orange: '食料系', blue: '装備系', pink: '魔法系' }[item.color];

    // ★Phase 2 Step 3: epicランクならピンク枠
    const isEpic = (typeof ITEM_RANKS !== 'undefined') && ITEM_RANKS[key] === 'epic';
    const epicStyle = isEpic
      ? 'border: 2px solid #ff3399; box-shadow: 0 0 12px rgba(255,51,153,0.6);'
      : '';

    const card = document.createElement('div');
    card.className = 'reward-card';
    if (isEpic) card.style.cssText = epicStyle;
    card.innerHTML = `
      <div class="reward-item-display ${colorClass}" style="width: 56px; height: 56px; font-size: 28px;">${icon}</div>
      <div class="reward-card-title" style="font-size: 12px; margin-top: 4px; ${isEpic ? 'color: #ff66bb;' : ''}">${item.name_ja}</div>
      <div style="font-size: 9px; color: #a8956e;">${colorJa}</div>
      <div class="reward-card-detail" style="font-size: 10px; color: #d4c5a9; margin-top: 6px;">${item.effect}</div>
      <div style="font-size: 10px; color: ${isEpic ? '#ff3399' : '#d4a020'}; margin-top: 4px; letter-spacing: 1px;">★ 価値 ${item.value}</div>
    `;
    card.onclick = () => {
      state.inventory.push(key);
      addLog(`<span style="color:${isEpic ? '#ff3399' : '#d4a020'}">${item.name_ja} を獲得</span>`);
      overlay.remove();
      goTo('map');
    };
    container.appendChild(card);
  });
}

// ====== 酒場画面 ======
function showTavernScreen(mission) {
  // 既存のオーバーレイ削除
  document.querySelectorAll('.tavern-overlay').forEach(o => o.remove());

  // 仲間候補(同クラスもOK、3人)
  const pool = mission.tavernPool || [];
  // 重み付きでランダムに3人選ぶ(同クラス重複はやや控えめに)
  const ownedClasses = state.partyData.map(pd => pd.classKey);
  // 未所持クラスを優先しつつ、所持クラスも混ぜる
  const weighted = [];
  pool.forEach(c => {
    weighted.push(c); // 1票
    if (!ownedClasses.includes(c)) weighted.push(c); // 未所持はもう1票(重み2倍)
  });

  const candidates = [];
  while (candidates.length < 3 && weighted.length > 0) {
    const idx = Math.floor(Math.random() * weighted.length);
    candidates.push(weighted[idx]);
    weighted.splice(idx, 1);
  }

  if (candidates.length === 0) {
    alert('酒場に誰もいない... マップへ戻ります');
    onTavernComplete();
    return;
  }

  // 平均Lv
  const avgLv = Math.max(1, Math.floor(state.partyData.reduce((s, pd) => s + pd.level, 0) / state.partyData.length));

  const overlay = document.createElement('div');
  overlay.className = 'tavern-overlay';

  const cardsHTML = candidates.map(classKey => {
    const cls = CLASSES[classKey];
    const calcHP = cls.hp_base + (cls.hp_per_level * (avgLv - 1));
    const skills = SKILLS[classKey] || [];
    const passive = CLASS_PASSIVES[classKey];

    const skillsHTML = skills.map(s => {
      const typeLabel = { M: '近接', R: '遠距', S: '魔法' }[s.type];
      const dmgStr = s.damage > 0 ? `${s.damage}${s.hits>1?`×${s.hits}`:''}` : (s.damage<0 ? '回復' : '効果');
      return `<div style="font-size:9px;color:#d4c5a9;line-height:1.4;">・${s.name_ja} <span style="color:#a8956e;">(${typeLabel} ${dmgStr})</span></div>`;
    }).join('');

    const passiveHTML = passive
      ? `<div style="font-size:9px;color:#88ddff;margin-top:3px;">⭐ ${passive.name}: ${passive.desc}</div>`
      : '';

    return `
      <div class="tavern-card" data-class="${classKey}">
        <div style="display:flex;gap:10px;width:100%;align-items:center;">
          <div style="width:64px;height:64px;background:rgba(0,0,0,0.3);border:1px solid #5a4a30;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <img src="data:image/png;base64,${SPRITES[classKey]}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">
          </div>
          <div style="flex:1;text-align:left;min-width:0;">
            <div style="font-size:13px;color:#e8d8b8;margin-bottom:2px;">${cls.name_ja} <span style="color:#d4a020;font-size:10px;">Lv${avgLv}</span></div>
            <div style="font-size:9px;color:#a8956e;margin-bottom:4px;">${cls.role}</div>
            <div style="font-size:10px;color:#d4c5a9;">HP <strong>${calcHP}</strong> / MV ${cls.move} / DS ${cls.dash}</div>
            <div style="font-size:9px;color:#a8956e;">装甲 [近${cls.armor[0]} 遠${cls.armor[1]} 特${cls.armor[2]}]</div>
          </div>
        </div>
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid #3a2e1e;width:100%;text-align:left;">
          ${skillsHTML}
          ${passiveHTML}
        </div>
      </div>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="tavern-content">
      <div class="tavern-title">🍺 酒場 🍺</div>
      <div class="tavern-subtitle">${mission.name_ja} / ここで1人だけ仲間にできる</div>
      <div class="tavern-cards">${cardsHTML}</div>
      <div style="font-size:9px;color:#5a4a30;margin-top:8px;text-align:center;">※選ばなくても通過可能(マップへ戻る)</div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn" onclick="leaveTavern()" style="font-size:11px;padding:6px 18px;flex:1;">何もせず立ち去る</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // カードにクリックハンドラ
  overlay.querySelectorAll('.tavern-card').forEach(card => {
    card.onclick = () => recruitFromTavern(card.dataset.class, avgLv);
  });
}

function recruitFromTavern(classKey, avgLv) {
  const cls = CLASSES[classKey];
  const maxHP = cls.hp_base + (cls.hp_per_level * (avgLv - 1));

  const skills = SKILLS[classKey] || [];
  // ★Phase 1: 初期習得スキルだけLv1スタート、未習得はLv0のまま
  const skillLevels = buildInitialSkillLevels(classKey);
  // 既存スキル(Lv>0)にLvポイントを振り分ける
  const learnedIdxList = Object.keys(skillLevels).filter(i => skillLevels[i] > 0).map(Number);
  const autoPoints = Math.max(0, avgLv - 1);
  let remaining = autoPoints;
  let i = 0;
  while (remaining > 0 && learnedIdxList.length > 0) {
    const targetIdx = learnedIdxList[i % learnedIdxList.length];
    skillLevels[targetIdx]++;
    remaining--;
    i++;
  }
  const passiveAutoLv = Math.min(5, 1 + Math.floor(autoPoints / 4));

  const usedNames3 = state.partyData.map(p => p.charName).filter(Boolean);
  const charName = pickCharName(classKey, usedNames3);
  state.partyData.push({
    classKey,
    charName,
    level: avgLv,
    hp: maxHP,
    maxHP,
    exp: 0,
    equipped: [],
    skillPoints: 0,
    skillLevels,
    passiveLevel: passiveAutoLv,
  });
  state.party.push(classKey);

  addLogEquipToast(`${charName ? charName + ' (' : ''}${cls.name_ja}${charName ? ')' : ''} が仲間に加わった!`);

  onTavernComplete();
}

function leaveTavern() {
  onTavernComplete();
}

function onTavernComplete() {
  // 酒場通過 = ミッションクリア扱い
  const missionId = state.currentMission;
  const mission = MISSIONS[missionId];
  if (mission && !state.cleared.includes(missionId)) {
    state.cleared.push(missionId);
  }
  if (mission) {
    state.available = state.available.filter(id => id !== missionId);
    mission.unlocks.forEach(unlockId => {
      if (!state.available.includes(unlockId) && !state.cleared.includes(unlockId)) {
        state.available.push(unlockId);
      }
    });
  }

  // ★Step2: 宝箱処理(酒場通過時)
  const chestNotice = openMissionChest(missionId);
  if (chestNotice) {
    setTimeout(() => addLogEquipToast(chestNotice.text), 300);
  }

  document.querySelectorAll('.tavern-overlay').forEach(o => o.remove());
  goTo('map');
}

// Warrior候補サブモーダル(パラメータ詳細表示)
function showWarriorPickModal(candidates) {
  // 既存があれば削除
  document.querySelectorAll('.reward-overlay, .warrior-pick-overlay').forEach(o => o.remove());

  const overlay = document.createElement('div');
  overlay.className = 'reward-overlay warrior-pick-overlay';

  // ★Phase 2 Step 3: epicランクをピンクで表示(rewardRankフィールドを使う、isRareは旧互換)
  const isCandEpic = (c) => c.rewardRank === 'epic' || c.isRare;
  // 全員epicだったらタイトル変える
  const allEpic = candidates.length > 0 && candidates.every(c => isCandEpic(c));

  overlay.innerHTML = `
    <div class="reward-title" style="font-size: ${allEpic ? 14 : 13}px; margin-bottom: 2px; ${allEpic ? 'color: #ff66bb; text-shadow: 0 0 8px rgba(255, 51, 153, 0.8);' : ''}">
      ${allEpic ? '✨ レア仲間出現! ✨' : '🤝 仲間選択'}
    </div>
    <div class="reward-options" id="warrior-pick-options" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; width: 100%; max-width: 700px; padding: 0 8px;"></div>
    <button class="btn" onclick="skipWarriorPick()" style="font-size: 9px; padding: 4px 12px; margin-top: 6px;">スキップ</button>
  `;
  document.getElementById('screen-battle').appendChild(overlay);

  const container = overlay.querySelector('#warrior-pick-options');
  candidates.forEach((cand, idx) => {
    const cls = CLASSES[cand.classKey];
    const allSkills = SKILLS[cand.classKey] || [];
    const passive = CLASS_PASSIVES[cand.classKey];
    const isEpic = isCandEpic(cand);

    // 所持スキル一覧(コンパクト)
    const skillsHTML = cand.ownedSkills.map(sIdx => {
      const s = allSkills[sIdx];
      if (!s) return '';
      return `<div style="font-size: 8px; color: #d4c5a9; line-height: 1.3;">・${s.name}</div>`;
    }).join('');

    const passiveHTML = passive
      ? `<div style="font-size: 8px; color: #88ddff; margin-top: 2px; line-height: 1.2;">⭐ ${passive.name}</div>`
      : '';

    const rareTag = isEpic
      ? `<div style="background: #ff3399; color: #fff; padding: 0 4px; border-radius: 2px; font-size: 8px; font-weight: bold; display: inline-block; margin-left: 3px;">★EPIC</div>`
      : '';

    const card = document.createElement('div');
    card.className = 'reward-card' + (isEpic ? ' rare-warrior-card' : '');
    card.style.cssText = 'padding: 6px; flex-direction: column; align-items: stretch; min-width: 0;'
      + (isEpic ? ' border: 2px solid #ff3399; box-shadow: 0 0 12px rgba(255,51,153,0.6);' : '');
    card.innerHTML = `
      <div style="display: flex; gap: 6px; align-items: center;">
        <div style="width: 40px; height: 40px; background: rgba(0,0,0,0.3); border: 1px solid ${isEpic ? '#ff3399' : '#5a4a30'}; flex-shrink: 0;">
          <img src="data:image/png;base64,${SPRITES[cand.classKey]}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;">
        </div>
        <div style="flex: 1; text-align: left; min-width: 0;">
          <div style="font-size: 10px; color: ${isEpic ? '#ff66bb' : '#e8d8b8'}; line-height: 1.1;">
            ${cand.charName || cls.name_ja}${rareTag}
          </div>
          <div style="font-size: 8px; color: #a8956e; line-height: 1.2;">${cls.name_ja} <span style="color:${isEpic ? '#ff3399' : '#d4a020'};">Lv${cand.level}</span></div>
          <div style="font-size: 8px; color: #d4c5a9; line-height: 1.2;">HP${cand.maxHP} / SP<span style="color:${isEpic ? '#ff3399' : '#d4a020'};">${cand.skillPoints}</span></div>
        </div>
      </div>
      <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid #3a2e1e; text-align: left;">
        ${skillsHTML}
        ${passiveHTML}
      </div>
    `;
    card.onclick = () => {
      overlay.remove();
      onSelectWarrior(cand);
    };
    container.appendChild(card);
  });
}

// ★仲間選択時の処理
function onSelectWarrior(candidate) {
  // 加入処理本体は addWarriorToParty で
  // 9人上限チェック
  if (state.partyData.length >= 9) {
    showPartyReplaceModal(candidate);
    return;
  }

  // 通常加入 → 演出 → マップへ
  addWarriorToParty(candidate);
  showNewWarriorAnnouncement(candidate);
}

// ★パーティに加える(共通処理)
function addWarriorToParty(candidate) {
  // candidate から isRare/ownedSkills を除去して partyData に追加
  const { isRare, ownedSkills, ...partyEntry } = candidate;
  state.partyData.push(partyEntry);
  state.party.push(candidate.classKey);
}

// ★「新しい仲間!」演出 → キャラ詳細表示
function showNewWarriorAnnouncement(candidate) {
  const overlay = document.createElement('div');
  overlay.className = 'new-warrior-overlay';
  overlay.innerHTML = `
    <div class="new-warrior-banner">
      <div class="new-warrior-bang">${candidate.isRare ? '✨ 新しい仲間! ✨' : '🤝 新しい仲間!'}</div>
      <div class="new-warrior-name">
        ${candidate.charName || CLASSES[candidate.classKey].name_ja}
        <span style="color:#d4a020; font-size: 14px;">Lv${candidate.level}</span>
      </div>
      <div class="new-warrior-class">${CLASSES[candidate.classKey].name_ja}</div>
      <div style="margin-top: 12px; font-size: 10px; color: #a8956e;">
        SP ${candidate.skillPoints} を自由に振り分けられます
      </div>
      <button class="btn btn-primary" onclick="closeNewWarrior()" style="margin-top: 16px;">確認</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function closeNewWarrior() {
  document.querySelectorAll('.new-warrior-overlay').forEach(o => o.remove());
  // マップへ
  goTo('map');
}

function skipWarriorPick() {
  document.querySelectorAll('.reward-overlay, .warrior-pick-overlay').forEach(o => o.remove());
  goTo('map');
}

// ★9人超える時のパーティ入れ替えUI
function showPartyReplaceModal(newCandidate) {
  const overlay = document.createElement('div');
  overlay.className = 'reward-overlay party-replace-overlay warrior-pick-overlay';
  overlay.innerHTML = `
    <div class="reward-title" style="font-size: 12px; margin-bottom: 2px;">⚠ パーティ満員 (9/9) - 1人を放出</div>
    <div class="reward-options" id="replace-options" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; width: 100%; max-width: 760px; padding: 0 4px;"></div>
    <button class="btn" onclick="cancelReplace()" style="font-size: 9px; padding: 4px 12px; margin-top: 4px;">加入しない</button>
  `;
  document.getElementById('screen-battle').appendChild(overlay);

  const container = overlay.querySelector('#replace-options');

  // 既存メンバー + 新候補
  const allOptions = [...state.partyData.map((pd, idx) => ({ pd, idx, isNew: false })), { pd: newCandidate, idx: -1, isNew: true }];

  allOptions.forEach(opt => {
    const cls = CLASSES[opt.pd.classKey];
    const card = document.createElement('div');
    card.className = 'reward-card' + (opt.isNew ? ' new-warrior-highlight' : '');
    card.style.cssText = 'padding: 4px; flex-direction: column; align-items: stretch; min-width: 0;';
    card.innerHTML = `
      <div style="display: flex; gap: 4px; align-items: center;">
        <div style="width: 28px; height: 28px; background: rgba(0,0,0,0.3); flex-shrink: 0;">
          <img src="data:image/png;base64,${SPRITES[opt.pd.classKey]}" style="width: 100%; height: 100%; image-rendering: pixelated;">
        </div>
        <div style="flex: 1; text-align: left; min-width: 0;">
          <div style="font-size: 9px; color: #e8d8b8; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${opt.pd.charName || cls.name_ja}
          </div>
          <div style="font-size: 8px; color: #a8956e; line-height: 1.1;">${cls.name_ja.slice(0,4)} <span style="color:#d4a020;">Lv${opt.pd.level}</span></div>
          ${opt.isNew ? '<div style="font-size: 8px; color: #d4a020; line-height: 1.1;">★新加入</div>' : ''}
        </div>
      </div>
    `;
    card.onclick = () => doReplace(opt.idx, newCandidate);
    container.appendChild(card);
  });
}

// 入れ替え実行(放出 → 加入)
function doReplace(removeIdx, newCandidate) {
  document.querySelectorAll('.party-replace-overlay').forEach(o => o.remove());

  if (removeIdx === -1) {
    // 新キャラ自体を放出選択 → 加入しない
    goTo('map');
    return;
  }

  const removed = state.partyData[removeIdx];
  state.partyData.splice(removeIdx, 1);
  state.party.splice(removeIdx, 1);
  addLogEquipToast(`${removed.charName || CLASSES[removed.classKey].name_ja} はパーティを去った`);

  addWarriorToParty(newCandidate);
  showNewWarriorAnnouncement(newCandidate);
}

function cancelReplace() {
  document.querySelectorAll('.party-replace-overlay').forEach(o => o.remove());
  goTo('map');
}

// ====== 移動実行 ======
function moveUnit(unit, x, y, isDash) {
  unit.x = x;
  unit.y = y;

  if (isDash) {
    unit.st -= 35;
    unit.hasDashed = true;
    unit.hasMoved = true;
    addLog(`${unit.name} がダッシュ移動 (-35 ST)`);
  } else {
    unit.hasMoved = true;
    addLog(`${unit.name} が移動`);
  }

  renderBattle();
  // 移動後はもう一度範囲表示(ダッシュは可能、または待機ボタンで終了)
  showMoveRange(unit);
}

// ====== 敵のAI: タイプ別分岐 ======
function enemyAction(unit) {
  const aiType = getAIType(unit);
  const allies = battle.units.filter(u => !u.dead && u.side === 'ally');

  if (allies.length === 0) {
    setTimeout(() => actionWait(), 300);
    return;
  }

  // ターゲット選定(AIタイプ別)
  const target = selectTarget(unit, allies, aiType);

  // 攻撃用スキル一覧
  const attackSkills = unit.skills.filter(s => s.damage > 0 && unit.st >= s.cost && s.range > 0);
  const dist = manhattan(unit, target);

  // 撤退判断(smart以上、HP低下時)
  if (aiType !== 'basic' && shouldRetreat(unit, allies)) {
    retreatAction(unit);
    return;
  }

  // 射程内で使えるスキル
  const usable = attackSkills.filter(s => dist <= s.range && (s.range === 1 || hasLineOfSight(unit, target)));

  if (usable.length > 0) {
    const choice = chooseSkill(unit, target, usable, aiType);
    setTimeout(() => {
      executeSkillEnemy(unit, target, choice);
      setTimeout(() => actionWait(), 700);
    }, 400);
    return;
  }

  // 移動: ターゲットに近づく
  const { moveCells, dashCells } = calcMoveRange(unit);
  const allOptions = [...moveCells, ...dashCells.map(c => ({...c, dash: true}))];

  if (allOptions.length === 0) {
    addLog(`${unit.name} は動けない`);
    setTimeout(() => actionWait(), 500);
    return;
  }

  let bestOption = pickMoveOption(unit, target, allOptions, aiType, attackSkills);

  moveUnit(unit, bestOption.x, bestOption.y, !!bestOption.dash);

  setTimeout(() => {
    const newDist = manhattan(unit, target);
    const newUsable = attackSkills.filter(s => newDist <= s.range && (s.range === 1 || hasLineOfSight(unit, target)));
    if (!target.dead && newUsable.length > 0) {
      const choice = chooseSkill(unit, target, newUsable, aiType);
      executeSkillEnemy(unit, target, choice);
      setTimeout(() => actionWait(), 700);
    } else {
      setTimeout(() => actionWait(), 400);
    }
  }, 500);
}

// ====== ターゲット選定(AIタイプ別) ======
function selectTarget(unit, allies, aiType) {
  if (aiType === 'basic') {
    // 一番近い味方
    return allies.reduce((best, a) =>
      manhattan(unit, a) < manhattan(unit, best) ? a : best
    );
  }

  if (aiType === 'smart') {
    // 評価: 射程内 > HP低い > 距離近い
    const candidates = allies.map(a => {
      const d = manhattan(unit, a);
      const hpRatio = a.hp / a.maxHP;
      // 射程内ボーナス、HP低いほど高評価、近いほど高評価
      const inRange = unit.skills.some(s => s.damage > 0 && d <= s.range && unit.st >= s.cost);
      let score = 0;
      score += inRange ? 100 : 0;
      score += (1 - hpRatio) * 80;  // HP少ない味方優先
      score += Math.max(0, 50 - d * 5);  // 距離近いと高評価
      return { unit: a, score };
    });
    candidates.sort((x, y) => y.score - x.score);
    return candidates[0].unit;
  }

  // tactical: smartの優先度 + ヒーラー優先 + バフ役優先
  const candidates = allies.map(a => {
    const d = manhattan(unit, a);
    const hpRatio = a.hp / a.maxHP;
    const inRange = unit.skills.some(s => s.damage > 0 && d <= s.range && unit.st >= s.cost);
    let score = 0;
    // ヒーラー(回復系スキル持ち)を最優先
    const isHealer = a.skills.some(s => s.damage < 0);
    if (isHealer) score += 150;
    // 召喚士(BeastmasterやRanger)も優先
    if (a.classKey === 'beastmaster' || a.classKey === 'ranger') score += 50;
    score += inRange ? 100 : 0;
    score += (1 - hpRatio) * 80;
    score += Math.max(0, 50 - d * 5);
    return { unit: a, score };
  });
  candidates.sort((x, y) => y.score - x.score);
  return candidates[0].unit;
}

// ====== スキル選択(AIタイプ別) ======
function chooseSkill(unit, target, usable, aiType) {
  if (aiType === 'basic') {
    // 単純: 最大期待ダメージ
    return usable.reduce((best, s) =>
      (s.damage * s.hits > best.damage * best.hits) ? s : best
    );
  }

  // smart/tactical: 状況に応じて状態異常スキル優先など
  const targetHasStatuses = target.statuses && target.statuses.length > 0;

  // ターゲットを倒せるかチェック → 倒せるなら最大ダメ
  for (const s of usable) {
    const expectedDmg = s.damage * s.hits * (s.crit > 0 ? 1.2 : 1);
    if (expectedDmg >= target.hp) return s;
  }

  // 状態異常未付与の敵には状態異常スキルを優先(50%確率で)
  if (!targetHasStatuses && Math.random() < 0.5) {
    const statusSkills = usable.filter(s => s.status &&
      ['stun', 'daze', 'slow', 'poison', 'armor_down', 'armor_down_full'].includes(s.status)
    );
    if (statusSkills.length > 0) {
      return statusSkills.reduce((best, s) => s.cost < best.cost ? s : best);
    }
  }

  // それ以外は最大期待ダメージ
  return usable.reduce((best, s) =>
    (s.damage * s.hits > best.damage * best.hits) ? s : best
  );
}

// ====== 撤退判断 ======
function shouldRetreat(unit, allies) {
  // HP30%以下、かつ周囲に味方が近くにいる場合は撤退
  if (unit.hp / unit.maxHP > 0.3) return false;

  // 隣接に敵がいなければ無理に撤退しない
  const adjacentEnemy = allies.some(a => manhattan(a, unit) <= 1);
  return adjacentEnemy;
}

// ====== 撤退行動: ターゲットから離れる ======
function retreatAction(unit) {
  const allies = battle.units.filter(u => !u.dead && u.side === 'ally');
  const { moveCells, dashCells } = calcMoveRange(unit);
  const allOptions = [...moveCells, ...dashCells.map(c => ({...c, dash: true}))];

  if (allOptions.length === 0) {
    setTimeout(() => actionWait(), 400);
    return;
  }

  // 全味方からの距離合計が最大になるマス
  let bestOption = allOptions[0];
  let bestScore = -Infinity;
  for (const opt of allOptions) {
    let totalDist = 0;
    for (const a of allies) totalDist += manhattan(opt, a);
    if (totalDist > bestScore) { bestScore = totalDist; bestOption = opt; }
  }

  addLog(`${unit.name} <span style="color:#88ccff">[撤退]</span>`);
  moveUnit(unit, bestOption.x, bestOption.y, !!bestOption.dash);
  setTimeout(() => actionWait(), 500);
}

// ====== 移動先選定(AIタイプ別) ======
function pickMoveOption(unit, target, options, aiType, attackSkills) {
  if (aiType === 'basic') {
    // ターゲットに最も近づくマス
    return options.reduce((best, o) =>
      manhattan(o, target) < manhattan(best, target) ? o : best
    );
  }

  // smart/tactical: 移動後に攻撃できるマスを優先
  const withScore = options.map(o => {
    let score = 0;
    const distAfter = manhattan(o, target);

    // 移動後に射程に入るスキルがあるか
    const inRangeAfter = attackSkills.some(s => distAfter <= s.range);
    if (inRangeAfter) score += 100;

    // 距離は近いほど良い(ただし近すぎは反撃食らうので射程ぴったりが理想)
    const idealRange = attackSkills.length > 0
      ? Math.max(...attackSkills.map(s => s.range))
      : 1;
    const distScore = 50 - Math.abs(distAfter - idealRange) * 10;
    score += distScore;

    return { ...o, score };
  });
  withScore.sort((a, b) => b.score - a.score);
  return withScore[0];
}

function executeSkillEnemy(attacker, target, skill) {
  attacker.st -= skill.cost;
  attacker.hasAttacked = true;

  // ★FIX: 敵の範囲攻撃(Whirlwind等)も8マス全展開
  if ((skill.status === 'aoe_around' || skill.status === 'daze_aoe' || skill.status === 'poison_aoe') && skill.damage >= 0) {
    addLog(`<span style="color:#ffaa44">${attacker.name} の${skill.name}!【範囲攻撃】</span>`);

    // 範囲セル座標(攻撃者周囲8マス)
    const aoeCells = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        aoeCells.push({x: attacker.x + dx, y: attacker.y + dy});
      }
    }
    // エフェクト
    playAoeFlash(aoeCells);
    playSkillEffect(skill, aoeCells, attacker);
    if (skill.status === 'aoe_around') {
      playBackgroundFlash('rgba(255, 200, 80, 0.3)');
      setTimeout(() => playScreenShake('medium'), 100);
    } else if (skill.status === 'daze_aoe') {
      playBackgroundFlash('rgba(180, 130, 255, 0.25)');
    } else if (skill.status === 'poison_aoe') {
      playBackgroundFlash('rgba(120, 220, 80, 0.25)');
    }

    // 範囲内の敵対勢力(=味方)全員にダメージ。攻撃者自身は対象外
    const victims = [];
    aoeCells.forEach(({x, y}) => {
      const t = battle.units.find(u => !u.dead && u.x === x && u.y === y && u.id !== attacker.id);
      if (t) victims.push(t);
    });
    victims.forEach(t => {
      if (skill.damage > 0) {
        applyDamage(attacker, t, skill);
        applyStDrainFromSkill(skill, t);
      } else {
        applyStatusFromSkill(skill, t, attacker);
      }
    });
    setTimeout(() => {
      victims.forEach(t => {
        if (t.hp <= 0 && !t.dead) {
          t.hp = 0;
          killUnit(t);
        }
      });
    }, 600);
    renderBattle();
    return;
  }

  // ★前方3マス直線攻撃(Daring Strike等)も対応
  if (skill.status === 'aoe_3' && skill.damage > 0) {
    addLog(`<span style="color:#ffaa44">${attacker.name} の${skill.name}!【前方3マス】</span>`);
    // 攻撃者からターゲット方向を求める
    const dx = Math.sign(target.x - attacker.x);
    const dy = Math.sign(target.y - attacker.y);
    const lineCells = [];
    for (let i = 1; i <= 3; i++) {
      lineCells.push({x: attacker.x + dx * i, y: attacker.y + dy * i});
    }
    playAoeFlash(lineCells);
    playSkillEffect(skill, lineCells, attacker);
    const victims = [];
    lineCells.forEach(({x, y}) => {
      const t = battle.units.find(u => !u.dead && u.x === x && u.y === y && u.id !== attacker.id);
      if (t) victims.push(t);
    });
    victims.forEach(t => applyDamage(attacker, t, skill));
    setTimeout(() => {
      victims.forEach(t => {
        if (t.hp <= 0 && !t.dead) { t.hp = 0; killUnit(t); }
      });
    }, 600);
    renderBattle();
    return;
  }

  // ★範囲2マス攻撃(Yellow Tiger / Flame Potion等)
  if (skill.status === 'aoe_2' && skill.damage > 0) {
    addLog(`<span style="color:#ffaa44">${attacker.name} の${skill.name}!【範囲2】</span>`);
    // ターゲット中心の周囲(target含む)
    const aoeCells = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        aoeCells.push({x: target.x + dx, y: target.y + dy});
      }
    }
    playAoeFlash(aoeCells);
    playSkillEffect(skill, aoeCells, attacker);
    const victims = [];
    aoeCells.forEach(({x, y}) => {
      const t = battle.units.find(u => !u.dead && u.x === x && u.y === y && u.id !== attacker.id);
      if (t) victims.push(t);
    });
    victims.forEach(t => applyDamage(attacker, t, skill));
    setTimeout(() => {
      victims.forEach(t => {
        if (t.hp <= 0 && !t.dead) { t.hp = 0; killUnit(t); }
      });
    }, 600);
    renderBattle();
    return;
  }

  // 通常の単体攻撃
  applyDamage(attacker, target, skill);
  applyStDrainFromSkill(skill, target);

  if (target.hp <= 0) {
    target.hp = 0;
    setTimeout(() => killUnit(target), 600);
  } else {
    renderBattle();
  }
}

// ====== 待機ボタン: ターン終了 ======
function actionWait() {
  const u = currentUnit();
  if (!u) return;

  // 待機時のST回復(原作: +20、移動済みなら+15、ダッシュ済みなら+5)
  let stGain = 20;
  if (u.hasDashed) stGain = 5;
  else if (u.hasMoved) stGain = 15;
  u.st = Math.min(u.maxST, u.st + stGain);

  // ★その場待機(移動なし)時のHP回復(原作: 4 + Lv十の位)
  // 例: Lv1-9 → +4、Lv10-19 → +5、Lv20-29 → +6
  if (!u.hasMoved && !u.hasDashed && !u.dead && u.hp < u.maxHP) {
    const baseRegen = 4;
    const lvBonus = Math.floor((u.level || 1) / 10);
    let hpRegen = baseRegen + lvBonus;
    // 装備のwait_hp(スコーン等)も加算
    if (u.equipBonuses && u.equipBonuses.waitHP > 0) {
      hpRegen += u.equipBonuses.waitHP;
    }
    const before = u.hp;
    u.hp = Math.min(u.maxHP, u.hp + hpRegen);
    const actualHeal = u.hp - before;
    if (actualHeal > 0) {
      showHealPopup(u, actualHeal);
      addLog(`<span style="color:#6ec844">${u.name} 待機でHP+${actualHeal}回復</span>`);
    }
  }

  // ハイライト解除
  document.querySelectorAll('.grid-cell.move-range, .grid-cell.dash-range, .grid-cell.attack-range').forEach(c => {
    c.classList.remove('move-range', 'dash-range', 'attack-range', 'has-target', 'aoe-target', 'aoe-preview', 'aoe-preview-center');
    c.onclick = null;
  });

  // ハウンドの2匹目行動: actionsRemaining > 1 なら次の行動
  u.actionsRemaining--;
  if (u.actionsRemaining > 0 && !u.dead) {
    addLog(`<span style="color:#88ddff">${u.name} 2匹目の行動!</span>`);
    u.hasMoved = false;
    u.hasDashed = false;
    u.hasAttacked = false;
    battle.attackMode = false;       // ★状態クリア
    battle.selectedSkill = null;     // ★状態クリア
    battle.aoeAimAt = null;          // ★状態クリア
    document.body.classList.remove('attack-mode');
    const _attackBtn2 = document.getElementById('action-attack');
    if (_attackBtn2) _attackBtn2.innerHTML = '⚔ スキル';
    const _actionBar2 = document.getElementById('action-bar');
    if (_actionBar2) _actionBar2.classList.remove('attack-mode');
    setTimeout(() => {
      if (u.side === 'enemy') {
        enemyAction(u);
      } else {
        showMoveRange(u);
      }
    }, 400);
    return;
  }

  // 全ての行動が終わったので状態異常デクリメント
  decrementStatuses(u);
  // 次ターンに備えてactionsRemainingリセット
  u.actionsRemaining = u.passive && u.passive.multiAction ? u.passive.multiAction : 1;

  nextTurn();
}

// ====== 次のターンへ ======
function nextTurn() {
  battle.currentUnitIdx++;
  if (battle.currentUnitIdx >= battle.units.length) {
    battle.currentUnitIdx = 0;
    battle.turn++;
    addLog(`<span class="log-turn">[Turn ${battle.turn}]</span>`);
  }
  setTimeout(startUnitTurn, 100);
}

// ====== ログ追加 ======
function addLog(msg) {
  if (!battle.log) battle.log = [];
  battle.log.push(msg);
  if (battle.log.length > 5) battle.log.shift();
  const logEl = document.getElementById('battle-log');
  if (logEl) {
    logEl.innerHTML = battle.log.join('<br>');
    logEl.scrollTop = logEl.scrollHeight;
  }
}

// ====== 撤退確認 ======
function confirmRetreat() {
  if (confirm('撤退しますか? 進行はリセットされます')) {
    goTo('map');
  }
}

// バトル描画
function renderBattle() {
  // ミッション名・ターン
  document.getElementById('battle-turn').textContent = `TURN ${battle.turn}`;

  // グリッド描画
  const grid = document.getElementById('battle-grid');
  grid.innerHTML = '';

  // セル作成
  for (let y = 0; y < BATTLE_H; y++) {
    for (let x = 0; x < BATTLE_W; x++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.x = x;
      cell.dataset.y = y;

      // 地形タイル
      const terrain = getTerrain(x, y);
      if (terrain) {
        cell.classList.add(`terrain-${terrain.type}`);
        cell.dataset.terrain = terrain.type;
        cell.dataset.terrainLabel = TERRAIN_DEFS[terrain.type].label;

        // 木箱はHP表示
        if (terrain.type === 'crate' && terrain.hp !== null) {
          const hpEl = document.createElement('div');
          hpEl.className = 'crate-hp';
          hpEl.textContent = terrain.hp;
          cell.appendChild(hpEl);
        }
      } else {
        // 草の装飾(地形なしマスのみ)
        const seed = (x * 7 + y * 13) % 11;
        if (seed === 0) cell.classList.add('grass-tuft');
        else if (seed === 1) cell.classList.add('grass-tuft2');
      }

      grid.appendChild(cell);
    }
  }

  // ユニット配置
  battle.units.forEach(u => {
    if (u.dead) return;
    const cellIdx = u.y * BATTLE_W + u.x;
    const cell = grid.children[cellIdx];
    if (!cell) return;

    const unitEl = document.createElement('div');
    const isCurrent = battle.units[battle.currentUnitIdx] === u;
    const isStunned = u.statuses && u.statuses.some(s => s.type === 'stun');
    const petClass = u.isPet ? 'pet' : '';
    // ★攻撃UPバフ中は赤いオーラ(重ねがけ数で強さ変動)
    const atkBuffCount = u.statuses ? u.statuses.filter(s => s.type === 'buff_atk').length : 0;
    let buffAuraClass = '';
    if (atkBuffCount === 1) buffAuraClass = 'buff-atk-aura';
    else if (atkBuffCount >= 2) buffAuraClass = 'buff-atk-aura buff-stack-2';
    // ★毒状態は緑のオーラ
    const isPoisoned = u.statuses && u.statuses.some(s => s.type === 'poison');
    const poisonAuraClass = isPoisoned ? 'poison-aura' : '';
    unitEl.className = `unit ${u.side} ${isCurrent ? 'active-turn' : ''} ${isStunned ? 'stunned' : ''} ${petClass} ${buffAuraClass} ${poisonAuraClass}`;
    // ユニットタップでステータス表示(攻撃モード中はクリック動作優先)
    unitEl.addEventListener('click', (e) => {
      if (battle.attackMode) return; // 攻撃モード中は通常のクリック処理
      e.stopPropagation();
      showUnitStatusPopup(u);
    });

    const hpPct = (u.hp / u.maxHP) * 100;
    const stPct = u.maxST > 0 ? (u.st / u.maxST) * 100 : 0;
    const enemyFilter = u.side === 'enemy' ? `enemy-${u.rank}` : '';
    const stBarHTML = `
      <div class="unit-st-bar">
        <div class="unit-st-fill" style="width: ${stPct}%"></div>
        <div class="unit-st-text">${u.st}/${u.maxST}</div>
      </div>
    `;

    // 状態異常アイコン(★攻撃UPと毒はオーラで表現するためアイコン除外)
    const statusIconsHTML = u.statuses && u.statuses.length > 0 ? `
      <div class="unit-status-icons">
        ${u.statuses.map(s => {
          // ★buff_atk と poison はオーラで表現するためアイコン非表示
          if (s.type === 'buff_atk' || s.type === 'poison') return '';
          const def = STATUS_EFFECTS[s.type];
          if (!def) return '';
          // 同種の状態は集約してカウント表示(主に毒)
          return `<div class="status-icon ${s.type}" title="${def.ja} (${s.turns}t)">${def.icon}</div>`;
        }).join('')}
      </div>
    ` : '';

    // ハウンドの2匹目表示
    const actionCountHTML = (isCurrent && u.actionsRemaining > 1) ?
      `<div class="unit-action-count">×${u.actionsRemaining}</div>` : '';

    unitEl.innerHTML = `
      <div class="unit-hp-bar">
        <div class="unit-hp-fill" style="width: ${hpPct}%"></div>
        <div class="unit-hp-text">${u.hp}/${u.maxHP}</div>
      </div>
      ${stBarHTML}
      ${actionCountHTML}
      <div class="unit-sprite ${enemyFilter}">
        <img src="data:image/png;base64,${SPRITES[u.classKey]}" alt="${u.name}">
      </div>
      <div class="unit-name">${u.name}</div>
      ${statusIconsHTML}
    `;

    cell.appendChild(unitEl);
  });

  // 行動順表示
  renderTurnOrder();
}

function renderTurnOrder() {
  const container = document.getElementById('turn-order');
  container.innerHTML = '';

  battle.units.forEach((u, i) => {
    if (u.dead) return;
    const item = document.createElement('div');
    item.className = `turn-order-item ${u.side}-side ${i === battle.currentUnitIdx ? 'current' : ''}`;
    const hpPct = (u.hp / u.maxHP) * 100;
    const stPct = (u.st / u.maxST) * 100;
    item.innerHTML = `
      <div class="turn-mini-sprite">
        <img src="data:image/png;base64,${SPRITES[u.classKey]}">
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u.name} <span style="opacity:0.6;font-size:8px;">L${u.level}</span></div>
        <div class="turn-mini-bar"><div class="turn-mini-bar-fill hp" style="width:${hpPct}%"></div></div>
        <div class="turn-mini-bar"><div class="turn-mini-bar-fill st" style="width:${stPct}%"></div></div>
      </div>
    `;
    item.title = `HP ${u.hp}/${u.maxHP} / ST ${u.st}/${u.maxST}`;
    container.appendChild(item);
  });
}

// ★段階1: 現在選択中のミッション(エリア + サブミッション)
let currentArea = null;       // エリアID(MISSIONSのキー)
let currentSubMission = null; // サブミッションオブジェクト

function enterBattle(missionId) {
  const mission = MISSIONS[missionId];
  state.currentMission = missionId;

  // ★段階1: ミッションリストがあれば選択画面に行く
  if (mission && mission.missions && mission.missions.length > 0) {
    showMissionSelect(missionId);
    return;
  }

  // ★Step4: 鍵が必要なステージは鍵を消費(マップから来てる場合のみ)
  if (mission && mission.requiresKey && !state.cleared.includes(missionId)) {
    const keyType = mission.requiresKey;
    if (!state.keys) state.keys = { gold: 0, blue: 0 };
    if ((state.keys[keyType] || 0) > 0) {
      state.keys[keyType]--;
      const keyLabel = keyType === 'gold' ? '<span style="color:#ffd770">GOLD KEY</span>' : '<span style="color:#88ddff">BLUE KEY</span>';
      // 戦闘ログとトーストで通知(戦闘画面でも見える形)
      setTimeout(() => {
        if (typeof addLog === 'function') addLog(`🔓 ${keyLabel} を消費してゲートを開いた!`);
        if (typeof addLogEquipToast === 'function') addLogEquipToast(`🔓 ${keyType.toUpperCase()} KEY 消費`);
      }, 100);
    } else {
      // 鍵不足(本来 onKeyLockedNodeClick で弾かれるが念のため)
      addLogEquipToast(`${keyType.toUpperCase()} KEY が必要です`);
      return;
    }
  }

  // 酒場ノードは戦闘せず、酒場画面を表示
  if (mission && mission.isTavern) {
    showTavernScreen(mission);
    return;
  }

  // ★v3.10: ボス戦の場合、戦闘前ダイアログを表示
  if (mission && mission.isBossBattle && !state.cleared.includes(missionId)) {
    showBossPreBattleDialog(mission, () => {
      initBattle(missionId);
      goTo('battle');
    });
    return;
  }

  initBattle(missionId);
  goTo('battle');
}

// ★v3.10: 戦闘前ダイアログ(対面シーン)
function showBossPreBattleDialog(mission, onContinue) {
  document.querySelectorAll('.boss-dialog-overlay').forEach(o => o.remove());
  const overlay = document.createElement('div');
  overlay.className = 'boss-dialog-overlay';

  // bandit_boss専用のセリフ(将来別ボスが増えたら拡張可)
  const dialog = {
    name: '盗賊団首領',
    subtitle: '― 廃墟と化した酒場にて ―',
    text: '「……ここに来たか。」\n\n「酒場はもう死んだ。流れ者を相手取る気分じゃないが…\n仕方ねぇ、抜くか。」'
  };

  overlay.innerHTML = `
    <div class="boss-dialog-content">
      <div class="boss-portrait">
        <img src="data:image/png;base64,${SPRITES.bandit_boss}" alt="${dialog.name}">
      </div>
      <div class="boss-dialog-name">${dialog.name}</div>
      <div class="boss-dialog-subtitle">${dialog.subtitle}</div>
      <div class="boss-dialog-text">${dialog.text}</div>
      <button class="boss-dialog-button" id="boss-pre-continue">▶ 戦闘開始</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('boss-pre-continue').addEventListener('click', () => {
    overlay.remove();
    if (onContinue) onContinue();
  });
}

// ★v3.10: 戦闘後ダイアログ(ボス撃破時)
function showBossPostBattleDialog(mission, onContinue) {
  document.querySelectorAll('.boss-dialog-overlay').forEach(o => o.remove());
  const overlay = document.createElement('div');
  overlay.className = 'boss-dialog-overlay';

  const dialog = {
    name: '盗賊団首領',
    subtitle: '― 倒れ伏す男 ―',
    text: '「……強ぇな、お前ら。」\n\n「行け。鍵をくれてやる。\nまた どこかで会おう ……まだ本気は出してねぇぜ。」'
  };

  overlay.innerHTML = `
    <div class="boss-dialog-content">
      <div class="boss-portrait" style="filter: grayscale(0.6) brightness(0.7);">
        <img src="data:image/png;base64,${SPRITES.bandit_boss}" alt="${dialog.name}">
      </div>
      <div class="boss-dialog-name">${dialog.name}</div>
      <div class="boss-dialog-subtitle">${dialog.subtitle}</div>
      <div class="boss-dialog-text">${dialog.text}</div>
      <button class="boss-dialog-button" id="boss-post-continue">▶ 続ける</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('boss-post-continue').addEventListener('click', () => {
    overlay.remove();
    if (onContinue) onContinue();
  });
}

