# Phase 3 仕様書 - 原作Tactical Warrior準拠化計画

**作成日**: 2026-05-07
**ベース資料**: 攻略wiki「小ネタ」(2011-10-26)
**目的**: フィーリングで実装してた仕様を、原作の正確な数式に揃える

---

## 📋 全体方針

Phase 1 (スキル習得) と Phase 2 (バランス調整) で「だいたい原作っぽい」ところまで来たので、Phase 3 では **数式や仕様を原作通りに精密化** する。

各項目を**独立した小タスク**に分けて段階実装する(v4.0の失敗を避けるため)。

---

## 🔴 優先度A: 戦闘の根幹に関わる仕様

### A-1. MaxST計算式の動的化

**現状の問題**:
- `data_game.js` の各クラスに固定の `st_override` を持つことで MaxST を決めてる
- スキル育成で MaxST が増えない = 育成の楽しみ半減

**原作仕様**:
```
最大ST = 70(初期値) + (2番目に高いAttackスキルLv × 2)
                   + (3番目に高いAttackスキルLv × 4)
                   + (4番目に高いAttackスキルLv × 6)
```

**重要なポイント**:
- 1番目に高いスキルLvは加算されない
- 1個のスキルだけ上げてもST一切上がらない(平均育成が重要!)
- Coyote/Serpentはスキル3個しかないので必然的にST低い
- Passiveスキルは関係ない

**計算例**:
| スキルLv構成 | 並び替え | 計算 | MaxST |
|---|---|---|---|
| 1個Lv1 | 1 | 70 | 70 |
| 1,3,1,3 | 3,3,1,1 | 70+6+4+6 | 86 |
| 3,3,3,3 | 3,3,3,3 | 70+6+12+18 | 106 |
| 5,6,7,8 | 8,7,6,5 | 70+14+24+30 | 138 |

**実装イメージ**:
```js
function calcMaxST(skillLevels, skills) {
  // Attack系スキル(damage > 0)のレベルだけ抽出
  const atkLevels = skills
    .map((s, i) => ({ skill: s, lv: skillLevels[i] || 0 }))
    .filter(x => x.skill.damage > 0)
    .map(x => x.lv)
    .sort((a, b) => b - a);  // 降順

  let maxST = 70;
  if (atkLevels[1]) maxST += atkLevels[1] * 2;
  if (atkLevels[2]) maxST += atkLevels[2] * 4;
  if (atkLevels[3]) maxST += atkLevels[3] * 6;
  return maxST;
}
```

**影響範囲**:
- `makeUnit()`(battle.js)
- `data_game.js` の各クラスの `st_override` 削除
- 全キャラのMaxST再計算 → 戦闘テンポ激変

**注意**:
- ボス(bandit_boss)は固定値のままにする(`st_override` 残す)
- 一部の動物クラス(Coyote/Serpent)は意図的にST低くなる

---

### A-2. ST回復量の正確化

**現状の問題**:
- ターン開始時の回復量が不明
- 行動による減衰/回復の差別化なし(かもしれない)

**原作仕様**:
| 行動 | ST変動 |
|---|---|
| ターン始め | **+20** |
| その場待機 | **+20** (HPも少量回復) |
| 移動して待機 | **+15** |
| ダッシュして待機 | **+5** |
| ダッシュする | **-35** |

**実装イメージ**:
```js
// ターン開始時(全味方一律)
function onTurnStart(unit) {
  unit.st = Math.min(unit.maxST, unit.st + 20);
}

// 行動終了時の処理
function onUnitEndAction(unit) {
  if (unit.hasDashed && unit.hasMoved) {
    // ダッシュ消費: -35 (実行時に既に引かれてる想定)
    unit.st = Math.max(0, unit.st - 35);
  } else if (unit.hasDashed) {
    // ダッシュ後待機: +5
    unit.st = Math.min(unit.maxST, unit.st + 5);
  } else if (unit.hasMoved) {
    // 移動後待機: +15
    unit.st = Math.min(unit.maxST, unit.st + 15);
  } else {
    // その場待機: +20 (HP回復も)
    unit.st = Math.min(unit.maxST, unit.st + 20);
    // HP回復: 4 + Lvの十の位
    const hpRegen = 4 + Math.floor(unit.level / 10);
    unit.hp = Math.min(unit.maxHP, unit.hp + hpRegen);
  }
}
```

**注意**:
- 既存の戦闘フローと整合性取る必要あり
- 「待機ボタン」の意味が変わる(回復のために積極的に押す価値が出る)

