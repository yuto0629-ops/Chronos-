const state = {
  selectedParty: null,
  party: [],         // クラスキー配列(初期メンバー、互換用)
  partyData: [],     // 各キャラの状態(HP, exp, level, equipped[])
  cleared: [],       // クリア済みミッションID(エリア単位)
  available: ['trivial_plain'],
  currentMission: null,
  inventory: [],     // 所持アイテム(itemKey配列)
  keys: { gold: 0, blue: 0 },   // ★Step1: 鍵の所持数(GOLD/BLUE)
  chestsOpened: [],             // ★Step1: 開封済み宝箱のミッションID
  routeFlags: {},               // ★Step1: ルート完走フラグ(blue_completed/gold_completed等)
  clearedSubMissions: [],       // ★段階1: クリア済みサブミッションID
  currentSubMissionId: null,    // ★段階1: 現在の戦闘で挑戦中のサブミッションID
  currentAreaBackup: null,      // ★段階1: サブミッション戦闘時のエリアデータバックアップ
};

function goTo(screen) {
  // charName未付与のメンバーがいれば自動付与(古いデータ対策)
  ensureCharNames();

  // ★FIX: 画面遷移時に過去の報酬/モーダルオーバーレイを完全クリーンアップ
  // (これをやらないと screen-battle 内に reward-overlay が残り、
  //  次の戦闘画面で表示された時に過去の報酬画面が見えてしまう)
  document.querySelectorAll(
    '.reward-overlay, .warrior-pick-overlay, .item-pick-overlay, .skill-modal-overlay, .battle-result, .xp-gain-overlay, .custom-party-overlay, .tavern-overlay'
  ).forEach(o => o.remove());

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screen}`);
  if (target) target.classList.add('active');
  if (screen === 'map') {
    renderMap();
  }
  if (screen === 'roster') {
    renderPartyHPOverview();
    renderRosterList();
  }
}

function ensureCharNames() {
  if (!state.partyData) return;
  const usedNames = state.partyData.map(p => p.charName).filter(Boolean);
  state.partyData.forEach(pd => {
    if (!pd.charName) {
      const newName = pickCharName(pd.classKey, usedNames);
      if (newName) {
        pd.charName = newName;
        usedNames.push(newName);
      }
    }
  });
}

// ====== マップ描画 ======
// ★Step1: 鍵カウンタを更新(画像src + 所持数)
function updateKeyCounters() {
  const goldImg = document.getElementById('key-icon-gold');
  const blueImg = document.getElementById('key-icon-blue');
  const goldCnt = document.getElementById('key-gold-count');
  const blueCnt = document.getElementById('key-blue-count');
  const goldWrap = document.getElementById('map-key-gold');
  const blueWrap = document.getElementById('map-key-blue');

  if (goldImg && SPRITES.key_gold) {
    goldImg.src = 'data:image/png;base64,' + SPRITES.key_gold;
  }
  if (blueImg && SPRITES.key_blue) {
    blueImg.src = 'data:image/png;base64,' + SPRITES.key_blue;
  }

  const gold = (state.keys && state.keys.gold) || 0;
  const blue = (state.keys && state.keys.blue) || 0;

  if (goldCnt) goldCnt.textContent = gold;
  if (blueCnt) blueCnt.textContent = blue;

  if (goldWrap) {
    goldWrap.classList.toggle('has-key', gold > 0);
    goldWrap.classList.toggle('empty', gold === 0);
  }
  if (blueWrap) {
    blueWrap.classList.toggle('has-key', blue > 0);
    blueWrap.classList.toggle('empty', blue === 0);
  }
}

function renderMap() {
  const mapArea = document.getElementById('map-area');
  if (!mapArea) return;

  // 防御的初期化
  if (!state.available) state.available = [];
  if (!state.cleared) state.cleared = [];
  if (!state.keys) state.keys = { gold: 0, blue: 0 };
  if (!state.chestsOpened) state.chestsOpened = [];
  if (!state.routeFlags) state.routeFlags = {};
  if (!state.clearedSubMissions) state.clearedSubMissions = [];

  // ★migration: 既存セーブで「サブミッション1つでもクリア済みなのにエリア未クリア」を救済
  // (旧仕様「全サブミッションクリアで初めてエリアクリア」のせいで詰んだ状態を解除)
  Object.values(MISSIONS).forEach(m => {
    if (m.missions && !state.cleared.includes(m.id)) {
      const hasAnyCleared = m.missions.some(sm => state.clearedSubMissions.includes(sm.id));
      if (hasAnyCleared) {
        state.cleared.push(m.id);
        state.available = state.available.filter(id => id !== m.id);
        (m.unlocks || []).forEach(unlockId => {
          if (!state.available.includes(unlockId) && !state.cleared.includes(unlockId)) {
            state.available.push(unlockId);
          }
        });
      }
    }
  });

  if (state.available.length === 0 && state.cleared.length === 0) {
    state.available = ['trivial_plain'];
  }

  // ★Step3: ACT1マップ画像を背景に設定(SPRITES.act1_map)
  if (SPRITES.act1_map && !mapArea.style.backgroundImage) {
    mapArea.style.backgroundImage = `url(data:image/jpeg;base64,${SPRITES.act1_map})`;
  }

  // ★Step1: 鍵カウンタの更新(画像src+所持数)
  updateKeyCounters();

  // 既存のノードを削除(SVGは残す)
  mapArea.querySelectorAll('.map-node').forEach(n => n.remove());

  // ノード描画
  Object.values(MISSIONS).forEach(m => {
    const node = document.createElement('div');
    node.className = 'map-node';
    node.style.left = m.x + '%';
    node.style.top = m.y + '%';

    let circleClass = 'locked';
    let icon = '?';
    let clickable = false;
    let needsKey = null;  // ★Step4: 鍵が必要だが足りない場合 ('gold' | 'blue')

    if (state.cleared.includes(m.id)) {
      circleClass = 'cleared';
      icon = '✓';
    } else if (state.available.includes(m.id)) {
      // ★Step4: 鍵チェック
      if (m.requiresKey) {
        const keyCount = (state.keys && state.keys[m.requiresKey]) || 0;
        if (keyCount > 0) {
          // 鍵あり: 通常通り進入可能
          circleClass = 'available';
          icon = '▶';
          clickable = true;
        } else {
          // 鍵不足: ロック表示 + クリック不可だが反応はする(警告トースト用)
          circleClass = 'key-locked ' + (m.requiresKey === 'gold' ? 'lock-gold' : 'lock-blue');
          icon = '🔒';
          clickable = true;  // クリック自体は受ける(警告のため)
          needsKey = m.requiresKey;
        }
      } else {
        // 鍵不要: 通常解放
        circleClass = 'available';
        icon = '▶';
        clickable = true;
      }
    }

    // ★段階1更新: バッジ(🍺🤝)は削除、ミッション選択画面で報酬わかるため
    let badge = '';

    // ★段階1: 宝箱バッジは削除(ミッション選択画面で報酬が見えるため不要)
    // 古いコードはコメントアウトで保持(後で復活する場合用)
    let chestBadge = '';

    // ★Step4: 鍵要求バッジ(必要な鍵がない時)
    let keyReqBadge = '';
    if (needsKey) {
      const keyImg = needsKey === 'gold' ? SPRITES.key_gold : SPRITES.key_blue;
      const colorClass = needsKey === 'gold' ? 'key-req-gold' : 'key-req-blue';
      keyReqBadge = `<div class="map-node-key-req ${colorClass}" title="${needsKey.toUpperCase()} KEY が必要">
        <img src="data:image/png;base64,${keyImg}" alt="${needsKey}">
      </div>`;
    }

    node.innerHTML = `
      <div class="map-node-circle ${circleClass}">${icon}</div>
      ${badge}
      ${keyReqBadge}
      <div class="map-node-label">${m.name_ja}</div>
    `;

    if (clickable) {
      if (needsKey) {
        // ★Step4: 鍵不足時はクリックで警告
        node.onclick = () => onKeyLockedNodeClick(m, needsKey);
      } else {
        node.onclick = () => enterBattle(m.id);
      }
    }
    mapArea.appendChild(node);
  });

  // エッジ(線)描画(layoutが確定してから)
  requestAnimationFrame(() => renderMapEdges());
}

// ====== マップのエッジ(接続線)描画 ======
function renderMapEdges() {
  const svg = document.getElementById('map-edges');
  if (!svg) return;
  svg.innerHTML = '';

  const mapArea = document.getElementById('map-area');
  const rect = mapArea.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);

  Object.values(MISSIONS).forEach(m => {
    m.unlocks.forEach(targetId => {
      const target = MISSIONS[targetId];
      if (!target) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', (m.x / 100) * w);
      line.setAttribute('y1', (m.y / 100) * h);
      line.setAttribute('x2', (target.x / 100) * w);
      line.setAttribute('y2', (target.y / 100) * h);

      // 線の色: 両方クリア=緑、起点クリア+終点解放=金、それ以外=デフォ
      if (state.cleared.includes(m.id) && state.cleared.includes(targetId)) {
        line.classList.add('cleared');
      } else if (state.cleared.includes(m.id) && state.available.includes(targetId)) {
        line.classList.add('available');
      }

      svg.appendChild(line);
    });
  });
}

// ====== ロスター画面: メンバー一覧 ======
function renderRosterList() {
  const container = document.getElementById('roster-list');
  if (!container) return;
  container.innerHTML = '';

  state.partyData.forEach((pd, idx) => {
    const cls = CLASSES[pd.classKey];
    const expPct = Math.min(100, (pd.exp / expRequired(pd.level)) * 100);

    const card = document.createElement('div');
    card.className = 'roster-card';
    const dispName = pd.charName ? pd.charName : cls.name_ja;
    card.innerHTML = `
      <div class="roster-card-sprite">
        <img src="data:image/png;base64,${SPRITES[pd.classKey]}">
      </div>
      <div class="roster-card-info">
        <div class="roster-card-name">${dispName} <span style="color:#d4a020">Lv${pd.level}</span></div>
        <div style="font-size: 9px; color: #a8956e; margin-bottom: 2px;">${cls.name_ja}</div>
        <div class="roster-card-stats">
          HP ${pd.hp}/${pd.maxHP}<br>
          XP ${pd.exp}/${expRequired(pd.level)}<br>
          装備 ${pd.equipped.length}/3
        </div>
      </div>
    `;
    card.onclick = () => {
      charDetailIdx = idx;
      selectedItemSlotIdx = -1;
      renderCharDetail();
    };
    container.appendChild(card);
  });
}

// 編成画面のボタン経由でキャラ詳細を開く(現在の選択キャラ or 1人目)
function openCharDetailFromRoster() {
  charDetailIdx = 0;
  selectedItemSlotIdx = -1;
  renderCharDetail();
}

// ====== パーティHP概観 ======
function renderPartyHPOverview() {
  const container = document.getElementById('party-hp-overview');
  if (!container) return;
  container.innerHTML = '';

  state.partyData.forEach(pd => {
    const cls = CLASSES[pd.classKey];
    const hpPct = (pd.hp / pd.maxHP) * 100;
    let fillClass = '';
    if (hpPct < 30) fillClass = 'critical';
    else if (hpPct < 60) fillClass = 'low';

    // 次Lv必要EXP
    const nextExp = expRequired(pd.level);
    const expPct = Math.min(100, (pd.exp / nextExp) * 100);

    const displayName = pd.charName ? pd.charName : cls.name_ja;
    const item = document.createElement('div');
    item.className = 'party-hp-item';
    item.innerHTML = `
      <div class="party-hp-sprite">
        <img src="data:image/png;base64,${SPRITES[pd.classKey]}">
      </div>
      <div class="party-hp-text" style="font-size: 9px;">${displayName} <span style="color:#d4a020">Lv${pd.level}</span></div>
      <div class="party-hp-text" style="font-size: 8px; color:#a8956e;">${cls.name_ja}</div>
      <div class="party-hp-mini-bar">
        <div class="party-hp-mini-fill ${fillClass}" style="width: ${hpPct}%"></div>
      </div>
      <div class="party-hp-text">${pd.hp}/${pd.maxHP}</div>
    `;
    container.appendChild(item);
  });
}

function renderPartyOptions() {
  const container = document.getElementById('party-options');
  container.innerHTML = '';

  Object.entries(STARTER_PARTIES).forEach(([key, p]) => {
    const opt = document.createElement('div');
    opt.className = 'party-option';
    opt.dataset.key = key;

    const tagsHTML = p.playstyle.map(t => `<span class="party-tag">${t}</span>`).join('');

    let memberDisplayHTML;
    if (p.isCustom) {
      // カスタムパーティ: 3つのクエスチョンマークを表示
      memberDisplayHTML = [0, 1, 2].map(i => `
        ${i > 0 ? '<div class="party-member-plus">+</div>' : ''}
        <div class="party-member-block">
          <div class="party-member-portrait" style="display:flex;align-items:center;justify-content:center;background:rgba(255,200,80,0.15);border:1px dashed #d4a020;font-size:24px;color:#d4a020;font-weight:bold;">?</div>
          <div class="party-member-name" style="color:#d4a020;">選択</div>
        </div>
      `).join('');
    } else {
      memberDisplayHTML = p.members.map((m, i) => {
        const c = CLASSES[m];
        return `
          ${i > 0 ? '<div class="party-member-plus">+</div>' : ''}
          <div class="party-member-block">
            <div class="party-member-portrait">
              <img src="data:image/png;base64,${SPRITES[m]}" alt="${c.name_en}">
            </div>
            <div class="party-member-name">${c.name_ja}</div>
          </div>
        `;
      }).join('');
    }

    opt.innerHTML = `
      <div class="party-name-block">
        <div class="party-name-en">${p.name_en}</div>
        <div class="party-name-ja">${p.name_ja}</div>
        <div class="party-tagline">${p.tagline}</div>
      </div>
      <div class="party-members-display">${memberDisplayHTML}</div>
      <div class="party-description">${p.description}</div>
      <div class="party-tags">${tagsHTML}</div>
    `;

    opt.onclick = () => selectParty(key);
    container.appendChild(opt);
  });
}

function selectParty(key) {
  state.selectedParty = key;
  document.querySelectorAll('.party-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.key === key);
  });
  document.getElementById('confirm-btn').disabled = false;
}

function confirmParty() {
  if (!state.selectedParty) return;

  // ★FIX: 「既にパーティ確定&クリア進行中なら…」の早期return分岐を削除。
  // この分岐が原因で、2回目以降のNEW GAMEで stateリセットがスキップされ、
  // clearedSubMissions などが残って「再戦扱い」になっていた。
  // NEW GAMEは常にフルリセットする方針に統一。

  // ★カスタムパーティの場合: 3体選択モーダルを開く
  if (STARTER_PARTIES[state.selectedParty].isCustom) {
    showCustomPartyPicker();
    return;
  }

  state.party = [...STARTER_PARTIES[state.selectedParty].members];

  const usedNames = [];
  state.partyData = state.party.map(classKey => {
    const cls = CLASSES[classKey];
    const lv = 1;
    const maxHP = cls.hp_base + (cls.hp_per_level * (lv - 1));
    // ★Phase 1: 初期習得スキルのみLv1、残りはLv0(未習得)
    const skillLevels = buildInitialSkillLevels(classKey);
    // ★Phase 3 B-1: スキルLv合計 = Lv + 2 (原作仕様)
    const initialSkillCount = Object.values(skillLevels).filter(l => l > 0).length;
    const skillPoints = Math.max(0, (lv + 2) - initialSkillCount);
    const charName = pickCharName(classKey, usedNames);
    if (charName) usedNames.push(charName);
    return {
      classKey,
      charName,
      level: lv,
      hp: maxHP,
      maxHP: maxHP,
      exp: 0,
      equipped: [],
      skillPoints,
      skillLevels,
      passiveLevel: 1,
    };
  });

  state.cleared = [];
  state.available = ['trivial_plain'];
  state.inventory = [];
  // ★FIX: 新規ゲーム時に漏れていたstateリセット項目を追加
  state.clearedSubMissions = [];
  state.keys = { gold: 0, blue: 0 };
  state.chestsOpened = [];
  state.routeFlags = {};
  state.currentSubMissionId = null;
  state.currentAreaBackup = null;
  state.currentMission = null;

  goTo('map');
}

// ★カスタムパーティ選択モーダル
function showCustomPartyPicker() {
  // 既存モーダル削除
  const existing = document.querySelector('.custom-party-overlay');
  if (existing) existing.remove();

  // 選択可能なクラス(コヨーテ・アナグマ・サーペントは敵専用なので除外)
  const playableClasses = [
    'champion', 'barbarian', 'monk', 'knight', 'gladiator', 'archer',
    'rocketeer', 'jungleman', 'alchemist', 'beastmaster', 'ranger',
    'healer', 'hound',
  ];

  const overlay = document.createElement('div');
  overlay.className = 'custom-party-overlay';
  overlay.innerHTML = `
    <div class="custom-party-modal">
      <div class="custom-party-title">テスト編成: 3体選択</div>
      <div class="custom-party-selected" id="custom-selected">
        <div class="custom-slot empty" data-slot="0"><span>?</span></div>
        <div class="custom-slot empty" data-slot="1"><span>?</span></div>
        <div class="custom-slot empty" data-slot="2"><span>?</span></div>
      </div>
      <div class="custom-party-grid" id="custom-grid"></div>
      <div class="custom-party-buttons">
        <button class="btn" onclick="closeCustomPartyPicker()">キャンセル</button>
        <button class="btn btn-primary" id="custom-confirm-btn" onclick="confirmCustomParty()" disabled>戦闘開始</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // クラスグリッド描画
  const grid = overlay.querySelector('#custom-grid');
  playableClasses.forEach(classKey => {
    const cls = CLASSES[classKey];
    const card = document.createElement('div');
    card.className = 'custom-class-card';
    card.dataset.classKey = classKey;
    card.innerHTML = `
      <div class="custom-class-portrait">
        <img src="data:image/png;base64,${SPRITES[classKey]}" alt="${cls.name_en}">
      </div>
      <div class="custom-class-name">${cls.name_ja}</div>
      <div class="custom-class-role">${cls.role}</div>
    `;
    card.onclick = () => toggleCustomClass(classKey);
    grid.appendChild(card);
  });

  // 選択状態を初期化
  if (!window._customPartySelection) window._customPartySelection = [];
  refreshCustomPartyUI();
}

