const CLASSES = {"monk": {"name_ja": "モンク", "name_en": "Monk", "role": "万能格闘家", "move": 2, "dash": 2, "hp_base": 80, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Disrupting Palm", "Burst of Power", "Strength of Will"], "tags": ["DPS物理", "Status耐性"]}, "knight": {"name_ja": "ナイト", "name_en": "Knight", "role": "重装騎士", "move": 1, "dash": 2, "hp_base": 100, "hp_per_level": 4, "armor": [4, 4, 0], "skills_signature": ["Galant Slash", "Exotic Feint", "Knightly Charge"], "tags": ["Tank"]}, "healer": {"name_ja": "ヒーラー", "name_en": "Healer", "role": "唯一の回復役", "move": 2, "dash": 2, "hp_base": 70, "hp_per_level": 4, "armor": [0, 0, 0], "skills_signature": ["Skill Potion", "Healing Potion", "Reprisal Potion"], "tags": ["Healer", "Support"]}, "gladiator": {"name_ja": "グラディエーター", "name_en": "Gladiator", "role": "近接バランス、剣闘士", "move": 2, "dash": 2, "hp_base": 85, "hp_per_level": 4, "armor": [2, 2, 0], "skills_signature": ["Throwing Knives", "Bolas", "Buckler Bash"], "tags": ["DPS物理"]}, "champion": {"name_ja": "チャンピオン", "name_en": "Champion", "role": "リーダー、HP・防御・攻撃力どれも高い", "move": 2, "dash": 2, "hp_base": 110, "hp_per_level": 5, "armor": [3, 3, 0], "skills_signature": ["Daring Strike", "Battle Shout", "Rally Shout"], "tags": ["Tank", "Hybrid近遠"]}, "barbarian": {"name_ja": "バーバリアン", "name_en": "Barbarian", "role": "高HP高攻撃の肉の壁", "move": 2, "dash": 2, "hp_base": 120, "hp_per_level": 5, "armor": [2, 0, 2], "skills_signature": ["Whirlwind", "Tackle", "War Cry"], "tags": ["Tank", "DPS物理"]}, "rocketeer": {"name_ja": "ロケッティア", "name_en": "Rocketeer", "role": "超遠距離砲台、爆発兵器使い", "move": 1, "dash": 2, "hp_base": 75, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Yellow Tiger", "Pink Lion", "Detonate"], "tags": ["DPS遠距離"]}, "jungleman": {"name_ja": "ジャングルマン", "name_en": "Jungleman", "role": "状態異常技巧派", "move": 2, "dash": 2, "hp_base": 85, "hp_per_level": 4, "armor": [1, 1, 0], "skills_signature": ["Boomerang", "Poisoned Blade", "Javelin Sting"], "tags": ["Hybrid近遠", "Status"]}, "archer": {"name_ja": "アーチャー", "name_en": "Archer", "role": "低機動・長射程砲台", "move": 1, "dash": 2, "hp_base": 70, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Power Shot", "Poison Arrow", "Eagle Eye"], "tags": ["DPS遠距離"]}, "alchemist": {"name_ja": "錬金術師", "name_en": "Alchemist", "role": "範囲アタッカー、連鎖発動", "move": 2, "dash": 2, "hp_base": 75, "hp_per_level": 3, "armor": [0, 0, 2], "skills_signature": ["Flame Potion", "Cane", "Amnesia Potion"], "tags": ["Caster", "Status"]}, "beastmaster": {"name_ja": "ビーストマスター", "name_en": "Beastmaster", "role": "最大4ペット", "move": 2, "dash": 2, "hp_base": 80, "hp_per_level": 4, "armor": [1, 1, 0], "skills_signature": ["Immaterial Bash", "Beast Call", "Master's Fury"], "tags": ["Summoner"]}, "ranger": {"name_ja": "レンジャー", "name_en": "Ranger", "role": "弓+ポーション", "move": 2, "dash": 2, "hp_base": 75, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Arrow Spray", "Bramble Snare", "Moss Potion"], "tags": ["DPS遠距離", "Summoner"]}, "hound": {"name_ja": "ハウンド", "name_en": "Hound", "role": "高速近接、犬2匹で1ユニット", "move": 3, "dash": 2, "hp_base": 70, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Maul", "Head Butt", "Nip"], "tags": ["機動アタッカー"]}, "coyote": {"name_ja": "コヨーテ", "name_en": "Coyote", "role": "ザコ敵から仲間化、低HP高機動", "move": 3, "dash": 2, "hp_base": 60, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Howl", "Claw", "Nip"], "tags": ["機動アタッカー"]}, "badger": {"name_ja": "アナグマ", "name_en": "Badger", "role": "状態異常耐性タンク", "move": 2, "dash": 2, "hp_base": 95, "hp_per_level": 4, "armor": [3, 3, 0], "skills_signature": ["Roar", "Badger Maul", "Indomitably"], "tags": ["Tank", "Status耐性"]}, "serpent": {"name_ja": "サーペント", "name_en": "Serpent", "role": "サポート、低火力中距離", "move": 2, "dash": 2, "hp_base": 80, "hp_per_level": 3, "armor": [0, 0, 1], "skills_signature": ["Hiss", "Snake Rage", "Foul Presence"], "tags": ["Support", "Status"]}, "bandit_boss": {"name_ja": "盗賊団首領", "name_en": "Bandit Boss", "role": "酒場跡のボス、孤狼の覚悟を秘めた男", "move": 2, "dash": 2, "hp_base": 159, "hp_per_level": 7, "hp_override": 180, "st_override": 170, "armor": [2, 1, 1], "skills_signature": ["Whirlwind", "Tackle", "Boomerang", "Poisoned Blade"], "tags": ["Boss", "DPS物理", "Status"]}};
// ====== 状態異常定義 ======
const STATUS_EFFECTS = {
  stun:   { icon: '⚡', label: 'Stun',   ja: '麻痺',   default_turns: 1 },
  daze:   { icon: '?',  label: 'Daze',   ja: '混乱',   default_turns: 3 },
  slow:   { icon: '🐌', label: 'Slow',   ja: '鈍化',   default_turns: 3 },
  poison: { icon: '☠',  label: 'Poison', ja: '毒',     default_turns: 4, dmg: 5 },
  armor_down: { icon: '↓', label: 'Armor↓', ja: '防御Down', default_turns: 3 },
  buff_atk:  { icon: '↑', label: 'Atk↑', ja: '攻撃力UP', default_turns: 3 },
  buff_def:  { icon: '◆', label: 'Def↑', ja: '防御UP', default_turns: 3 },
  buff_crit: { icon: '★', label: 'Crit↑', ja: 'Crit↑', default_turns: 2 },
};

// 状態異常付与確率(スキルのstatusキー → 確率%)
// ====== アイテム定義 ======
const ITEMS = {"stale_bread": {"name_ja": "古いパン", "color": "orange", "value": 1, "effect": "毎ターンHP+2", "stat": {"hp_regen": 2}}, "fresh_bread": {"name_ja": "焼きたてパン", "color": "orange", "value": 2, "effect": "毎ターンHP+4", "stat": {"hp_regen": 4}}, "scone": {"name_ja": "スコーン", "color": "orange", "value": 2, "effect": "待機でHP+10", "stat": {"wait_hp": 10}}, "cup_wine": {"name_ja": "ワイン", "color": "orange", "value": 2, "effect": "毎ターンST+8", "stat": {"st_regen": 8}}, "horn_plenty": {"name_ja": "豊穣の角笛", "color": "orange", "value": 4, "effect": "毎ターン隣接味方HP+3", "stat": {"aoe_heal": 3}}, "tattered_tunic": {"name_ja": "ボロのチュニック", "color": "blue", "value": 1, "effect": "遠距離防御+3", "stat": {"armor": [0, 3, 0]}}, "leather_cap": {"name_ja": "革帽子", "color": "blue", "value": 1, "effect": "MaxHP+10, MaxST+10", "stat": {"max_hp": 10, "max_st": 10}}, "leather_tunic": {"name_ja": "革のチュニック", "color": "blue", "value": 2, "effect": "遠距離防御+5", "stat": {"armor": [0, 5, 0]}}, "skullcap": {"name_ja": "頭蓋帽", "color": "blue", "value": 2, "effect": "MaxHP+25", "stat": {"max_hp": 25}}, "leather_boots": {"name_ja": "革ブーツ", "color": "blue", "value": 3, "effect": "MaxHP+25, MaxST+25", "stat": {"max_hp": 25, "max_st": 25}}, "sturdy_helm": {"name_ja": "頑丈な兜", "color": "blue", "value": 4, "effect": "MaxHP+50", "stat": {"max_hp": 50}}, "parchment_skill": {"name_ja": "技能の羊皮紙", "color": "pink", "value": 1, "effect": "全攻撃Crit+15%", "stat": {"crit_bonus": 15}}, "stone_strength": {"name_ja": "力の石", "color": "pink", "value": 2, "effect": "単発攻撃力+7", "stat": {"single_dmg": 7}}, "book_skill": {"name_ja": "技能の書", "color": "pink", "value": 2, "effect": "全攻撃Crit+20%", "stat": {"crit_bonus": 20}}, "emblem_swords": {"name_ja": "剣の紋章", "color": "pink", "value": 3, "effect": "全攻撃力+2", "stat": {"all_dmg": 2}}, "stone_might": {"name_ja": "豪腕の石", "color": "pink", "value": 3, "effect": "単発攻撃力+11", "stat": {"single_dmg": 11}}, "stone_power": {"name_ja": "強力の石", "color": "pink", "value": 4, "effect": "単発攻撃力+14", "stat": {"single_dmg": 14}}};

// ====== レベル毎の必要経験値 ======
function expRequired(level) {
  return level * 100; // Lv1→2: 100EXP, Lv2→3: 200EXP, ...
}

// クラス別 Lvアップ時のHP増加量
const HP_GAIN_PER_LV = {
  monk: 3, knight: 4, healer: 4, gladiator: 4,
  champion: 5, barbarian: 5, rocketeer: 3, jungleman: 4,
  archer: 3, alchemist: 3, beastmaster: 4, ranger: 3,
  hound: 3, coyote: 3, badger: 4, serpent: 3,
};

// ====== キャラ固有名プール(クラス別10種) ======
const CHAR_NAMES = {
  // 戦士系(力強い名前)
  monk:        ['Asher', 'Kaito', 'Liang', 'Tobias', 'Ren', 'Hadrian', 'Cael', 'Yuto', 'Marius', 'Eiji'],
  knight:      ['Gareth', 'Roland', 'Edmund', 'Percival', 'Tristan', 'Cedric', 'Lancelot', 'Aldric', 'Roderick', 'Bertram'],
  healer:      ['Selene', 'Adelia', 'Iris', 'Lyra', 'Maeve', 'Cordelia', 'Elara', 'Vivian', 'Rowena', 'Astrid'],
  gladiator:   ['Brutus', 'Drogo', 'Felix', 'Lucius', 'Marcus', 'Atilius', 'Crassus', 'Quintus', 'Verus', 'Decimus'],
  champion:    ['Aldous', 'Reinhardt', 'Maximilian', 'Bryce', 'Conrad', 'Talon', 'Theron', 'Dorian', 'Gideon', 'Vargas'],
  barbarian:   ['Krug', 'Thorgar', 'Brakka', 'Ulgar', 'Grimm', 'Hadrak', 'Vorath', 'Skarn', 'Borric', 'Kragg'],
  rocketeer:   ['Otto', 'Nikolai', 'Wexley', 'Bramwell', 'Crispin', 'Dexter', 'Finch', 'Linus', 'Pip', 'Quill'],
  jungleman:   ['Tarek', 'Jovan', 'Kazi', 'Mako', 'Rohan', 'Sage', 'Vesh', 'Zane', 'Ari', 'Cyril'],
  archer:      ['Leoric', 'Halric', 'Ennis', 'Faron', 'Sylas', 'Bryn', 'Tara', 'Cassia', 'Wynn', 'Kestrel'],
  alchemist:   ['Everard', 'Mortimer', 'Bartholomew', 'Octavius', 'Reginald', 'Theobald', 'Algernon', 'Cornelius', 'Wilbur', 'Percival'],
  beastmaster: ['Gunnar', 'Eska', 'Tova', 'Brand', 'Falke', 'Ren', 'Lior', 'Sten', 'Isolde', 'Dagr'],
  ranger:      ['Eldan', 'Mira', 'Kael', 'Lyra', 'Wren', 'Aiden', 'Selene', 'Briar', 'Rowan', 'Quinn'],
  // 動物系は名前なし(コヨーテ等は固有名つけない)
};

// 名前を取得(なければクラス名のみ)
function getCharFullName(classKey, customName) {
  const cls = CLASSES[classKey];
  if (customName) return `${customName} (${cls.name_ja})`;
  return cls.name_ja;
}

// ランダムで未使用の名前を取得
function pickCharName(classKey, usedNames) {
  const pool = CHAR_NAMES[classKey];
  if (!pool || pool.length === 0) return null;
  const available = pool.filter(n => !usedNames.includes(n));
  if (available.length === 0) {
    // 全部使われてたらランダム(同名重複OK)
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

// ====== AIタイプ定義(クラス別 + 階級補正) ======
// basic: 単純AI(動物・低Lv) - 突進+最大ダメ
// smart: 賢いAI(人型雑魚~精鋭) - HP低い狙う、状態異常使い分け、撤退判断
// tactical: 戦術AI(ボス・指揮官) - smart + ヒーラー優先 + サポート判断
const AI_TYPE_MAP = {
  // 動物系: basic
  coyote: 'basic',
  hound: 'basic',
  badger: 'basic',
  serpent: 'basic',
  // 人型: smart
  monk: 'smart',
  knight: 'smart',
  healer: 'smart',
  gladiator: 'smart',
  champion: 'tactical',  // 指揮官系はtactical
  barbarian: 'smart',
  rocketeer: 'smart',
  jungleman: 'smart',
  archer: 'smart',
  alchemist: 'smart',
  beastmaster: 'tactical',  // ペット使いはtactical
  ranger: 'smart',
};

// 階級補正: ボス以上は tactical に昇格、エリートは smart 以上
function getAIType(unit) {
  let baseType = AI_TYPE_MAP[unit.classKey] || 'basic';
  if (unit.rank === 'boss' || unit.rank === 'mega') return 'tactical';
  if (unit.rank === 'elite' && baseType === 'basic') return 'smart';
  return baseType;
}

// ====== パッシブ能力定義(クラス別) ======
const CLASS_PASSIVES = {
  // モンク: Strength of Will (状態異常70%無効) + Cold Blood (毒70%無効)
  monk: {
    name: '強き意志',
    desc: '状態異常を70%で無効化',
    statusResist: 70,
  },
  // アナグマ: Indomitably (50%無効 + 防御+1)
  badger: {
    name: '不屈',
    desc: '状態異常50%無効・全防御+1',
    statusResist: 50,
    armorBonus: [1, 1, 1],
  },
  // バーバリアン: Rugged Hide (30%無効)
  barbarian: {
    name: '頑強な皮膚',
    desc: '状態異常30%無効',
    statusResist: 30,
  },
  // ナイト: Parrying (Crit+10%、ダメ受けたら次ターン防御+)
  knight: {
    name: '受け流し',
    desc: '全攻撃Crit+10%',
    critBonus: 10,
  },
  // ハウンド: Dog Pair (2匹で2回行動 + Lvでダメージ&HP増)
  hound: {
    name: '2匹一組',
    desc: '1ターンに2回行動 + ダメ/HP増',
    multiAction: 2,
    damageMul: 1.0,   // ★Lvで0.05ずつ増えて Lv5で 1.20倍
    hpBonus: 0,       // ★Lvで5ずつ増えて Lv5で +20HP
  },
  // ビーストマスター: Beast of Loyalty (戦闘開始時 War Dog 召喚)
  beastmaster: {
    name: 'ペット召喚',
    desc: '戦闘開始時 War Dog を召喚',
    summonOnStart: 'wardog',
  },
  // アーチャー: Hunting Skills (遠距離+3ダメ、射程は元データに反映済み)
  archer: {
    name: '狩猟術',
    desc: '遠距離スキルのダメージ+3',
    rangedDmgBonus: 3,
  },
  // レンジャー: Forest Cloak (遠距離+2、回避)
  ranger: {
    name: '森のマント',
    desc: '遠距離スキルのダメージ+2',
    rangedDmgBonus: 2,
  },
  // ロケッティア: Precision (魔法/遠距離+3)
  rocketeer: {
    name: '精密射撃',
    desc: '魔法・遠距離のダメージ+3',
    rangedDmgBonus: 3,
  },

  // チャンピオン: 英雄の威風 - 隣接仲間の防御UP
  champion: {
    name: "英雄の威風",
    desc: "隣接仲間の防御を強化する",
    auraArmorBonus: [1, 1, 0],
  },
  // ヒーラー: 自然回復オーラ
  healer: {
    name: "癒しの祈り",
    desc: "ターン開始時、隣接仲間のHPを少し回復",
    auraHealOnTurn: 4,
  },
  // グラディエーター: 範囲ダメージを軽減
  gladiator: {
    name: "反射神経",
    desc: "範囲攻撃のダメージを軽減",
    aoeReduction: 0.3,
  },
  // ジャングルマン: 状態異常成功率UP
  jungleman: {
    name: "猟師の技",
    desc: "状態異常付与の確率が大幅に上昇",
    statusBonus: 20,
  },
  // 錬金術師: Crit Bonus
  alchemist: {
    name: "戦闘の知恵",
    desc: "全攻撃のCrit率がUP",
    critBonus: 8,
  },
  // コヨーテ: 全攻撃Crit付与
  coyote: {
    name: "野生の本能",
    desc: "全攻撃にCrit率が付く",
    critBonus: 4,
  },
  // サーペント: 隣接敵に魔法ダメ
  serpent: {
    name: "瘴気",
    desc: "ターン開始時、2マス以内の敵に魔法ダメージ",
    auraDamage: { range: 2, damage: 5 },
  },
  // 盗賊団首領: 孤狼の覚悟(フレーバーのみ、効果なし)
  bandit_boss: {
    name: "孤狼の覚悟",
    desc: "群れずに生きる男の眼差し。\nまだ本気を見せていない…",
    flavorOnly: true,  // 効果なし、表示用フレーバー
  },

};

// ペット定義(召喚される側のステータス)
const PET_DEFS = {
  wardog: {
    classKey: 'hound',  // スプライト流用
    name: 'War Dog',
    name_ja: '番犬',
    hp_base: 50,
    hp_per_level: 3,
    armor: [0, 0, 0],
    move: 3,
    dash: 2,
    skills: [
      { name: 'Bite', name_ja: '噛み', type: 'M', damage: 14, hits: 1, range: 1, cost: 10, crit: 30, status: null, note: '基本近接' },
      { name: 'Snap', name_ja: 'スナップ', type: 'M', damage: 8, hits: 2, range: 1, cost: 20, crit: 40, status: null, note: '2連撃' },
    ],
  },
};

const STATUS_CHANCE = {
  'stun': 30,           // ブーメラン: 30%Stun
  'daze': 60,           // 封じの掌、ピンクライオン
  'slow': 50,           // パワーショット: 50%Slow
  'poison': 70,         // 毒の刃、毒矢
  'poison_strong': 80,  // 毒牙(強)
  'poison_aoe': 100,    // 毒薬(範囲)
  'armor_down': 80,     // ジャベリン: 80%
  'armor_down_jav': 80, // ジャベリン・スティング(近接-2/遠距離-3、Lvで増加)
  'armor_down_full': 100, // 頭突き: 100%
  'armor_down_all': 100,  // ボーラ: 3軸防御Down
  'stun_aoe': 30,       // ブーメラン範囲: 30%スタン
  'daze_aoe': 70,       // 咆哮
  'aoe_2': 100,         // 範囲2マス(これは状態じゃなくAOEフラグ)
  'aoe_3': 100,
  'aoe_around': 100,
  'st_drain_full': 100, // 100%ST奪取
  'st_drain_50': 50,
  'st_drain': 100,
  'st_drain_full_hiss': 100,
  'heal': 100,
  'buff_crit': 100,
  'buff_atk_aoe': 100,
  'self_atk_up': 100,
  'self_def_up': 100,
  'self_heal': 100,
  'self_st_save': 100,
  'self_st_recover': 100,
  'extra_magic': 100,
  'slow_st_drain': 100,
};

const SKILLS = {"monk": [{"name": "Bounding Kick", "name_ja": "弾けキック", "type": "M", "damage": 22, "hits": 2, "range": 1, "cost": 10, "crit": 40, "status": null, "note": "標準近接、低コスト"}, {"name": "Disrupting Palm", "name_ja": "封じの掌", "type": "M", "damage": 30, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "daze", "note": "敵スキル封じ"}, {"name": "Pummel", "name_ja": "連打", "type": "M", "damage": 18, "hits": 5, "range": 1, "cost": 45, "crit": 25, "status": null, "note": "5連撃高火力"}], "knight": [{"name": "Critical Slash", "name_ja": "クリティカル斬", "type": "M", "damage": 16, "hits": 3, "range": 1, "cost": 30, "crit": 40, "status": null, "note": "3連撃Crit特化"}, {"name": "Exotic Feint", "name_ja": "エキゾチック・フェイント", "type": "M", "damage": 21, "hits": 1, "range": 1, "cost": 20, "crit": 0, "status": "armor_down", "note": "防御Down付与"}, {"name": "Galant Slash", "name_ja": "ギャラント・スラッシュ", "type": "M", "damage": 31, "hits": 1, "range": 1, "cost": 70, "crit": 30, "status": null, "note": "強攻撃、次ターンST全快"}], "healer": [{"name": "Quick Shot", "name_ja": "速射", "type": "R", "damage": 12, "hits": 1, "range": 4, "cost": 20, "crit": 30, "status": null, "note": "標準遠距離"}, {"name": "Healing Potion", "name_ja": "回復薬", "type": "S", "damage": -25, "hits": 1, "range": 3, "cost": 30, "crit": 0, "status": "heal", "note": "味方HP回復(マイナス=回復)"}, {"name": "Skill Potion", "name_ja": "技能薬", "type": "S", "damage": 0, "hits": 1, "range": 2, "cost": 35, "crit": 0, "status": "buff_crit", "note": "味方に100%Crit付与"}], "gladiator": [{"name": "Throwing Knives", "name_ja": "投げナイフ", "type": "R", "damage": 8, "hits": 5, "range": 3, "cost": 15, "crit": 30, "status": null, "note": "5連射超効率"}, {"name": "Bolas", "name_ja": "ボーラ", "type": "R", "damage": 17, "hits": 2, "range": 2, "cost": 35, "crit": 25, "status": "armor_down_all", "note": "3軸防御Down"}, {"name": "Buckler Bash", "name_ja": "盾打ち", "type": "M", "damage": 11, "hits": 2, "range": 1, "cost": 25, "crit": 30, "status": "self_def_up", "note": "自防御UP+追加攻撃可"}], "champion": [{"name": "Slash", "name_ja": "斬撃", "type": "M", "damage": 20, "hits": 1, "range": 1, "cost": 5, "crit": 40, "status": null, "note": "低コスト基本攻撃"}, {"name": "Daring Strike", "name_ja": "決死の一撃", "type": "M", "damage": 21, "hits": 2, "range": 1, "cost": 70, "crit": 30, "status": "aoe_3", "note": "前方3マス直線を貫く必殺攻撃。最大3体まで巻き込む。"}, {"name": "Battle Shout", "name_ja": "戦の雄叫び", "type": "S", "damage": 0, "hits": 1, "range": 0, "cost": 50, "crit": 0, "status": "buff_atk_aoe", "note": "自身と隣接した仲間の攻撃力UP(3ターン)。"}], "barbarian": [{"name": "Tackle", "name_ja": "タックル", "type": "M", "damage": 28, "hits": 1, "range": 1, "cost": 30, "crit": 25, "status": "self_st_save", "note": "STコスト削減効果"}, {"name": "Whirlwind", "name_ja": "渦巻き斬り", "type": "M", "damage": 38, "hits": 1, "range": 1, "cost": 60, "crit": 35, "status": "aoe_around", "note": "周囲8マスの全ての敵を巻き込む範囲攻撃。"}, {"name": "War Cry", "name_ja": "ワークライ", "type": "S", "damage": 13, "hits": 1, "range": 2, "cost": 60, "crit": 25, "status": "st_drain", "note": "ST吸収"}], "rocketeer": [{"name": "Yellow Tiger", "name_ja": "イエロータイガー", "type": "S", "damage": 26, "hits": 1, "range": 6, "cost": 35, "crit": 30, "status": "aoe_2", "note": "範囲遠距離"}, {"name": "Pink Lion", "name_ja": "ピンクライオン", "type": "S", "damage": 18, "hits": 1, "range": 6, "cost": 30, "crit": 25, "status": "daze", "note": "Daze付与"}, {"name": "Detonate", "name_ja": "自爆", "type": "S", "damage": 50, "hits": 1, "range": 0, "cost": 0, "crit": 100, "status": "aoe_around", "note": "自爆魔法、自身も死亡"}], "jungleman": [{"name": "Javelin Sting", "name_ja": "ジャベリン・スティング", "type": "R", "damage": 20, "hits": 1, "range": 3, "minRange": 2, "cost": 25, "crit": 30, "status": "armor_down_jav", "note": "射程2-3。80%確率で近接防御-2、遠距離防御-3"}, {"name": "Boomerang", "name_ja": "ブーメラン", "type": "R", "damage": 14, "hits": 2, "range": 4, "cost": 35, "crit": 25, "status": "stun_aoe", "note": "射程1-4の範囲攻撃。30%でスタン付与"}, {"name": "Poisoned Blade", "name_ja": "毒の刃", "type": "M", "damage": 14, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "poison", "note": "70%毒近接"}], "archer": [{"name": "Long Sword", "name_ja": "長剣", "type": "M", "damage": 9, "hits": 2, "range": 1, "cost": 15, "crit": 30, "status": null, "note": "近接基本"}, {"name": "Power Shot", "name_ja": "パワーショット", "type": "R", "damage": 24, "hits": 1, "range": 7, "cost": 60, "crit": 50, "status": "slow", "note": "50%Slow付与長射程"}, {"name": "Poison Arrow", "name_ja": "毒矢", "type": "R", "damage": 9, "hits": 1, "range": 6, "cost": 15, "crit": 25, "status": "poison", "note": "毒矢"}], "alchemist": [{"name": "Cane", "name_ja": "杖打ち", "type": "M", "damage": 19, "hits": 1, "range": 1, "cost": 10, "crit": 30, "status": "extra_magic", "note": "近接+追加魔法"}, {"name": "Flame Potion", "name_ja": "火炎薬", "type": "S", "damage": 24, "hits": 1, "range": 3, "cost": 35, "crit": 25, "status": "aoe_2", "note": "範囲魔法"}, {"name": "Poison Potion", "name_ja": "毒薬", "type": "S", "damage": 0, "hits": 1, "range": 3, "cost": 25, "crit": 0, "status": "poison_aoe", "note": "範囲毒(0ダメ防御無視)"}], "beastmaster": [{"name": "Shillelagh", "name_ja": "シレリ棒", "type": "M", "damage": 13, "hits": 1, "range": 1, "cost": 10, "crit": 50, "status": "daze", "note": "Daze率高"}, {"name": "Immaterial Bash", "name_ja": "実体貫きの一撃", "type": "M", "damage": 30, "hits": 1, "range": 2, "cost": 30, "crit": 35, "status": null, "note": "高威力中距離(NO MOVE)"}, {"name": "Lupine Strike", "name_ja": "狼の一撃", "type": "M", "damage": 22, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "self_heal", "note": "HP回復近接"}], "ranger": [{"name": "Arrow Spray", "name_ja": "アロースプレー", "type": "R", "damage": 7, "hits": 3, "range": 3, "minRange": 2, "cost": 15, "crit": 50, "status": null, "note": "射程2-3の3連射、Crit50%"}, {"name": "Bramble Snare", "name_ja": "茨の罠", "type": "R", "damage": 8, "hits": 1, "range": 3, "minRange": 1, "cost": 25, "crit": 20, "status": "slow", "note": "射程1-3、相手をSlow状態に"}, {"name": "Moss Potion", "name_ja": "苔薬", "type": "S", "damage": 0, "hits": 1, "range": 3, "cost": 36, "crit": 0, "status": "slow_st_drain", "note": "100%スロー+ST減"}], "hound": [{"name": "Maul", "name_ja": "噛みつき", "type": "M", "damage": 18, "hits": 1, "range": 1, "cost": 10, "crit": 30, "status": null, "note": "基本近接"}, {"name": "Head Butt", "name_ja": "頭突き", "type": "M", "damage": 14, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "armor_down_full", "note": "100%防御Down"}, {"name": "Nip", "name_ja": "噛みちぎり", "type": "M", "damage": 10, "hits": 1, "range": 1, "cost": 15, "crit": 25, "status": "st_drain_full", "note": "100%ST奪取"}], "coyote": [{"name": "Claw", "name_ja": "爪", "type": "M", "damage": 8, "hits": 3, "range": 1, "cost": 35, "crit": 0, "status": null, "note": "3連撃"}, {"name": "Howl", "name_ja": "遠吠え", "type": "S", "damage": 9, "hits": 1, "range": 2, "cost": 15, "crit": 0, "status": "st_drain_50", "note": "50%ST奪取"}, {"name": "Nip", "name_ja": "噛みちぎり", "type": "M", "damage": 18, "hits": 1, "range": 1, "cost": 25, "crit": 25, "status": null, "note": "強近接"}], "badger": [{"name": "Badger Scratch", "name_ja": "アナグマ引っ掻き", "type": "M", "damage": 18, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": null, "note": "MOVE攻撃"}, {"name": "Badger Maul", "name_ja": "アナグマ噛み", "type": "M", "damage": 5, "hits": 6, "range": 1, "cost": 40, "crit": 30, "status": null, "note": "6連撃(NO MOVE)"}, {"name": "Roar", "name_ja": "咆哮", "type": "S", "damage": 8, "hits": 3, "range": 2, "cost": 50, "crit": 0, "status": "daze_aoe", "note": "Daze範囲"}], "serpent": [{"name": "Hiss", "name_ja": "シャー", "type": "S", "damage": 7, "hits": 1, "range": 3, "cost": 15, "crit": 0, "status": "st_drain_full", "note": "100%ST20奪取"}, {"name": "Snake Rage", "name_ja": "蛇の憤怒", "type": "S", "damage": 0, "hits": 1, "range": 0, "cost": 20, "crit": 0, "status": "self_atk_up", "note": "自身攻撃力UP重複可"}, {"name": "Venomous Bite", "name_ja": "毒牙", "type": "M", "damage": 8, "hits": 2, "range": 1, "cost": 35, "crit": 30, "status": "poison_strong", "note": "強力毒近接"}], "bandit_boss": [{"name": "Tackle", "name_ja": "タックル", "type": "M", "damage": 32, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "self_st_save", "note": "ボス強化版タックル、STコスト削減"}, {"name": "Boomerang", "name_ja": "ブーメラン", "type": "R", "damage": 18, "hits": 2, "range": 4, "cost": 40, "crit": 30, "status": "stun_aoe", "note": "ボス強化版、射程1-4の中距離。30%でスタン付与"}, {"name": "Whirlwind", "name_ja": "渦巻き斬り", "type": "M", "damage": 45, "hits": 1, "range": 1, "cost": 65, "crit": 35, "status": "aoe_around", "note": "ボス強化版、周囲8マスの全ての敵を巻き込む範囲攻撃"}, {"name": "Poisoned Blade", "name_ja": "毒の刃", "type": "M", "damage": 18, "hits": 1, "range": 1, "cost": 30, "crit": 30, "status": "poison", "note": "ボス強化版、70%毒近接"}]};
const BASIC_ATTACKS = {"monk": {"name": "Bounding Kick", "name_ja": "弾けキック", "damage": 22, "type": "M", "range": 1, "cost": 10, "crit": 40}, "knight": {"name": "Critical Slash", "name_ja": "クリティカル斬", "damage": 24, "type": "M", "range": 1, "cost": 30, "crit": 40}, "healer": {"name": "Quick Shot", "name_ja": "速射", "damage": 18, "type": "R", "range": 3, "cost": 20, "crit": 30}, "gladiator": {"name": "Throwing Knives", "name_ja": "投げナイフ", "damage": 17, "type": "R", "range": 3, "cost": 15, "crit": 25}, "champion": {"name": "Slash", "name_ja": "斬撃", "damage": 20, "type": "M", "range": 1, "cost": 5, "crit": 40}, "barbarian": {"name": "Tackle", "name_ja": "タックル", "damage": 28, "type": "M", "range": 1, "cost": 30, "crit": 25}, "rocketeer": {"name": "Yellow Tiger", "name_ja": "イエロータイガー", "damage": 26, "type": "S", "range": 6, "cost": 35, "crit": 30}, "jungleman": {"name": "Javelin Sting", "name_ja": "ジャベリン", "damage": 22, "type": "R", "range": 3, "cost": 25, "crit": 30}, "archer": {"name": "Power Shot", "name_ja": "パワーショット", "damage": 28, "type": "R", "range": 4, "cost": 35, "crit": 50}, "alchemist": {"name": "Cane", "name_ja": "杖打ち", "damage": 19, "type": "M", "range": 1, "cost": 10, "crit": 30}, "beastmaster": {"name": "Immaterial Bash", "name_ja": "実体貫きの一撃", "damage": 30, "type": "M", "range": 2, "cost": 30, "crit": 35}, "ranger": {"name": "Arrow Spray", "name_ja": "アロースプレー", "damage": 7, "hits": 3, "type": "R", "range": 3, "cost": 15, "crit": 50}, "hound": {"name": "Maul", "name_ja": "噛みつき", "damage": 18, "type": "M", "range": 1, "cost": 10, "crit": 30}, "coyote": {"name": "Claw", "name_ja": "爪攻撃", "damage": 16, "type": "M", "range": 1, "cost": 15, "crit": 25}, "badger": {"name": "Badger Scratch", "name_ja": "アナグマ引っ掻き", "damage": 20, "type": "M", "range": 1, "cost": 25, "crit": 30}, "serpent": {"name": "Hiss", "name_ja": "シャー", "damage": 12, "type": "S", "range": 3, "cost": 15, "crit": 20}, "bandit_boss": {"name": "Tackle", "name_ja": "タックル", "damage": 32, "type": "M", "range": 1, "cost": 25, "crit": 30}};
// ====== ミッション定義(ACT 1) ======
const MISSIONS = {
  trivial_plain: {
    id: 'trivial_plain',
    name: 'The Trivial Plain',
    name_ja: '平原の小手調べ',
    x: 16, y: 80,  // ★Step3: ACT1マップ画像内の左下、道のスタート地点
    enemies: [
      { classKey: 'coyote', x: 17, y: 3, level: 1 },
      { classKey: 'coyote', x: 18, y: 5, level: 1 },
      { classKey: 'coyote', x: 17, y: 7, level: 1 },
    ],
    unlocks: ['forest_edge'],
    warriorReward: false,
    // ★1ステージ完結+「EXP+仲間+アイテム」一括ボーナス
    missions: [
      {
        id: 'trivial_plain_m1',
        name: 'Trivial Plain',
        name_ja: '平原の小手調べ',
        difficulty: 'easy',
        rewardType: 'starter_pack',  // ★EXP+仲間+アイテム一括
        battleType: 'Basic',
        playerSlots: 2,
        description: '冒険の始まり。\n仲間と装備をもらえる。',
        enemies: [
          { classKey: 'coyote', x: 17, y: 3, level: 1 },
          { classKey: 'coyote', x: 18, y: 5, level: 1 },
          { classKey: 'coyote', x: 17, y: 7, level: 1 },
        ],
      },
    ],
  },
  forest_edge: {
    id: 'forest_edge',
    name: "The Forest's Edge",
    name_ja: '森の縁',
    x: 40, y: 51,  // ★Step3: 画像内の中央の林
    enemies: [
      { classKey: 'coyote', x: 16, y: 2, level: 2 },
      { classKey: 'coyote', x: 18, y: 4, level: 2 },
      { classKey: 'badger', x: 17, y: 6, level: 1 },
    ],
    unlocks: ['tavern'],
    warriorReward: false,
    chest: { type: 'blue_key' },  // 森の縁クリアで BLUE KEY 入手(Step4: 入れ替え)
    // ★段階1: ミッションリスト(原作風: 1エリア=複数ミッション)
    missions: [
      {
        id: 'forest_edge_m1',
        name: 'Coyotes I',
        name_ja: 'コヨーテ I',
        difficulty: 'easy',
        rewardType: 'item',
        battleType: 'Basic',
        playerSlots: 1,
        description: '一人 vs 二匹のコヨーテ。\n手始めの戦い。',
        enemies: [
          { classKey: 'coyote', x: 16, y: 3, level: 1 },
          { classKey: 'coyote', x: 18, y: 5, level: 1 },
        ],
      },
      {
        id: 'forest_edge_m2',
        name: 'Coyotes II',
        name_ja: 'コヨーテ II',
        difficulty: 'easy',
        rewardType: 'add_skill',
        battleType: 'Basic',
        playerSlots: 2,
        description: '二人 vs 三匹のコヨーテ。\nクリアで仲間1人にスキル授与。',
        enemies: [
          { classKey: 'coyote', x: 16, y: 2, level: 2 },
          { classKey: 'coyote', x: 18, y: 4, level: 2 },
          { classKey: 'coyote', x: 17, y: 6, level: 2 },
        ],
      },
      {
        id: 'forest_edge_m3',
        name: 'Badger',
        name_ja: 'アナグマ',
        difficulty: 'medium',
        rewardType: 'warrior',
        battleType: 'Basic',
        playerSlots: 2,
        description: '二人 vs 三匹のアナグマ。\n石を投げてくる。',
        enemies: [
          { classKey: 'badger', x: 16, y: 3, level: 1 },
          { classKey: 'badger', x: 18, y: 4, level: 1 },
          { classKey: 'badger', x: 17, y: 6, level: 1 },
        ],
      },
      {
        id: 'forest_edge_m4',
        name: 'Woodland Panic',
        name_ja: '森の混乱',
        difficulty: 'medium',
        rewardType: 'key',
        battleType: 'Basic',
        playerSlots: 2,
        description: '森に住むものたちが\n総出で襲いかかる。',
        enemies: [
          { classKey: 'coyote', x: 16, y: 2, level: 2 },
          { classKey: 'badger', x: 18, y: 4, level: 2 },
          { classKey: 'coyote', x: 17, y: 6, level: 2 },
          { classKey: 'badger', x: 16, y: 8, level: 1 },
        ],
        // この戦闘の宝箱(エリア宝箱とは別)
        chest: { type: 'blue_key' },
      },
    ],
  },
  tavern: {
    id: 'tavern',
    name: 'Tavern Ruins',
    name_ja: '酒場跡',
    x: 57, y: 36,  // ★Step3: 中央上の分岐点
    enemies: [
      { classKey: 'bandit_boss', x: 17, y: 5, level: 4 },  // ★v3.10: 盗賊団首領 1体
    ],
    unlocks: ['glade', 'ruins'],  // ★Step3: 撃破後、両ルート(glade/ruins)に分岐
    warriorReward: false,
    chest: { type: 'gold_key' },  // ★v3.10: 酒場跡撃破で GOLD KEY 入手(Step4: 入れ替え)
    isBossBattle: true,  // ★v3.10: ボス戦フラグ(セリフモーダル発動用)
  },
  // ===== BLUEルート: 林の空き地 → 村 =====
  glade: {
    id: 'glade',
    name: 'The Glade',
    name_ja: '林の空き地',
    x: 68, y: 56,  // ★Step3: 右側の森
    enemies: [
      { classKey: 'badger', x: 16, y: 3, level: 2 },
      { classKey: 'badger', x: 18, y: 5, level: 2 },
      { classKey: 'coyote', x: 17, y: 7, level: 2 },
    ],
    unlocks: ['village'],
    warriorReward: false,
    // ★v3.10: requiresKey削除(BLUE/GOLD分岐廃止、gladeはフリー解放)
  },
  village: {
    id: 'village',
    name: 'The Village',
    name_ja: '村',
    x: 66, y: 76,  // ★Step3: 右下の家4軒の集落
    enemies: [
      { classKey: 'monk', x: 16, y: 3, level: 2 },
      { classKey: 'gladiator', x: 18, y: 5, level: 2 },
      { classKey: 'archer', x: 17, y: 7, level: 2 },
    ],
    unlocks: ['tournament'],
    warriorReward: true,  // 村: 仲間が必ず加入
    warriorPool: ['monk', 'gladiator', 'archer'],
    routeFlag: 'blue_completed',  // ★Step3: BLUEルート完走フラグ
  },
  // ===== GOLDルート: 古代遺跡 → 廃神殿 =====
  ruins: {
    id: 'ruins',
    name: 'Ancient Ruins',
    name_ja: '古代遺跡',
    x: 22, y: 65,  // ★Step3: 左下の石の遺跡
    enemies: [
      { classKey: 'serpent', x: 16, y: 3, level: 3 },
      { classKey: 'badger', x: 18, y: 5, level: 3 },
      { classKey: 'coyote', x: 17, y: 7, level: 3 },
    ],
    unlocks: ['temple'],
    warriorReward: false,
    requiresKey: 'gold',  // ★Step3: GOLD鍵で開放(Step4で判定実装予定)
    chest: { type: 'item_rare' },  // ★Step3: レアアイテム宝箱
  },
  temple: {
    id: 'temple',
    name: 'Forsaken Temple',
    name_ja: '廃神殿',
    x: 37, y: 22,  // ★Step3: 北の森(画像上には未描画)
    enemies: [
      { classKey: 'alchemist', x: 16, y: 3, level: 3, rank: 'elite' },
      { classKey: 'serpent', x: 18, y: 5, level: 3 },
      { classKey: 'jungleman', x: 17, y: 7, level: 3 },
    ],
    unlocks: ['tournament'],
    warriorReward: true,
    warriorPool: ['alchemist', 'serpent', 'jungleman'],
    routeFlag: 'gold_completed',  // ★Step3: GOLDルート完走フラグ
  },
  // ===== 合流: 武闘大会 =====
  tournament: {
    id: 'tournament',
    name: 'The Tournament',
    name_ja: '武闘大会',
    x: 76, y: 18,  // ★Step3: 右上のコロシアム
    enemies: [
      { classKey: 'champion', x: 17, y: 3, level: 3, rank: 'elite' },
      { classKey: 'knight', x: 18, y: 5, level: 3, rank: 'elite' },
      { classKey: 'barbarian', x: 17, y: 7, level: 3, rank: 'boss' },
    ],
    unlocks: [],
    isFinal: true,
    warriorReward: false,
  },
};

const STARTER_PARTIES = {"vanguards": {"name_en": "The Vanguards", "name_ja": "先鋒", "tagline": "力押し・正面突破型", "description": "高HP・高火力の重戦士コンビ。敵陣に飛び込んで殴り合う。", "members": ["champion", "barbarian"], "playstyle": ["近接特化", "高HP"]}, "adepts": {"name_en": "The Adepts", "name_ja": "達人", "tagline": "バランス・万能型", "description": "近接万能のモンクと長射程砲台のアーチャー。状況対応。", "members": ["monk", "archer"], "playstyle": ["近接+遠距離", "万能"]}, "wildkin": {"name_en": "The Wildkin", "name_ja": "野の血", "tagline": "獣使い・数的有利型", "description": "ペット召喚で数的優位。ハウンドは前衛で機動。", "members": ["beastmaster", "hound"], "playstyle": ["召喚", "高機動"]}, "custom": {"name_en": "Custom Party", "name_ja": "テスト編成", "tagline": "好きなクラスを3体選択", "description": "全16クラスから自由に3体を組み合わせてテストできる開発者用編成。", "members": [], "playstyle": ["カスタム", "テスト用"], "isCustom": true}};

