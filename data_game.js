const CLASSES = {"monk": {"name_ja": "モンク", "name_en": "Monk", "role": "万能格闘家", "move": 2, "dash": 2, "hp_base": 80, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Disrupting Palm", "Burst of Power", "Strength of Will"], "tags": ["DPS物理", "Status耐性"]}, "knight": {"name_ja": "ナイト", "name_en": "Knight", "role": "重装騎士", "move": 1, "dash": 2, "hp_base": 100, "hp_per_level": 4, "armor": [4, 4, 0], "skills_signature": ["Galant Slash", "Exotic Feint", "Knightly Charge"], "tags": ["Tank"]}, "healer": {"name_ja": "ヒーラー", "name_en": "Healer", "role": "唯一の回復役", "move": 2, "dash": 2, "hp_base": 70, "hp_per_level": 4, "armor": [0, 0, 0], "skills_signature": ["Skill Potion", "Healing Potion", "Reprisal Potion"], "tags": ["Healer", "Support"]}, "gladiator": {"name_ja": "グラディエーター", "name_en": "Gladiator", "role": "近接バランス、剣闘士", "move": 2, "dash": 2, "hp_base": 85, "hp_per_level": 4, "armor": [2, 2, 0], "skills_signature": ["Throwing Knives", "Bolas", "Buckler Bash"], "tags": ["DPS物理"]}, "champion": {"name_ja": "チャンピオン", "name_en": "Champion", "role": "リーダー、HP・防御・攻撃力どれも高い", "move": 2, "dash": 2, "hp_base": 110, "hp_per_level": 5, "armor": [3, 3, 0], "skills_signature": ["Daring Strike", "Battle Shout", "Rally Shout"], "tags": ["Tank", "Hybrid近遠"]}, "barbarian": {"name_ja": "バーバリアン", "name_en": "Barbarian", "role": "高HP高攻撃の肉の壁", "move": 2, "dash": 2, "hp_base": 120, "hp_per_level": 5, "armor": [2, 0, 2], "skills_signature": ["Whirlwind", "Tackle", "War Cry"], "tags": ["Tank", "DPS物理"]}, "rocketeer": {"name_ja": "ロケッティア", "name_en": "Rocketeer", "role": "超遠距離砲台、爆発兵器使い", "move": 1, "dash": 2, "hp_base": 75, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Yellow Tiger", "Pink Lion", "Detonate"], "tags": ["DPS遠距離"]}, "jungleman": {"name_ja": "ジャングルマン", "name_en": "Jungleman", "role": "状態異常技巧派", "move": 2, "dash": 2, "hp_base": 85, "hp_per_level": 4, "armor": [1, 1, 0], "skills_signature": ["Boomerang", "Poisoned Blade", "Javelin Sting"], "tags": ["Hybrid近遠", "Status"]}, "archer": {"name_ja": "アーチャー", "name_en": "Archer", "role": "低機動・長射程砲台", "move": 1, "dash": 2, "hp_base": 70, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Power Shot", "Poison Arrow", "Eagle Eye"], "tags": ["DPS遠距離"]}, "alchemist": {"name_ja": "錬金術師", "name_en": "Alchemist", "role": "範囲アタッカー、連鎖発動", "move": 2, "dash": 2, "hp_base": 75, "hp_per_level": 3, "armor": [0, 0, 2], "skills_signature": ["Flame Potion", "Cane", "Amnesia Potion"], "tags": ["Caster", "Status"]}, "beastmaster": {"name_ja": "ビーストマスター", "name_en": "Beastmaster", "role": "最大4ペット", "move": 2, "dash": 2, "hp_base": 80, "hp_per_level": 4, "armor": [1, 1, 0], "skills_signature": ["Immaterial Bash", "Beast Call", "Master's Fury"], "tags": ["Summoner"]}, "ranger": {"name_ja": "レンジャー", "name_en": "Ranger", "role": "弓+ポーション", "move": 2, "dash": 2, "hp_base": 75, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Arrow Spray", "Bramble Snare", "Moss Potion"], "tags": ["DPS遠距離", "Summoner"]}, "hound": {"name_ja": "ハウンド", "name_en": "Hound", "role": "高速近接、犬2匹で1ユニット", "move": 3, "dash": 2, "hp_base": 70, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Maul", "Head Butt", "Nip"], "tags": ["機動アタッカー"]}, "coyote": {"name_ja": "コヨーテ", "name_en": "Coyote", "role": "ザコ敵から仲間化、低HP高機動", "move": 3, "dash": 2, "hp_base": 60, "hp_per_level": 3, "armor": [0, 0, 0], "skills_signature": ["Howl", "Claw", "Nip"], "tags": ["機動アタッカー"]}, "badger": {"name_ja": "アナグマ", "name_en": "Badger", "role": "状態異常耐性タンク", "move": 2, "dash": 2, "hp_base": 95, "hp_per_level": 4, "armor": [3, 3, 0], "skills_signature": ["Roar", "Badger Maul", "Indomitably"], "tags": ["Tank", "Status耐性"]}, "serpent": {"name_ja": "サーペント", "name_en": "Serpent", "role": "サポート、低火力中距離", "move": 2, "dash": 2, "hp_base": 80, "hp_per_level": 3, "armor": [0, 0, 1], "skills_signature": ["Hiss", "Snake Rage", "Foul Presence"], "tags": ["Support", "Status"]}, "bandit_boss": {"name_ja": "盗賊団首領", "name_en": "Bandit Boss", "role": "酒場跡のボス、孤狼の覚悟を秘めた男", "move": 2, "dash": 2, "hp_base": 159, "hp_per_level": 8, "hp_override": 220, "st_override": 170, "armor": [3, 2, 2], "skills_signature": ["Whirlwind", "Tackle", "Boomerang", "Poisoned Blade"], "tags": ["Boss", "DPS物理", "Status"]}};
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
  equip_atk_buff: { icon: '⚔', label: 'Atk↑', ja: '攻撃力UP(装備)', default_turns: 3 },
};