function toggleCustomClass(classKey) {
  if (!window._customPartySelection) window._customPartySelection = [];
  const sel = window._customPartySelection;
  const idx = sel.indexOf(classKey);
  if (idx >= 0) {
    // 選択解除
    sel.splice(idx, 1);
  } else if (sel.length < 3) {
    // 追加
    sel.push(classKey);
  }
  refreshCustomPartyUI();
}

function refreshCustomPartyUI() {
  const sel = window._customPartySelection || [];
  // 選択スロット表示更新
  for (let i = 0; i < 3; i++) {
    const slot = document.querySelector(`.custom-slot[data-slot="${i}"]`);
    if (!slot) continue;
    if (sel[i]) {
      const cls = CLASSES[sel[i]];
      slot.classList.remove('empty');
      slot.innerHTML = `
        <img src="data:image/png;base64,${SPRITES[sel[i]]}" alt="${cls.name_en}">
        <div class="custom-slot-name">${cls.name_ja}</div>
      `;
    } else {
      slot.classList.add('empty');
      slot.innerHTML = '<span>?</span>';
    }
  }
  // クラスカードのselected状態更新
  document.querySelectorAll('.custom-class-card').forEach(card => {
    const isSelected = sel.includes(card.dataset.classKey);
    card.classList.toggle('selected', isSelected);
  });
  // 戦闘開始ボタン
  const btn = document.getElementById('custom-confirm-btn');
  if (btn) btn.disabled = sel.length !== 3;
}