---

### A-3. 装備の単発攻撃補正を連撃に乗せない

**現状の問題**:
- `stone_strength`(+7)などの単発攻撃補正が、Pummel(連撃5回)に各撃に乗ってる
- バグ的挙動で、連撃キャラだけ装備で異常強化される

**原作仕様**:
> 単発攻撃の攻撃力アイテム(stone系)は、連撃に乗らない

**実装方針**:
```js
// 現状: equipDmgBonus が全攻撃に乗る
let baseDamage = (skill.damage + atkBoost + equipDmgBonus) * passiveDmgMul;

// 修正後: 単発スキルのみ singleDmg を加算、連撃は allDmg のみ
let singleDmg = (skill.hits === 1) ? equipBonus.singleDmg : 0;
let allDmg = equipBonus.allDmg;
let baseDamage = (skill.damage + atkBoost + singleDmg + allDmg) * passiveDmgMul;
```

**ITEMS のフィールド分離**:
- `single_dmg`: 単発のみに適用(stone_strength, stone_might, stone_power)
- `all_dmg`: 全攻撃に適用(emblem_swords)

→ 既に data_items.json はこの構造になってるので、battle.js 側の参照を直すだけ。

**影響範囲**:
- battle.js のダメージ計算1箇所
- Pummel等の連撃バランスが激変

---

## 🟡 優先度B: 仕様の精密化

### B-1. 仲間のスキルLv合計 = キャラLv + 2

**現状**: `skillPoints = level - 1` で振り分け
**原作**: スキルLv合計 = キャラLv + 2

**例**:
| キャラLv | 現状の振り分け可能合計 | 原作の合計 |
|---|---|---|
| Lv1 | 0(Lv1スキル1個=合計1?) | **Lv2**(2個Lv1なら合計2) |
| Lv4 | 3 | **Lv6** |
| Lv10 | 9 | **Lv12** |

**実装**:
```js
// 仲間生成時のSP計算
const totalSkillLv = lv + 2;  // ★Phase3
const initialSkillCount = ownedSkills.length;  // 持ってるスキル数(初期Lv1分)
const skillPoints = totalSkillLv - initialSkillCount;
```

**影響**:
- 仲間が今より少しだけ強い(2レベル分余裕がある)
- 自軍も強くなるので、敵レベルも調整が必要かも

---

### B-2. 待機時のHP回復 = 4 + Lv十の位

**A-2 で同時実装済み** の想定だが、独立タスクとしてもOK。

```js
const hpRegen = 4 + Math.floor(unit.level / 10);
```

| Lv | HP回復量 |
|---|---|
| Lv1-9 | 4 |
| Lv10-19 | 5 |
| Lv20-29 | 6 |
| Lv30-39 | 7 |

---

### B-3. 撃破経験値の正確な分配

**現状**: 全敵のEXPを均等分配?
**原作**:
- 撃破した本人にだけ加算(複数で倒したら均等)
- 倒された後でも、それまで倒した敵のEXPはちゃんと加算

**実装は複雑** なので、Phase 3 後半 or Phase 4 で。

---

### B-4. 生存ボーナスの正確な分配

**現状**: 全員に固定値
**原作**: バトル設定の固定値を、生き残った人数で**分配**

```js
// 原作仕様
const survivalBonus = Math.floor(missionSurvivalPool / aliveCount);
aliveUnits.forEach(u => u.exp += survivalBonus);
```

**意味合い**:
- 生存人数が多いほど1人当たりは少ない
- 戦死キャラが多いほど、生き残った人は経験値多くもらえる
- =「経験値分配」の発想

---

## 🟢 優先度C: コンテンツ拡充

### C-1. 全クラス6スキルへの拡張

**現状**: 各クラス3スキル(初期2 + 未習得1)
**原作**: 各クラス6-7スキル(参考: 仕様書の各クラス詳細)

**作業量**: 16クラス × 3スキル追加 = 48個のスキル追加
- スキル名/効果/数値設計
- アイコン/ピクセル素材
- バランス調整

**Phase 3.5 とかで分けて実装する規模**

---

### C-2. パッシブスキルの複数化(最大4個)

**現状**: 各クラス1個のパッシブ
**原作**: 4個のパッシブ枠、Lv28で4個目にレアスキル枠

**作業量**: クラス × 3個追加 = 48個

---

### C-3. スキル振り直しショップ(Retraining)