// 状態異常付与確率(スキルのstatusキー → 確率%)
// ====== アイテム定義 ======
const ITEMS = {"stale_bread": {"name_ja": "古いパン", "name_en": "Stale Bread", "color": "orange", "value": 1, "effect": "毎ターンHP+2", "stat": {"hp_regen": 2}}, "vinegar_cup": {"name_ja": "酢の杯", "name_en": "Cup of Vinegar", "color": "orange", "value": 1, "effect": "毎ターンST+5", "stat": {"st_regen": 5}}, "fresh_bread": {"name_ja": "焼きたてパン", "name_en": "Fresh Bread", "color": "orange", "value": 2, "effect": "毎ターンHP+4", "stat": {"hp_regen": 4}}, "wine_cup": {"name_ja": "ワイン", "name_en": "Cup of Wine", "color": "orange", "value": 2, "effect": "毎ターンST+8", "stat": {"st_regen": 8}}, "scrumptious_bread": {"name_ja": "極上パン", "name_en": "Scrumptious Bread", "color": "orange", "value": 3, "effect": "毎ターンHP+6", "stat": {"hp_regen": 6}}, "fine_meal": {"name_ja": "上等な食事", "name_en": "Fine Meal", "color": "orange", "value": 3, "effect": "毎ターンHP+4・ST+5", "stat": {"hp_regen": 4, "st_regen": 5}}, "gourmand_bread": {"name_ja": "美食家のパン", "name_en": "Bread of The Gourmand", "color": "orange", "value": 4, "effect": "毎ターンHP+8", "stat": {"hp_regen": 8}}, "fine_wine_cup": {"name_ja": "上等なワイン", "name_en": "Cup of Fine Wine", "color": "orange", "value": 4, "effect": "毎ターンST+10", "stat": {"st_regen": 10}}, "horn_plenty": {"name_ja": "豊穣の角笛", "name_en": "Horn of Plenty", "color": "orange", "value": 4, "effect": "毎ターン隣接ユニットHP+10", "stat": {"aoe_heal": 10}}, "pumpernickel_bread": {"name_ja": "プンパニッケル", "name_en": "Pumpernickel Bread", "color": "orange", "value": 4, "effect": "毎ターンHP+5・近接攻撃+2", "stat": {"hp_regen": 5, "melee_dmg": 2}}, "tattered_tunic": {"name_ja": "ボロのチュニック", "name_en": "Tattered Tunic", "color": "blue", "value": 1, "effect": "遠距離防御+3", "stat": {"armor": [0, 3, 0]}}, "leather_cap": {"name_ja": "革帽子", "name_en": "Leather Cap", "color": "blue", "value": 1, "effect": "最大HP+10・ST+10", "stat": {"max_hp": 10, "max_st": 10}}, "leather_tunic": {"name_ja": "革のチュニック", "name_en": "Leather Tunic", "color": "blue", "value": 2, "effect": "遠距離防御+5", "stat": {"armor": [0, 5, 0]}}, "skullcap": {"name_ja": "頭蓋帽", "name_en": "Skullcap", "color": "blue", "value": 2, "effect": "最大HP+25", "stat": {"max_hp": 25}}, "leather_gloves": {"name_ja": "革の手袋", "name_en": "Leather Gloves", "color": "blue", "value": 2, "effect": "近接防御+5", "stat": {"armor": [5, 0, 0]}}, "leather_sandals": {"name_ja": "革サンダル", "name_en": "Leather Sandals", "color": "blue", "value": 2, "effect": "最大ST+35", "stat": {"max_st": 35}}, "woolen_vest": {"name_ja": "毛織のベスト", "name_en": "Woolen Vest", "color": "blue", "value": 3, "effect": "近接+2/魔法+6防御", "stat": {"armor": [2, 0, 6]}}, "studded_tunic": {"name_ja": "スタッド付きチュニック", "name_en": "Studded Tunic", "color": "blue", "value": 3, "effect": "遠距離防御+8", "stat": {"armor": [0, 8, 0]}}, "helm": {"name_ja": "兜", "name_en": "Helm", "color": "blue", "value": 3, "effect": "最大HP+40", "stat": {"max_hp": 40}}, "combat_gloves": {"name_ja": "戦闘手袋", "name_en": "Combat Gloves", "color": "blue", "value": 3, "effect": "近接防御+8", "stat": {"armor": [8, 0, 0]}}, "leather_boots": {"name_ja": "革ブーツ", "name_en": "Leather Boots", "color": "blue", "value": 3, "effect": "最大HP+25・最大ST+25", "stat": {"max_hp": 25, "max_st": 25}}, "hunters_vest": {"name_ja": "ハンターのベスト", "name_en": "Hunter's Vest", "color": "blue", "value": 4, "effect": "遠距離+6/魔法+4防御", "stat": {"armor": [0, 6, 4]}}, "mail_tunic": {"name_ja": "鎖帷子", "name_en": "Mail Tunic", "color": "blue", "value": 4, "effect": "遠距離防御+10", "stat": {"armor": [0, 10, 0]}}, "fabled_vest": {"name_ja": "伝説のベスト", "name_en": "Fabled Vest", "color": "blue", "value": 4, "effect": "最大HP+20・ST+15・全防御+2", "stat": {"max_hp": 20, "max_st": 15, "armor": [2, 2, 2]}}, "sturdy_helm": {"name_ja": "頑丈な兜", "name_en": "Sturdy Helm", "color": "blue", "value": 4, "effect": "最大HP+50", "stat": {"max_hp": 50}}, "war_gloves": {"name_ja": "戦争の手袋", "name_en": "War Gloves", "color": "blue", "value": 4, "effect": "近接+6/遠距離+4防御", "stat": {"armor": [6, 4, 0]}}, "kingly_sandals": {"name_ja": "王者のサンダル", "name_en": "Kingly Sandals", "color": "blue", "value": 4, "effect": "最大ST+35・遠距離+3/魔法+2防御", "stat": {"max_st": 35, "armor": [0, 3, 2]}}, "nobles_cap": {"name_ja": "貴族の帽子", "name_en": "Noble's Cap", "color": "blue", "value": 4, "effect": "最大HP+30・毎ターンST+5", "stat": {"max_hp": 30, "st_regen": 5}}, "battle_gloves": {"name_ja": "バトルグローブ", "name_en": "Battle Gloves", "color": "blue", "value": 4, "effect": "毎ターンST+3・近接+6/魔法+1防御", "stat": {"st_regen": 3, "armor": [6, 0, 1]}}, "parchment_skill": {"name_ja": "技能の羊皮紙", "name_en": "Parchment of Skill", "color": "pink", "value": 1, "effect": "全攻撃Crit+15%", "stat": {"crit_bonus": 15}}, "book_skill": {"name_ja": "技能の書", "name_en": "Book of Skill", "color": "pink", "value": 2, "effect": "全攻撃Crit+20%", "stat": {"crit_bonus": 20}}, "emblem_fists": {"name_ja": "拳の紋章", "name_en": "Emblem of Fists", "color": "pink", "value": 2, "effect": "全攻撃+1・近接+1", "stat": {"all_dmg": 1, "melee_dmg": 1}}, "stone_strength": {"name_ja": "力の石", "name_en": "Stone of Strength", "color": "pink", "value": 2, "effect": "単発攻撃力+7", "stat": {"single_dmg": 7}}, "emblem_swords": {"name_ja": "剣の紋章", "name_en": "Emblem of Swords", "color": "pink", "value": 3, "effect": "全攻撃+2・近接+1", "stat": {"all_dmg": 2, "melee_dmg": 1}}, "emblem_arrows": {"name_ja": "矢の紋章", "name_en": "Emblem of Arrows", "color": "pink", "value": 3, "effect": "遠距離+3・単発+4", "stat": {"ranged_dmg": 3, "single_dmg": 4}}, "stone_might": {"name_ja": "豪腕の石", "name_en": "Stone of Might", "color": "pink", "value": 3, "effect": "単発攻撃力+11", "stat": {"single_dmg": 11}}, "book_mastery": {"name_ja": "達人の書", "name_en": "Book of Mastery", "color": "pink", "value": 4, "effect": "全攻撃Crit+30%", "stat": {"crit_bonus": 30}}, "emblem_war": {"name_ja": "戦争の紋章", "name_en": "Emblem of War", "color": "pink", "value": 4, "effect": "全攻撃+3・近接+1", "stat": {"all_dmg": 3, "melee_dmg": 1}}, "emblem_volleys": {"name_ja": "斉射の紋章", "name_en": "Emblem of Volleys", "color": "pink", "value": 4, "effect": "遠距離+4・単発+5", "stat": {"ranged_dmg": 4, "single_dmg": 5}}, "stone_power": {"name_ja": "強力の石", "name_en": "Stone of Power", "color": "pink", "value": 4, "effect": "単発攻撃力+14", "stat": {"single_dmg": 14}}, "scone": {"name_ja": "スコーン", "name_en": "Scone", "color": "orange", "value": 2, "effect": "待機するとHP+10", "stat": {"wait_hp": 10}}, "drumstick": {"name_ja": "鶏もも", "name_en": "Drumstick", "color": "orange", "value": 2, "effect": "待機で攻撃力+2 (3ターン)", "stat": {"wait_atk_buff": {"amount": 2, "turns": 3}}}, "double_scone": {"name_ja": "ダブルスコーン", "name_en": "Double Scone", "color": "orange", "value": 3, "effect": "待機するとHP+15", "stat": {"wait_hp": 15}}, "steak": {"name_ja": "ステーキ", "name_en": "Steak", "color": "orange", "value": 3, "effect": "待機で攻撃力+6 (1ターン)", "stat": {"wait_atk_buff": {"amount": 6, "turns": 1}}}, "pie": {"name_ja": "パイ", "name_en": "Pie", "color": "orange", "value": 4, "effect": "待機するとHP+20", "stat": {"wait_hp": 20}}, "chicken": {"name_ja": "チキン", "name_en": "Chicken", "color": "orange", "value": 4, "effect": "待機で攻撃力+3 (4ターン)", "stat": {"wait_atk_buff": {"amount": 3, "turns": 4}}}, "pitcher_ale": {"name_ja": "エールの大瓶", "name_en": "Pitcher of Ale", "color": "orange", "value": 4, "effect": "待機で隣接味方ST+15", "stat": {"wait_aoe_st": 15}}, "meat_pie": {"name_ja": "ミートパイ", "name_en": "Meat Pie", "color": "orange", "value": 4, "effect": "待機でHP+12・攻撃+2(3T)", "stat": {"wait_hp": 12, "wait_atk_buff": {"amount": 2, "turns": 3}}}, "apple": {"name_ja": "りんご", "name_en": "Apple", "color": "orange", "value": 2, "effect": "全攻撃にCrit+20%", "stat": {"crit_bonus": 20}}, "pear": {"name_ja": "洋梨", "name_en": "Pear", "color": "orange", "value": 3, "effect": "全攻撃にCrit+25%", "stat": {"crit_bonus": 25}}, "pomegranate": {"name_ja": "ザクロ", "name_en": "Pomegranate", "color": "orange", "value": 4, "effect": "全攻撃にCrit+30%", "stat": {"crit_bonus": 30}}, "sturdy_belt": {"name_ja": "頑丈なベルト", "name_en": "Sturdy Belt", "color": "blue", "value": 2, "effect": "最大HP+15・Stun/Daze/Slow 30%無効", "stat": {"max_hp": 15, "status_resist": 30}}, "book_expertise": {"name_ja": "熟練の書", "name_en": "Book of Expertise", "color": "pink", "value": 3, "effect": "全攻撃Crit+20%・被Crit 20%無効", "stat": {"crit_bonus": 20, "crit_resist": 20}}, "book_capability": {"name_ja": "素養の書", "name_en": "Book of Capability", "color": "pink", "value": 3, "effect": "全攻撃Crit+20%・毒 40%無効", "stat": {"crit_bonus": 20, "poison_resist": 40}}, "indomitable_belt": {"name_ja": "不屈のベルト", "name_en": "Indomitable Belt", "color": "blue", "value": 4, "effect": "Stun/Daze/Slow 80%無効", "stat": {"status_resist": 80}}, "cloak_poison": {"name_ja": "毒の外套", "name_en": "Cloak of Poison", "color": "blue", "value": 4, "effect": "毒 80%無効", "stat": {"poison_resist": 80}}, "bottle_poison": {"name_ja": "毒の小瓶", "name_en": "Bottle of Poison", "color": "pink", "value": 2, "effect": "攻撃に30%で毒付与(4ダメ・15T)", "stat": {"attack_poison_chance": 30, "poison_dmg": 4, "poison_turns": 15}}, "oil_shock": {"name_ja": "雷撃の油", "name_en": "Oil of Shock", "color": "pink", "value": 3, "effect": "攻撃に30%でStun付与(5T)", "stat": {"attack_stun_chance": 30, "stun_turns": 5}}, "bottle_venom": {"name_ja": "猛毒の小瓶", "name_en": "Bottle of Venom", "color": "pink", "value": 4, "effect": "攻撃に35%で猛毒付与(7ダメ・8T)", "stat": {"attack_poison_chance": 35, "poison_dmg": 7, "poison_turns": 8}}, "oil_fury": {"name_ja": "怒りの油", "name_en": "Oil of Fury", "color": "pink", "value": 2, "effect": "戦闘開始から5T限定でST消費-8", "stat": {"st_cost_reduce_temp": 8, "st_cost_reduce_turns": 5}}, "oil_dazing": {"name_ja": "惑乱の油", "name_en": "Oil of Dazing", "color": "pink", "value": 4, "effect": "被攻撃時60%で攻撃者をDaze(6T)", "stat": {"counter_daze_chance": 60, "counter_daze_turns": 6}}, "ring_abrasion": {"name_ja": "摩耗の指輪", "name_en": "Ring of Abrasion", "color": "pink", "value": 1, "effect": "ターン開始時 隣接敵に魔法5ダメ", "stat": {"aoe_damage": 5}}, "lucky_coin": {"name_ja": "幸運のコイン", "name_en": "Lucky Coin", "color": "orange", "value": 2, "effect": "攻撃ヒット時5%でEXP+10", "stat": {"extra_exp_chance": 5, "extra_exp_amount": 10}}, "healing_aura": {"name_ja": "癒しのオーラ", "name_en": "Healing Aura", "color": "orange", "value": 3, "effect": "ターン開始時 隣接味方HP+3", "stat": {"aoe_heal": 3}}, "ring_greater_abrasion": {"name_ja": "大摩耗の指輪", "name_en": "Ring of Greater Abrasion", "color": "pink", "value": 3, "effect": "ターン開始時 隣接敵に魔法10ダメ", "stat": {"aoe_damage": 10}}, "cursed_doll": {"name_ja": "呪いの人形", "name_en": "Cursed Doll", "color": "pink", "value": 3, "effect": "被ダメ時20%で同ダメージ反射", "stat": {"reflect_dmg_chance": 20, "reflect_dmg_ratio": 1.0}}, "bramble_cloak": {"name_ja": "荊の外套", "name_en": "Bramble Cloak", "color": "blue", "value": 4, "effect": "近接被弾時に5ダメ反射", "stat": {"reflect_melee_fixed": 5}}, "battle_banner": {"name_ja": "戦旗", "name_en": "Battle Banner", "color": "pink", "value": 4, "effect": "隣接味方の攻撃力+2", "stat": {"aoe_atk_buff": 2}}, "vampire_fang": {"name_ja": "吸血の牙", "name_en": "Vampire Fang", "color": "pink", "value": 4, "effect": "与ダメの15%をHP吸収", "stat": {"lifesteal_ratio": 15}}, "wooden_falcon": {"name_ja": "木の鷹", "name_en": "Wooden Falcon", "color": "pink", "value": 4, "effect": "自分のターン開始時 7Tの間 敵1体に遠距離20", "stat": {"falcon_dmg": 20, "falcon_turns": 7}}, "stone_falcon": {"name_ja": "石の鷹", "name_en": "Stone Falcon", "color": "pink", "value": 4, "effect": "自分のターン開始時 2Tの間 敵1体に遠距離40", "stat": {"falcon_dmg": 40, "falcon_turns": 2}}, "phoenix_feather": {"name_ja": "不死鳥の羽", "name_en": "Phoenix Feather", "color": "orange", "value": 4, "effect": "1度だけHP1で復活+HP30%回復", "stat": {"revive_once": true, "revive_hp_ratio": 30}}, "band_pummelling": {"name_ja": "連打の腕輪", "name_en": "Band of Pummelling", "color": "pink", "value": 4, "effect": "攻撃後、ランダム敵に追加16近接", "stat": {"chain_attack_dmg": 16}}};