function closeCustomPartyPicker() {
  const overlay = document.querySelector('.custom-party-overlay');
  if (overlay) overlay.remove();
  window._customPartySelection = [];
}

function confirmCustomParty() {
  const sel = window._customPartySelection || [];
  if (sel.length !== 3) return;

  state.party = [...sel];
  const usedNames = [];
  state.partyData = state.party.map(classKey => {
    const cls = CLASSES[classKey];
    const lv = 1;
    const maxHP = cls.hp_base + (cls.hp_per_level * (lv - 1));
    // ★Phase 1: 初期習得スキルのみLv1、残りはLv0(未習得)
    const skillLevels = buildInitialSkillLevels(classKey);
    // ★Phase 3 B-1: スキルLv合計 = Lv + 2 (原作仕様)
    const initialSkillCount = Object.values(skillLevels).filter(l => l > 0).length;
    const skillPoints = Math.max(0, (lv + 2) - initialSkillCount);
    const charName = pickCharName(classKey, usedNames);
    if (charName) usedNames.push(charName);
    return {
      classKey,
      charName,
      level: lv,
      hp: maxHP,
      maxHP: maxHP,
      exp: 0,
      equipped: [],
      skillPoints,
      skillLevels,
      passiveLevel: 1,
    };
  });

  state.cleared = [];
  state.available = ['trivial_plain'];
  state.inventory = [];
  // ★FIX: 新規ゲーム時に漏れていたstateリセット項目を追加(custom版)
  state.clearedSubMissions = [];
  state.keys = { gold: 0, blue: 0 };
  state.chestsOpened = [];
  state.routeFlags = {};
  state.currentSubMissionId = null;
  state.currentAreaBackup = null;
  state.currentMission = null;

  closeCustomPartyPicker();
  goTo('map');
}