**仕様**: ゴールド(?)を払ってスキルポイント振り直し
**実装場所**: 酒場跡の追加機能 or 村のショップ

---

### C-4. Lv28レアスキル枠

C-2のサブ機能。Lv28以降で4番目のパッシブが特殊なスキルになる。

---

## 🔵 優先度D: 戦闘システム拡張

### D-1. 障害物オブジェクト

**仕様**: 戦闘マップに置ける移動阻害オブジェクト
- 石の山(壊せない)
- タル/木箱(壊せる、内部にアイテム?)
- 倒木(壊せない)

**実装**:
- `map[y][x].obstacle` フィールド追加
- 移動ロジックで通行不可判定
- 攻撃ロジックで破壊可能オブジェクト処理

---

### D-2. 鍵を使うゲートの開錠モーダル

**仕様**(画像2参照):
- ゲート名
- 「先のステージ」の説明文
- 「ゲートを開けますか?」 ✓ / ✗
- 鍵の所持数表示(青/金)

**実装**:
- マップで鍵付きステージをタップ → 開錠モーダル表示
- 鍵を消費して unlock リスト追加

---

### D-3. 旗バトル(Flagsモード)

**仕様**(画像7参照):
- 殲滅でなく**敵の旗を全破壊**で勝利
- **倒された仲間が一定ターン後に復活**(自軍陣地に)
- 塔(旗の周り)は遠距離に強い、近接に弱い

**実装規模**: 大きい(新battleType + 復活システム + 旗ヘルス管理)

---

### D-4. Wavesバトル(連戦モード)

**仕様**:
- 一定ターン後に新たな敵が出現
- 全Wave凌いで全滅で勝利
- 長丁場、回復手段重要

**Phase 4 規模**

---

## 📅 推奨実装順序

```
[Phase 3.0] 数式精密化(コードのみ、データ変更最小)
  ├─ A-3. 装備単発補正バグ修正(Pummel問題の根本解決)
  ├─ A-2. ST回復量精密化
  └─ B-2. 待機HP回復(A-2と同時)

[Phase 3.1] MaxST動的化(挙動が大きく変わる)
  ├─ A-1. MaxST計算式
  └─ data_game.js の st_override 整理

[Phase 3.2] 仲間バランス調整
  └─ B-1. スキルLv合計 = Lv + 2

[Phase 3.3] 経験値の精密化
  ├─ B-3. 撃破EXPの分配
  └─ B-4. 生存ボーナス分配

[Phase 3.4] ゲート開錠UI
  └─ D-2. 鍵モーダル

[Phase 3.5] 障害物
  └─ D-1. 戦闘マップにオブジェクト

[Phase 4 以降]
  ├─ C-1. 全クラス6スキル
  ├─ C-2. パッシブ4個
  ├─ C-3. リトレーニング
  ├─ C-4. Lv28レア枠
  ├─ D-3. 旗バトル
  └─ D-4. Wavesバトル
```

---

## ⚠️ 実装時の注意

### v4.0の失敗を繰り返さないために
- **必ず1タスクずつ**実装→動作確認→次へ
- 大きな数式変更(A-1, A-2)は他の変更と混ぜない
- 動作確認は新規パーティで(古いセーブ状態を引きずらない)

### バランス崩壊の予兆
- A-1適用後、全キャラのSTが激減(1スキルしか上げてないキャラは MaxST 70のまま)
  → ステージ難易度の見直し必要かも
- A-3適用後、Pummel/Throwing Knives/連打系の威力が大幅減
  → 連撃スキル使ってたパーティは大幅に弱体化

### 既存セーブとの互換性
- MaxST計算式変更は、既存パーティの全キャラを再計算する必要あり
- 戦闘途中のセーブには影響しないが、編成画面で変動する

---

## 🎯 まずはここから

**最初の1タスク**は **A-3 (装備単発補正バグ修正)** がおすすめ:
- 影響範囲が局所的(ダメージ計算1箇所)
- 効果が即体感できる(Pummel問題が直る)
- 失敗しても元に戻しやすい
- 原作仕様通りになる

次に **A-2 (ST回復量)** で戦闘テンポを原作風に。

A-1 (MaxST動的化) は最後。一番影響でかい。

---

## 📚 参考資料

- 攻略wiki「小ネタ」(2011-10-26)
- 原作Tactical Warrior プレイ動画/スクショ
- ChronosⅣ プロジェクトの既存実装

---

**END OF PHASE 3 仕様書**