// ====== レベル毎の必要経験値 ======
function expRequired(level) {
  return level * 200; // Lv1→2: 200EXP, Lv2→3: 400EXP, ... (★バランス調整: 100→200)
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

const SKILLS = {"monk": [{"name": "Bounding Kick", "name_ja": "弾けキック", "type": "M", "damage": 22, "hits": 2, "range": 1, "cost": 15, "crit": 40, "status": null, "note": "標準近接、低コスト"}, {"name": "Disrupting Palm", "name_ja": "封じの掌", "type": "M", "damage": 30, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "daze", "note": "敵スキル封じ"}, {"name": "Pummel", "name_ja": "連打", "type": "M", "damage": 10, "hits": 5, "range": 1, "cost": 45, "crit": 25, "status": null, "note": "5連撃、低単発・高合計"}], "knight": [{"name": "Critical Slash", "name_ja": "クリティカル斬", "type": "M", "damage": 16, "hits": 3, "range": 1, "cost": 30, "crit": 40, "status": null, "note": "3連撃Crit特化"}, {"name": "Exotic Feint", "name_ja": "エキゾチック・フェイント", "type": "M", "damage": 21, "hits": 1, "range": 1, "cost": 20, "crit": 0, "status": "armor_down", "note": "防御Down付与"}, {"name": "Galant Slash", "name_ja": "ギャラント・スラッシュ", "type": "M", "damage": 31, "hits": 1, "range": 1, "cost": 70, "crit": 30, "status": null, "note": "強攻撃、次ターンST全快"}], "healer": [{"name": "Quick Shot", "name_ja": "速射", "type": "R", "damage": 12, "hits": 1, "range": 4, "cost": 20, "crit": 30, "status": null, "note": "標準遠距離"}, {"name": "Healing Potion", "name_ja": "回復薬", "type": "S", "damage": -25, "hits": 1, "range": 3, "cost": 30, "crit": 0, "status": "heal", "note": "味方HP回復(マイナス=回復)"}, {"name": "Skill Potion", "name_ja": "技能薬", "type": "S", "damage": 0, "hits": 1, "range": 2, "cost": 35, "crit": 0, "status": "buff_crit", "note": "味方に100%Crit付与"}], "gladiator": [{"name": "Throwing Knives", "name_ja": "投げナイフ", "type": "R", "damage": 8, "hits": 4, "range": 3, "cost": 15, "crit": 30, "status": null, "note": "4連射"}, {"name": "Bolas", "name_ja": "ボーラ", "type": "R", "damage": 17, "hits": 2, "range": 2, "cost": 35, "crit": 25, "status": "armor_down_all", "note": "3軸防御Down"}, {"name": "Buckler Bash", "name_ja": "盾打ち", "type": "M", "damage": 11, "hits": 2, "range": 1, "cost": 25, "crit": 30, "status": "self_def_up", "note": "自防御UP+追加攻撃可"}], "champion": [{"name": "Slash", "name_ja": "斬撃", "type": "M", "damage": 20, "hits": 1, "range": 1, "cost": 10, "crit": 40, "status": null, "note": "低コスト基本攻撃"}, {"name": "Daring Strike", "name_ja": "決死の一撃", "type": "M", "damage": 21, "hits": 2, "range": 1, "cost": 70, "crit": 30, "status": "aoe_3", "note": "前方3マス直線を貫く必殺攻撃。最大3体まで巻き込む。"}, {"name": "Battle Shout", "name_ja": "戦の雄叫び", "type": "S", "damage": 0, "hits": 1, "range": 0, "cost": 50, "crit": 0, "status": "buff_atk_aoe", "note": "自身と隣接した仲間の攻撃力UP(3ターン)。"}], "barbarian": [{"name": "Tackle", "name_ja": "タックル", "type": "M", "damage": 28, "hits": 1, "range": 1, "cost": 30, "crit": 25, "status": "self_st_save", "note": "STコスト削減効果"}, {"name": "Whirlwind", "name_ja": "渦巻き斬り", "type": "M", "damage": 38, "hits": 1, "range": 1, "cost": 60, "crit": 35, "status": "aoe_around", "note": "周囲8マスの全ての敵を巻き込む範囲攻撃。"}, {"name": "War Cry", "name_ja": "ワークライ", "type": "S", "damage": 13, "hits": 1, "range": 2, "cost": 60, "crit": 25, "status": "st_drain", "note": "ST吸収"}], "rocketeer": [{"name": "Yellow Tiger", "name_ja": "イエロータイガー", "type": "S", "damage": 26, "hits": 1, "range": 6, "cost": 35, "crit": 30, "status": "aoe_2", "note": "範囲遠距離"}, {"name": "Pink Lion", "name_ja": "ピンクライオン", "type": "S", "damage": 18, "hits": 1, "range": 6, "cost": 30, "crit": 25, "status": "daze", "note": "Daze付与"}, {"name": "Detonate", "name_ja": "自爆", "type": "S", "damage": 50, "hits": 1, "range": 0, "cost": 0, "crit": 100, "status": "aoe_around", "note": "自爆魔法、自身も死亡"}], "jungleman": [{"name": "Javelin Sting", "name_ja": "ジャベリン・スティング", "type": "R", "damage": 20, "hits": 1, "range": 3, "minRange": 2, "cost": 25, "crit": 30, "status": "armor_down_jav", "note": "射程2-3。80%確率で近接防御-2、遠距離防御-3"}, {"name": "Boomerang", "name_ja": "ブーメラン", "type": "R", "damage": 14, "hits": 2, "range": 4, "cost": 35, "crit": 25, "status": "stun_aoe", "note": "射程1-4の範囲攻撃。30%でスタン付与"}, {"name": "Poisoned Blade", "name_ja": "毒の刃", "type": "M", "damage": 14, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "poison", "note": "70%毒近接"}], "archer": [{"name": "Long Sword", "name_ja": "長剣", "type": "M", "damage": 9, "hits": 2, "range": 1, "cost": 15, "crit": 30, "status": null, "note": "近接基本"}, {"name": "Power Shot", "name_ja": "パワーショット", "type": "R", "damage": 24, "hits": 1, "range": 7, "cost": 60, "crit": 50, "status": "slow", "note": "50%Slow付与長射程"}, {"name": "Poison Arrow", "name_ja": "毒矢", "type": "R", "damage": 9, "hits": 1, "range": 6, "cost": 15, "crit": 25, "status": "poison", "note": "毒矢"}], "alchemist": [{"name": "Cane", "name_ja": "杖打ち", "type": "M", "damage": 19, "hits": 1, "range": 1, "cost": 10, "crit": 30, "status": "extra_magic", "note": "近接+追加魔法"}, {"name": "Flame Potion", "name_ja": "火炎薬", "type": "S", "damage": 24, "hits": 1, "range": 3, "cost": 35, "crit": 25, "status": "aoe_2", "note": "範囲魔法"}, {"name": "Poison Potion", "name_ja": "毒薬", "type": "S", "damage": 0, "hits": 1, "range": 3, "cost": 25, "crit": 0, "status": "poison_aoe", "note": "範囲毒(0ダメ防御無視)"}], "beastmaster": [{"name": "Shillelagh", "name_ja": "シレリ棒", "type": "M", "damage": 13, "hits": 1, "range": 1, "cost": 10, "crit": 50, "status": "daze", "note": "Daze率高"}, {"name": "Immaterial Bash", "name_ja": "実体貫きの一撃", "type": "M", "damage": 30, "hits": 1, "range": 2, "cost": 30, "crit": 35, "status": null, "note": "高威力中距離(NO MOVE)"}, {"name": "Lupine Strike", "name_ja": "狼の一撃", "type": "M", "damage": 22, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "self_heal", "note": "HP回復近接"}], "ranger": [{"name": "Arrow Spray", "name_ja": "アロースプレー", "type": "R", "damage": 7, "hits": 3, "range": 3, "minRange": 2, "cost": 15, "crit": 50, "status": null, "note": "射程2-3の3連射、Crit50%"}, {"name": "Bramble Snare", "name_ja": "茨の罠", "type": "R", "damage": 8, "hits": 1, "range": 3, "minRange": 1, "cost": 25, "crit": 20, "status": "slow", "note": "射程1-3、相手をSlow状態に"}, {"name": "Moss Potion", "name_ja": "苔薬", "type": "S", "damage": 0, "hits": 1, "range": 3, "cost": 36, "crit": 0, "status": "slow_st_drain", "note": "100%スロー+ST減"}], "hound": [{"name": "Maul", "name_ja": "噛みつき", "type": "M", "damage": 18, "hits": 1, "range": 1, "cost": 10, "crit": 30, "status": null, "note": "基本近接"}, {"name": "Head Butt", "name_ja": "頭突き", "type": "M", "damage": 14, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "armor_down_full", "note": "100%防御Down"}, {"name": "Nip", "name_ja": "噛みちぎり", "type": "M", "damage": 10, "hits": 1, "range": 1, "cost": 15, "crit": 25, "status": "st_drain_full", "note": "100%ST奪取"}], "coyote": [{"name": "Claw", "name_ja": "爪", "type": "M", "damage": 8, "hits": 3, "range": 1, "cost": 35, "crit": 0, "status": null, "note": "3連撃"}, {"name": "Howl", "name_ja": "遠吠え", "type": "S", "damage": 9, "hits": 1, "range": 2, "cost": 15, "crit": 0, "status": "st_drain_50", "note": "50%ST奪取"}, {"name": "Nip", "name_ja": "噛みちぎり", "type": "M", "damage": 18, "hits": 1, "range": 1, "cost": 25, "crit": 25, "status": null, "note": "強近接"}], "badger": [{"name": "Badger Scratch", "name_ja": "アナグマ引っ掻き", "type": "M", "damage": 18, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": null, "note": "MOVE攻撃"}, {"name": "Badger Maul", "name_ja": "アナグマ噛み", "type": "M", "damage": 5, "hits": 6, "range": 1, "cost": 40, "crit": 30, "status": null, "note": "6連撃(NO MOVE)"}, {"name": "Roar", "name_ja": "咆哮", "type": "S", "damage": 8, "hits": 3, "range": 2, "cost": 50, "crit": 0, "status": "daze_aoe", "note": "Daze範囲"}], "serpent": [{"name": "Hiss", "name_ja": "シャー", "type": "S", "damage": 7, "hits": 1, "range": 3, "cost": 15, "crit": 0, "status": "st_drain_full", "note": "100%ST20奪取"}, {"name": "Snake Rage", "name_ja": "蛇の憤怒", "type": "S", "damage": 0, "hits": 1, "range": 0, "cost": 20, "crit": 0, "status": "self_atk_up", "note": "自身攻撃力UP重複可"}, {"name": "Venomous Bite", "name_ja": "毒牙", "type": "M", "damage": 8, "hits": 2, "range": 1, "cost": 35, "crit": 30, "status": "poison_strong", "note": "強力毒近接"}], "bandit_boss": [{"name": "Tackle", "name_ja": "タックル", "type": "M", "damage": 38, "hits": 1, "range": 1, "cost": 25, "crit": 30, "status": "self_st_save", "note": "ボス強化版タックル、STコスト削減"}, {"name": "Boomerang", "name_ja": "ブーメラン", "type": "R", "damage": 22, "hits": 2, "range": 4, "cost": 40, "crit": 30, "status": "stun_aoe", "note": "ボス強化版、射程1-4の中距離。30%でスタン付与"}, {"name": "Whirlwind", "name_ja": "渦巻き斬り", "type": "M", "damage": 54, "hits": 1, "range": 1, "cost": 65, "crit": 35, "status": "aoe_around", "note": "ボス強化版、周囲8マスの全ての敵を巻き込む範囲攻撃"}, {"name": "Poisoned Blade", "name_ja": "毒の刃", "type": "M", "damage": 22, "hits": 1, "range": 1, "cost": 30, "crit": 30, "status": "poison", "note": "ボス強化版、70%毒近接"}]};
const BASIC_ATTACKS = {"monk": {"name": "Bounding Kick", "name_ja": "弾けキック", "damage": 22, "type": "M", "range": 1, "cost": 10, "crit": 40}, "knight": {"name": "Critical Slash", "name_ja": "クリティカル斬", "damage": 24, "type": "M", "range": 1, "cost": 30, "crit": 40}, "healer": {"name": "Quick Shot", "name_ja": "速射", "damage": 18, "type": "R", "range": 3, "cost": 20, "crit": 30}, "gladiator": {"name": "Throwing Knives", "name_ja": "投げナイフ", "damage": 17, "type": "R", "range": 3, "cost": 15, "crit": 25}, "champion": {"name": "Slash", "name_ja": "斬撃", "damage": 20, "type": "M", "range": 1, "cost": 5, "crit": 40}, "barbarian": {"name": "Tackle", "name_ja": "タックル", "damage": 28, "type": "M", "range": 1, "cost": 30, "crit": 25}, "rocketeer": {"name": "Yellow Tiger", "name_ja": "イエロータイガー", "damage": 26, "type": "S", "range": 6, "cost": 35, "crit": 30}, "jungleman": {"name": "Javelin Sting", "name_ja": "ジャベリン", "damage": 22, "type": "R", "range": 3, "cost": 25, "crit": 30}, "archer": {"name": "Power Shot", "name_ja": "パワーショット", "damage": 28, "type": "R", "range": 4, "cost": 35, "crit": 50}, "alchemist": {"name": "Cane", "name_ja": "杖打ち", "damage": 19, "type": "M", "range": 1, "cost": 10, "crit": 30}, "beastmaster": {"name": "Immaterial Bash", "name_ja": "実体貫きの一撃", "damage": 30, "type": "M", "range": 2, "cost": 30, "crit": 35}, "ranger": {"name": "Arrow Spray", "name_ja": "アロースプレー", "damage": 7, "hits": 3, "type": "R", "range": 3, "cost": 15, "crit": 50}, "hound": {"name": "Maul", "name_ja": "噛みつき", "damage": 18, "type": "M", "range": 1, "cost": 10, "crit": 30}, "coyote": {"name": "Claw", "name_ja": "爪攻撃", "damage": 16, "type": "M", "range": 1, "cost": 15, "crit": 25}, "badger": {"name": "Badger Scratch", "name_ja": "アナグマ引っ掻き", "damage": 20, "type": "M", "range": 1, "cost": 25, "crit": 30}, "serpent": {"name": "Hiss", "name_ja": "シャー", "damage": 12, "type": "S", "range": 3, "cost": 15, "crit": 20}, "bandit_boss": {"name": "Tackle", "name_ja": "タックル", "damage": 32, "type": "M", "range": 1, "cost": 25, "crit": 30}};
// ====== ミッション定義(ACT 1) ======
const MISSIONS = {
  // ============================================
  // ★Phase3 v8: SHIBA確定の最終配置 (右下START → 左中央GOAL)
  //
  // 本筋GOLDルート: S1→S2→S3→S4→S6(中ボス)→[GOLD門]→S10(ラスボス)
  // BLUEルート分岐:
  //   B1先 (左上方向): S8 岩山, S9 熊洞窟, E5 熊との遭遇, $4
  //   B2先 (左下方向): S5 林の空き地, S11 訓練場, E2 ポーション, E3 山賊頭領, $2
  //
  // BLUE KEY: S2森の縁で1個 + S9熊洞窟/S11訓練場で各1個 (両ルート解放可能)
  // GOLD KEY: S6武闘大会(中ボス)撃破で1個 → GOLD門開錠でS10へ
  //
  // ★今回はゲート/イベントのロジックは未実装(タップで「未実装」トースト)
  // 既存MISSIONS.requiresKey は S10 dueling_grounds のみ(GOLD)、S8/S9/S11はBLUEを保持
  // ============================================

  trivial_plain: {
    id: 'trivial_plain',
    name: 'The Trivial Plain',
    name_ja: '平原',
    x: 88.6, y: 61.3,  // ★S1: 右下START
    enemies: [
      { classKey: 'coyote', x: 17, y: 3, level: 1 },
      { classKey: 'coyote', x: 18, y: 5, level: 1 },
      { classKey: 'coyote', x: 17, y: 7, level: 1 },
    ],
    unlocks: ['forest_edge'],
    warriorReward: false,
    missions: [
      {
        id: 'trivial_plain_m1',
        name: 'Trivial Plain',
        name_ja: '平原',
        difficulty: 'easy',
        rewardType: 'starter_pack',
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
    x: 73.3, y: 49.1,  // ★S2
    enemies: [
      { classKey: 'coyote', x: 16, y: 2, level: 2 },
      { classKey: 'coyote', x: 18, y: 4, level: 2 },
      { classKey: 'badger', x: 17, y: 6, level: 1 },
    ],
    unlocks: ['village', 'event_lone_challenger', 'event_potion_master'],
    warriorReward: false,
    chest: { type: 'blue_key' },  // ★1個目のBLUE KEY (B1かB2どちらか開錠用)
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
        chest: { type: 'blue_key' },
      },
    ],
  },

  village: {
    id: 'village',
    name: 'The Village',
    name_ja: '村',
    x: 59.1, y: 61.3,  // ★S3
    enemies: [
      { classKey: 'monk', x: 16, y: 3, level: 2 },
      { classKey: 'gladiator', x: 18, y: 5, level: 2 },
      { classKey: 'archer', x: 17, y: 7, level: 2 },
    ],
    unlocks: ['academy'],
    warriorReward: true,
    warriorPool: ['monk', 'gladiator', 'archer'],
    routeFlag: 'blue_completed',
  },

  academy: {
    id: 'academy',
    name: 'The Academy',
    name_ja: 'アカデミー',
    x: 48.4, y: 52.7,  // ★S4
    enemies: [
      { classKey: 'serpent', x: 16, y: 3, level: 3 },
      { classKey: 'badger', x: 18, y: 5, level: 3 },
      { classKey: 'coyote', x: 17, y: 7, level: 3 },
    ],
    unlocks: ['tournament'],  // ★S4→S6 武闘大会
    warriorReward: false,
    chest: { type: 'item_rare' },
  },

  tournament: {
    id: 'tournament',
    name: 'The Tournament',
    name_ja: '武闘大会',
    x: 38.2, y: 41.0,  // ★S6: 中ボス
    enemies: [
      { classKey: 'champion', x: 17, y: 3, level: 3, rank: 'elite' },
      { classKey: 'knight', x: 18, y: 5, level: 3, rank: 'elite' },
      { classKey: 'barbarian', x: 17, y: 7, level: 3, rank: 'boss' },
    ],
    unlocks: ['dueling_grounds'],  // ★S6→S10 真ラスボス
    warriorReward: false,
    chest: { type: 'gold_key' },  // ★中ボス撃破でGOLD KEY (G1門開錠用)
    isBossBattle: true,  // 中ボス
  },

  dueling_grounds: {
    id: 'dueling_grounds',
    name: 'The Dueling Grounds',
    name_ja: '決闘場',
    x: 35.0, y: 19.2,  // ★S10: 真のラスボス、ACT1 GOAL
    enemies: [
      { classKey: 'bandit_boss', x: 17, y: 5, level: 5, rank: 'boss' },
    ],
    unlocks: [],
    isFinal: true,
    requiresKey: 'gold',  // ★GOLD門 (G1) で開錠
    warriorReward: false,
    isBossBattle: true,
  },

  // ===== BLUEルート分岐 (B1経由: S8, S9, E5, $4) =====
  the_crag: {
    id: 'the_crag',
    name: 'The Crag',
    name_ja: '岩山',
    x: 8.9, y: 43.1,  // ★S8
    enemies: [],
    unlocks: ['bear_cave'],
    warriorReward: false,
    requiresKey: 'blue',
    notImplemented: true,
  },

  bear_cave: {
    id: 'bear_cave',
    name: 'Bear Cave',
    name_ja: '熊洞窟',
    x: 15.4, y: 24.5,  // ★S9
    enemies: [],
    unlocks: [],
    warriorReward: false,
    requiresKey: 'blue',
    chest: { type: 'blue_key' },  // ★S9で2個目のBLUE KEY入手 (反対側B2解放用)
    notImplemented: true,
  },

  // ===== BLUEルート分岐 (B2経由: S5, S11, E2, E3, $2) =====
  glade: {
    id: 'glade',
    name: 'The Glade',
    name_ja: '林の空き地',
    x: 32.1, y: 70.4,  // ★S5
    enemies: [
      { classKey: 'badger', x: 16, y: 3, level: 2 },
      { classKey: 'badger', x: 18, y: 5, level: 2 },
      { classKey: 'coyote', x: 17, y: 7, level: 2 },
    ],
    unlocks: ['training_grounds', 'event_bandit_chief'],
    warriorReward: false,
    requiresKey: 'blue',
    missions: [
      {
        id: 'glade_m1',
        name: 'Serpent Nest',
        name_ja: '蛇の巣',
        difficulty: 'easy',
        rewardType: 'extra_exp',
        bonusExp: 60,
        battleType: 'Basic',
        playerSlots: 3,
        description: '林に潜むサーペント4匹。\n比較的与し易い。',
        enemies: [
          { classKey: 'serpent', x: 16, y: 2, level: 4 },
          { classKey: 'serpent', x: 18, y: 4, level: 4 },
          { classKey: 'serpent', x: 16, y: 6, level: 4 },
          { classKey: 'serpent', x: 18, y: 8, level: 4 },
        ],
      },
      {
        id: 'glade_m2',
        name: 'Beast Pack',
        name_ja: '獣の群れ',
        difficulty: 'medium',
        rewardType: 'item',
        battleType: 'Basic',
        playerSlots: 3,
        description: 'アナグマ2匹とサーペント2匹。\n硬さと数で攻める敵。',
        enemies: [
          { classKey: 'badger', x: 16, y: 3, level: 4 },
          { classKey: 'badger', x: 18, y: 5, level: 4 },
          { classKey: 'serpent', x: 16, y: 6, level: 4 },
          { classKey: 'serpent', x: 18, y: 8, level: 4 },
        ],
      },
      {
        id: 'glade_m3',
        name: 'Hunter Trio',
        name_ja: '狩人の三連戦',
        difficulty: 'hard',
        rewardType: 'item',
        battleType: 'Basic',
        playerSlots: 3,
        description: 'バーバリアン2人と射手1人。\n人間の戦士集団は手強い。',
        enemies: [
          { classKey: 'barbarian', x: 16, y: 3, level: 4 },
          { classKey: 'barbarian', x: 18, y: 5, level: 4 },
          { classKey: 'archer', x: 17, y: 7, level: 4 },
        ],
      },
      {
        id: 'glade_m4',
        name: 'The Champion',
        name_ja: '林の王',
        difficulty: 'extreme',
        rewardType: 'warrior',
        battleType: 'Basic',
        playerSlots: 3,
        description: '蛮族の王とコヨーテの群れ。\n最難関、勝てば仲間が来る。',
        enemies: [
          { classKey: 'barbarian', x: 17, y: 4, level: 5 },
          { classKey: 'coyote', x: 16, y: 2, level: 4 },
          { classKey: 'coyote', x: 18, y: 6, level: 4 },
          { classKey: 'coyote', x: 17, y: 8, level: 4 },
        ],
      },
    ],
  },

  training_grounds: {
    id: 'training_grounds',
    name: 'Training Grounds',
    name_ja: '訓練場',
    x: 12.5, y: 83.1,  // ★S11
    enemies: [],
    unlocks: [],
    warriorReward: false,
    requiresKey: 'blue',
    chest: { type: 'blue_key' },  // ★S11で2個目のBLUE KEY入手 (反対側B1解放用)
    notImplemented: true,
  },

  // ===== 砂浜 (S7) - 場所のみ、本筋でも分岐でもない位置 (今のところ独立寄り道) =====
  sandy_shore: {
    id: 'sandy_shore',
    name: 'Sandy Shore',
    name_ja: '砂浜',
    x: 56.8, y: 21.0,  // ★S7
    enemies: [],
    unlocks: [],
    warriorReward: false,
    notImplemented: true,  // ★今回ロジック未実装、タップで未実装トースト
  },

  // ===== ★Phase3 v9: イベントバトル (E1〜E3を実装、E4〜E5は次回) =====

  // E1: 孤高の挑戦者 - S2クリアで解放、行き止まり
  event_lone_challenger: {
    id: 'event_lone_challenger',
    name: 'Lone Challenger',
    name_ja: '孤高の挑戦者',
    x: 72.3, y: 69.0,
    isEvent: true,
    eventNarration: '道に蛮族が胡坐を組んで座っている。目を合わせると、ニヤッと笑った。',
    eventOpeningLine: { speaker: 'Tor', text: '手合わせ願おう、旅人よ!' },
    enemies: [
      // Tor (barbarian Lv2、AGI高め設定。固有名)
      { classKey: 'barbarian', x: 17, y: 5, level: 2, rank: 'elite', uniqueName: 'Tor', agiBonus: 5 },
    ],
    unlocks: [],
    warriorReward: false,
    isBossBattle: false,
    playerSlots: 1,  // ★1v1タイマン
  },

  // E2: 泉のポーションマスター - B2越え後に解放、行き止まり
  event_potion_master: {
    id: 'event_potion_master',
    name: 'Potion Master',
    name_ja: '泉のポーションマスター',
    x: 29.2, y: 63.1,
    isEvent: true,
    eventNarration: '森の中の泉のすぐそば、釜を焚く老人の錬金術師がいる。釜の中は、奇妙な色に光る薬、そして提げた数のポーション達が並べられている。',
    eventOpeningLine: { speaker: 'Mortimer', text: 'ふん…主らよ、わしの薬を試させてもらおうか' },
    enemies: [
      // Mortimer (alchemist Lv6 ボス、HP+50/ST+30)
      { classKey: 'alchemist', x: 17, y: 5, level: 6, rank: 'boss', uniqueName: 'Mortimer', hpBonus: 50, stBonus: 30 },
      // 雑魚alchemist Lv5 × 4
      { classKey: 'alchemist', x: 14, y: 3, level: 5, rank: 'normal' },
      { classKey: 'alchemist', x: 19, y: 3, level: 5, rank: 'normal' },
      { classKey: 'alchemist', x: 14, y: 7, level: 5, rank: 'normal' },
      { classKey: 'alchemist', x: 19, y: 7, level: 5, rank: 'normal' },
    ],
    unlocks: [],
    warriorReward: false,
    isBossBattle: true,
    // requiresKey: 'blue',  // ★鍵システム実装後に有効化(B2ゲート越え必要)
  },

  // E3: 山賊頭領との戦い - S5クリアで解放、行き止まり、実質ラスボス級
  event_bandit_chief: {
    id: 'event_bandit_chief',
    name: 'Bandit Chief',
    name_ja: '山賊頭領との戦い',
    x: 7.9, y: 70.4,
    isEvent: true,
    eventNarration: '崩れた小屋を住処とし、山賊達がたむろしている。鬼気迫る雰囲気の頭領が、刃物を研ぐ手を止め、こちらを見やった。',
    eventOpeningLine: { speaker: '山賊頭領', text: '俺たちのシマに何の用だ。生きて帰れると思うな' },
    enemies: [
      // 頭領 (既存bandit_boss)
      { classKey: 'bandit_boss', x: 17, y: 5, level: 5, rank: 'boss' },
      // 子分 7体
      { classKey: 'gladiator', x: 14, y: 3, level: 4, rank: 'normal' },
      { classKey: 'gladiator', x: 19, y: 3, level: 4, rank: 'normal' },
      { classKey: 'barbarian', x: 14, y: 5, level: 4, rank: 'normal' },
      { classKey: 'barbarian', x: 19, y: 5, level: 4, rank: 'normal' },
      { classKey: 'coyote',    x: 14, y: 7, level: 4, rank: 'normal' },
      { classKey: 'coyote',    x: 19, y: 7, level: 4, rank: 'normal' },
      { classKey: 'archer',    x: 17, y: 8, level: 4, rank: 'normal' },
    ],
    unlocks: [],
    warriorReward: false,
    isBossBattle: true,
    // requiresKey: 'blue',  // ★鍵システム実装後に有効化(B2ゲート越え必要)
    chest: { type: 'blue_key' },  // 撃破でBLUE KEY 1個入手
  },
};

// ★Phase3 v9: マップ装飾 (3ゲート + 4ショップ) - イベントはMISSIONSに統合済み
const MAP_DECORATIONS = {
  gates: [
    { id: 'gate_gold_1', name: 'Gold Gate',  type: 'gold', x: 41.9, y: 23.0 },
    { id: 'gate_blue_1', name: 'Blue Gate I',  type: 'blue', x: 26.7, y: 32.4 },
    { id: 'gate_blue_2', name: 'Blue Gate II', type: 'blue', x: 39.7, y: 63.1 },
  ],
  shops: [
    { id: 'shop_1', name: 'Shop 1', x: 16.4, y: 40.5 },
    { id: 'shop_2', name: 'Shop 2', x: 47.0, y: 30.6 },
    { id: 'shop_3', name: 'Shop 3', x: 50.0, y: 41.0 },
    { id: 'shop_4', name: 'Shop 4', x: 18.9, y: 91.9 },
  ],
};


const STARTER_PARTIES = {"vanguards": {"name_en": "The Vanguards", "name_ja": "先鋒", "tagline": "力押し・正面突破型", "description": "高HP・高火力の重戦士コンビ。敵陣に飛び込んで殴り合う。", "members": ["champion", "barbarian"], "playstyle": ["近接特化", "高HP"]}, "adepts": {"name_en": "The Adepts", "name_ja": "達人", "tagline": "バランス・万能型", "description": "近接万能のモンクと長射程砲台のアーチャー。状況対応。", "members": ["monk", "archer"], "playstyle": ["近接+遠距離", "万能"]}, "wildkin": {"name_en": "The Wildkin", "name_ja": "野の血", "tagline": "獣使い・数的有利型", "description": "ペット召喚で数的優位。ハウンドは前衛で機動。", "members": ["beastmaster", "hound"], "playstyle": ["召喚", "高機動"]}, "custom": {"name_en": "Custom Party", "name_ja": "テスト編成", "tagline": "好きなクラスを3体選択", "description": "全16クラスから自由に3体を組み合わせてテストできる開発者用編成。", "members": [], "playstyle": ["カスタム", "テスト用"], "isCustom": true}};


// ★Phase 1: 各クラスの初期習得スキルインデックス
// ここに記載されてないクラスは「全スキル習得済み(従来通り)」扱い。
// 残りのスキル(配列に含まれないindex)は「未習得=Lv0」となり、報酬で習得する。
// SKILLS配列の順番依存なので、SKILLSデータを変更したら必ず見直すこと。
const SKILLS_INITIAL_LEARNED = {
  monk:        [0, 1],  // Bounding Kick, Disrupting Palm (未: Pummel)
  knight:      [0, 1],  // Critical Slash, Exotic Feint (未: Galant Slash)
  healer:      [0, 1],  // Quick Shot, Healing Potion (未: Skill Potion)
  gladiator:   [0, 2],  // Throwing Knives, Buckler Bash (未: Bolas)
  champion:    [0, 2],  // Slash, Battle Shout (未: Daring Strike)
  barbarian:   [0, 2],  // Tackle, War Cry (未: Whirlwind)
  rocketeer:   [0, 1],  // Yellow Tiger, Pink Lion (未: Detonate)
  jungleman:   [1, 2],  // Boomerang, Poisoned Blade (未: Javelin Sting)
  archer:      [0, 2],  // Long Sword, Poison Arrow (未: Power Shot)
  alchemist:   [0, 1],  // Cane, Flame Potion (未: Poison Potion)
  beastmaster: [0, 2],  // Shillelagh, Lupine Strike (未: Immaterial Bash)
  ranger:      [0, 1],  // Arrow Spray, Bramble Snare (未: Moss Potion)
  hound:       [0, 2],  // Maul, Nip (未: Head Butt)
  coyote:      [0, 1],  // Claw, Howl (未: Nip強化版)
  badger:      [0, 2],  // Badger Scratch, Roar (未: Badger Maul)
  serpent:     [0, 1],  // Hiss, Snake Rage (未: Venomous Bite)
  // bandit_boss はあえて記載しない → 全スキル習得済み(ボス強化のため)
};

// クラス毎の skillLevels 初期値を生成。
// 初期習得スキル: Lv1 / 未習得: Lv0
function buildInitialSkillLevels(classKey) {
  const skills = SKILLS[classKey] || [];
  const skillLevels = {};
  const learnedList = SKILLS_INITIAL_LEARNED[classKey];
  if (!learnedList) {
    // SKILLS_INITIAL_LEARNEDに無いクラス(boss等) → 全部Lv1
    skills.forEach((s, i) => { skillLevels[i] = 1; });
  } else {
    skills.forEach((s, i) => {
      skillLevels[i] = learnedList.includes(i) ? 1 : 0;
    });
  }
  return skillLevels;
}

// ★Phase 2 Step 3: クラスのランク分類
// common/rare/epic = 仲間勧誘で出る基本ランク
// event = ストーリー進行で加入(普段の勧誘では出ない)
// enemy_only = 仲間にならない(敵専用)
const CLASS_RANKS = {
  // common (4種): 標準的な勧誘候補、序盤に多く出る
  monk:        'common',
  healer:      'common',
  barbarian:   'common',
  archer:      'common',

  // rare (3種): 中盤の特別な勧誘候補
  jungleman:   'rare',
  alchemist:   'rare',
  ranger:      'rare',

  // epic (5種): 主人公格・ボス前後でしか出ない
  champion:    'epic',
  knight:      'epic',
  gladiator:   'epic',
  beastmaster: 'epic',
  rocketeer:   'epic',

  // event (2種): イベント限定加入
  hound:       'event',
  badger:      'event',

  // enemy_only (3種): 仲間にならない(敵専用)
  coyote:      'enemy_only',
  serpent:     'enemy_only',
  bandit_boss: 'enemy_only',
};

// ランク → そのランクに該当するクラスの配列(逆引き、勧誘ロジックで使う)
function getClassesByRank(rank) {
  return Object.keys(CLASS_RANKS).filter(k => CLASS_RANKS[k] === rank);
}

// ★Phase 2 Step 3: アイテムのランク分類
// ★Phase 5.1: アイテムは ITEMS[].value (1〜4) を直接ランクとして使う
// 旧 ITEM_RANKS (common/rare/epic) は廃止。互換ラッパーで残す。
const ITEM_RANKS = (() => {
  // 互換目的: 旧コードが ITEM_RANKS[key] を見ても動くよう、value を common/rare/epic にざっくり対応
  // V1 → common, V2 → common, V3 → rare, V4 → epic
  const m = {};
  Object.keys(ITEMS).forEach(k => {
    const v = ITEMS[k].value;
    m[k] = (v <= 2 ? 'common' : v === 3 ? 'rare' : 'epic');
  });
  return m;
})();

// value(1〜4) → そのvalueに該当するアイテムキー配列
function getItemsByValue(value) {
  return Object.keys(ITEMS).filter(k => ITEMS[k].value === value);
}

// 旧API互換: ランク → アイテムキー配列
function getItemsByRank(rank) {
  return Object.keys(ITEM_RANKS).filter(k => ITEM_RANKS[k] === rank);
}

// ★Phase 5.1: 難易度→V1〜V4出現率テーブル
//   v5.1.1 (案C): 全体を1段階スローダウン。序盤はV1〜V2主役、終盤でV3〜V4主役へ。
const REWARD_VALUE_TABLE = {
  easy:    { v1: 40, v2: 45, v3: 13, v4: 2  },
  medium:  { v1: 30, v2: 45, v3: 20, v4: 5  },
  hard:    { v1: 20, v2: 35, v3: 30, v4: 15 },
  extreme: { v1: 15, v2: 25, v3: 35, v4: 25 },
};

// ★旧 REWARD_RANK_TABLE は互換目的で残す(V1+V2=common, V3=rare, V4=epic に集約)
//   v5.1.1: 新REWARD_VALUE_TABLEから集約した数値
const REWARD_RANK_TABLE = {
  easy:    { common: 85, rare: 13, epic: 2  },
  medium:  { common: 75, rare: 20, epic: 5  },
  hard:    { common: 55, rare: 30, epic: 15 },
  extreme: { common: 40, rare: 35, epic: 25 },
};

// BLUE GATE先のステージは難易度より一段強いランク確率にする(底上げ)。
const BLUEGATE_DIFFICULTY_BONUS = {
  easy:    'medium',
  medium:  'hard',
  hard:    'extreme',
  extreme: 'extreme',
};

// ミッションの難易度とBLUEゲートフラグから、value出現率テーブルを返す
function getRewardValueProbs(difficulty, isBlueGate) {
  const effectiveDiff = isBlueGate ? (BLUEGATE_DIFFICULTY_BONUS[difficulty] || difficulty) : difficulty;
  return REWARD_VALUE_TABLE[effectiveDiff] || REWARD_VALUE_TABLE.easy;
}

// 旧API互換: ランク確率テーブル
function getRewardRankProbs(difficulty, isBlueGate) {
  const effectiveDiff = isBlueGate ? (BLUEGATE_DIFFICULTY_BONUS[difficulty] || difficulty) : difficulty;
  return REWARD_RANK_TABLE[effectiveDiff] || REWARD_RANK_TABLE.easy;
}

// ★Phase 5.1: 確率テーブルからvalue(1〜4)を抽選
function rollRewardValue(difficulty, isBlueGate) {
  const probs = getRewardValueProbs(difficulty, isBlueGate);
  const r = Math.random() * 100;
  if (r < probs.v1) return 1;
  if (r < probs.v1 + probs.v2) return 2;
  if (r < probs.v1 + probs.v2 + probs.v3) return 3;
  return 4;
}

// 旧API互換: ランク抽選(V1V2→common, V3→rare, V4→epic に集約)
function rollRewardRank(difficulty, isBlueGate) {
  const v = rollRewardValue(difficulty, isBlueGate);
  if (v <= 2) return 'common';
  if (v === 3) return 'rare';
  return 'epic';
}


// ============================================================
// ★Phase 5.4: アイテム → アイコンパス分類
// アイテムキー → "icons/icon_xxx.png" を返す
// ============================================================
function getItemIconPath(itemKey) {
  const item = ITEMS[itemKey];
  if (!item) return null;
  const color = item.color;
  const k = itemKey;

  // ===== ORANGE系 =====
  if (color === 'orange') {
    if (k === 'drumstick' || k === 'steak' || k === 'chicken') return 'icon/icon_orange_meat.png';
    if (k === 'apple' || k === 'pear' || k === 'pomegranate' || k === 'lucky_coin') return 'icon/icon_orange_fruit.png';
    // パン・パイ・スコーン・食事系
    if (k.includes('bread') || k.includes('meal') || k.includes('scone') || k.includes('pie')) return 'icon/icon_orange_food.png';
    // それ以外(ワイン/角笛/癒し/不死鳥/エール)
    return 'icon/icon_orange_special.png';
  }

  // ===== BLUE系 =====
  if (color === 'blue') {
    if (k.includes('helm') || k.includes('cap') || k.includes('skullcap')) return 'icon/icon_blue_head.png';
    if (k.includes('tunic') || k.includes('vest') || k.includes('cloak')) return 'icon/icon_blue_body.png';
    if (k.includes('glove') || k.includes('boot') || k.includes('sandal') || k.includes('belt')) return 'icon/icon_blue_accessory.png';
    return 'icon/icon_blue_body.png'; // フォールバック
  }

  // ===== PINK系 =====
  if (color === 'pink') {
    if (k.includes('parchment') || k.includes('book')) return 'icon/icon_pink_book.png';
    if (k.includes('stone')) return 'icon/icon_pink_stone.png';
    if (k.includes('emblem')) return 'icon/icon_pink_emblem.png';
    // それ以外(油/瓶/指輪/呪い人形/戦旗/鷹/連打/吸血の牙)
    return 'icon/icon_pink_arcane.png';
  }

  return null;
}