function updatePartyMini() {
  const mini = document.getElementById('party-mini');
  mini.innerHTML = '';
  state.party.forEach(key => {
    const slot = document.createElement('div');
    slot.className = 'party-mini-slot';
    slot.title = CLASSES[key].name_ja;
    slot.innerHTML = `<img src="data:image/png;base64,${SPRITES[key]}">`;
    mini.appendChild(slot);
  });
}



// ★Step4: 鍵不足のノードをクリックした時の警告
function onKeyLockedNodeClick(mission, keyType) {
  const keyName = keyType === 'gold' ? 'GOLD KEY' : 'BLUE KEY';
  const colorStyle = keyType === 'gold' ? 'color:#ffd770' : 'color:#88ddff';
  // 警告トースト
  if (typeof addLogEquipToast === 'function') {
    addLogEquipToast(`🔒 ${keyName} が必要です`);
  } else {
    alert(`${keyName} が必要です`);
  }
}

// ====== ★段階1: ミッション選択画面 ======

// 難易度ラベル変換
function difficultyLabel(diff) {
  return ({ easy: 'Very Low', medium: 'Medium', hard: 'High' })[diff] || diff;
}

// 報酬種別の絵文字+色情報
function rewardBadge(type) {
  if (type === 'warrior')     return { cls: 'reward-warrior', label: '👤', title: 'Warrior 報酬' };
  if (type === 'key')         return { cls: 'reward-key',     label: '🔑', title: 'Key 報酬' };
  if (type === 'item')        return { cls: 'reward-item',    label: '📦', title: 'Item 報酬' };
  if (type === 'add_skill')   return { cls: 'reward-skill',   label: '📜', title: 'Skill 報酬' };
  if (type === 'extra_exp')   return { cls: 'reward-exp',     label: '⭐', title: 'EXP 報酬' };
  if (type === 'starter_pack') return { cls: 'reward-starter', label: '🎁', title: 'Starter Pack' };
  return { cls: '', label: '?', title: '報酬' };
}

// 難易度バッジ情報
function difficultyBadge(diff) {
  if (diff === 'easy')   return { cls: 'diff-easy',   label: 'E', title: '難易度: Easy' };
  if (diff === 'medium') return { cls: 'diff-medium', label: 'M', title: '難易度: Medium' };
  if (diff === 'hard')   return { cls: 'diff-hard',   label: 'H', title: '難易度: Hard' };
  return { cls: '', label: '?', title: '難易度' };
}

// ミッション選択画面を表示
function showMissionSelect(areaId) {
  currentArea = areaId;
  currentSubMission = null;
  goTo('mission-select');
  renderMissionSelectScreen();
}

// 画面の中身を描画
function renderMissionSelectScreen() {
  const area = MISSIONS[currentArea];
  if (!area) return;

  // エリア名
  const titleEl = document.getElementById('ms-area-title');
  if (titleEl) titleEl.textContent = area.name_ja || area.name || 'エリア';

  // ミッションリスト
  const listEl = document.getElementById('ms-mission-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const missions = area.missions || [];
  missions.forEach((m, idx) => {
    const isCleared = (state.clearedSubMissions || []).includes(m.id);

    const item = document.createElement('div');
    item.className = 'ms-mission-item' + (isCleared ? ' cleared' : '');
    item.dataset.idx = idx;

    const diffBadge = difficultyBadge(m.difficulty);
    const rewBadge = rewardBadge(m.rewardType);

    // クリア済みなら✓表示、未だなら難易度+報酬バッジ
    let badgesHTML;
    if (isCleared) {
      badgesHTML = `<span class="ms-mission-badge" style="background:#4a8;color:#fff;">✓</span>`;
    } else {
      badgesHTML = `
        <span class="ms-mission-badge ${diffBadge.cls}" title="${diffBadge.title}">${diffBadge.label}</span>
        <span class="ms-mission-badge ${rewBadge.cls}" title="${rewBadge.title}">${rewBadge.label}</span>
      `;
    }

    item.innerHTML = `
      <span class="ms-mission-name">${m.name_ja || m.name}</span>
      <span class="ms-mission-badges">${badgesHTML}</span>
    `;

    // ★段階1: クリア済みはクリック不可(レベル上げ防止)
    if (!isCleared) {
      item.onclick = () => selectMissionInArea(idx);
    } else {
      item.onclick = () => {
        if (typeof addLogEquipToast === 'function') {
          addLogEquipToast('クリア済みのミッション');
        }
      };
    }
    listEl.appendChild(item);
  });

  // 詳細パネルは初期状態
  showMissionDetail(null);
}

// ミッション選択時
function selectMissionInArea(idx) {
  const area = MISSIONS[currentArea];
  if (!area || !area.missions) return;
  const m = area.missions[idx];
  if (!m) return;

  currentSubMission = m;

  // ハイライト切替
  document.querySelectorAll('.ms-mission-item').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.idx) === idx);
  });

  showMissionDetail(m);

  // Acceptボタンを有効化(クリア済みなら無効)
  const acceptBtn = document.getElementById('ms-accept-btn');
  if (acceptBtn) {
    const isCleared = (state.clearedSubMissions || []).includes(m.id);
    acceptBtn.disabled = isCleared;
    acceptBtn.textContent = isCleared ? 'Cleared ✓' : 'Accept ▶';
  }
}

// 詳細パネル更新
function showMissionDetail(m) {
  const titleEl = document.getElementById('ms-detail-title');
  const descEl = document.getElementById('ms-detail-desc');
  const statsEl = document.getElementById('ms-detail-stats');

  if (!m) {
    if (titleEl) titleEl.textContent = 'ミッション選択';
    if (descEl)  descEl.textContent  = '左のリストからミッションを選んでください。';
    if (statsEl) statsEl.innerHTML   = '';
    return;
  }

  if (titleEl) titleEl.textContent = m.name_ja || m.name;
  if (descEl)  descEl.textContent  = m.description || '';

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-row"><span class="stat-label">Battle Type</span><span class="stat-value">${m.battleType || 'Basic'}</span></div>
      <div class="stat-row"><span class="stat-label">Enemy Warriors</span><span class="stat-value">${(m.enemies || []).length}</span></div>
      <div class="stat-row"><span class="stat-label">Player Warriors</span><span class="stat-value">${m.playerSlots || 1}</span></div>
      <div class="stat-row"><span class="stat-label">Difficulty</span><span class="stat-value">${difficultyLabel(m.difficulty)}</span></div>
      <div class="stat-row"><span class="stat-label">Reward</span><span class="stat-value">${(rewardBadge(m.rewardType).title || '')}</span></div>
    `;
  }
}

// Accept: 選択中のサブミッションで戦闘開始
function acceptSelectedMission() {
  if (!currentArea || !currentSubMission) return;
  const area = MISSIONS[currentArea];
  if (!area) return;

  // 段階2では戦闘前準備画面に行くが、今は直接戦闘へ
  // サブミッションの enemies を一時的にエリアに上書きしてから戦闘へ
  const subM = currentSubMission;
  // 元データをバックアップして書き戻し用
  const backup = {
    enemies: area.enemies,
    chest: area.chest,
  };
  area.enemies = subM.enemies;
  if (subM.chest) area.chest = subM.chest;

  // currentMission をエリアIDのまま使い、戦闘終了時に元に戻す
  state.currentMission = currentArea;
  state.currentSubMissionId = subM.id;  // クリア記録用
  state.currentAreaBackup = backup;     // 戦闘終了時の復元用

  initBattle(currentArea);
  goTo('battle');
}


renderPartyOptions();
