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

// ★Phase3 v9: 透明ノードCSSを注入(初回のみ)
function ensureTransparentNodeStyles() {
  if (document.getElementById('phase3v9-styles')) return;
  const css = `
    /* 透明タップ判定 (画像のオブジェクトの上に重ねる円形ヒットエリア) */
    .map-node.map-node-transparent {
      position: absolute;
      width: 6%;
      height: 9.6%;
      transform: translate(-50%, -50%);
      z-index: 4;
      cursor: pointer;
      user-select: none;
      pointer-events: auto;
      border-radius: 50%;
      transition: all 0.2s ease;
    }
    /* 解放済み: 淡い金色glow + 脈動 */
    .map-node.map-node-transparent.available {
      box-shadow: 0 0 12px 4px rgba(255, 220, 80, 0.5),
                  inset 0 0 8px 2px rgba(255, 220, 80, 0.3);
      animation: map-node-pulse 2s ease-in-out infinite;
    }
    @keyframes map-node-pulse {
      0%, 100% { box-shadow: 0 0 12px 4px rgba(255, 220, 80, 0.5),
                             inset 0 0 8px 2px rgba(255, 220, 80, 0.3); }
      50%      { box-shadow: 0 0 20px 6px rgba(255, 220, 80, 0.8),
                             inset 0 0 12px 3px rgba(255, 220, 80, 0.5); }
    }
    /* クリア済み: 微かな緑glow */
    .map-node.map-node-transparent.cleared {
      box-shadow: 0 0 8px 2px rgba(80, 220, 80, 0.4);
    }
    /* 鍵不足: 赤い枠 */
    .map-node.map-node-transparent.key-locked {
      box-shadow: 0 0 8px 2px rgba(255, 80, 80, 0.5);
    }
    /* 状態オーバーレイ(✓ や 🔒 を右上に小さく) */
    .map-node-overlay {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 22px;
      height: 22px;
      background: rgba(0, 0, 0, 0.75);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: #fff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.6);
      z-index: 5;
    }
    .map-node-overlay-cleared { color: #6f6; }
    .map-node-overlay-locked { font-size: 12px; }
  `;
  const style = document.createElement('style');
  style.id = 'phase3v9-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

function renderMap() {
  const mapArea = document.getElementById('map-area');
  if (!mapArea) return;

  // ★Phase3 v9: 透明ノードCSSを注入(1回だけ)
  ensureTransparentNodeStyles();

  // 防御的初期化
  if (!state.available) state.available = [];
  if (!state.cleared) state.cleared = [];
  if (!state.keys) state.keys = { gold: 0, blue: 0 };
  if (!state.chestsOpened) state.chestsOpened = [];
  if (!state.routeFlags) state.routeFlags = {};
  if (!state.clearedSubMissions) state.clearedSubMissions = [];

  // ★Phase3 migration: 旧ID → 新ID 置換 (tavern→bear_cave, ruins→academy, temple→sandy_shore)
  // 過去のセーブ状態でこれらのIDが残ってる場合に救済
  const ID_RENAME = {
    'tavern': 'bear_cave',
    'ruins': 'academy',
    'temple': 'sandy_shore',
  };
  state.available = state.available.map(id => ID_RENAME[id] || id);
  state.cleared = state.cleared.map(id => ID_RENAME[id] || id);
  // 重複排除
  state.available = [...new Set(state.available)];
  state.cleared = [...new Set(state.cleared)];
  // available に既に cleared なIDが入ってたら除外
  state.available = state.available.filter(id => !state.cleared.includes(id));

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

  // ★Phase3 v2: マップを画面いっぱいに拡大(上下ヘッダー以外全部マップ)
  // CSSで .map-area の高さが固定されてても、インラインstyleで上書き
  applyFullscreenMapLayout();

  // ★Step1: 鍵カウンタの更新(画像src+所持数)
  updateKeyCounters();

  // ★Phase3 v4: ノードと装飾は viewport 内に描画(パン/ズーム対象)
  const nodeContainer = document.getElementById('map-viewport') || mapArea;
  
  // 既存のノードを削除(SVGは残す)
  nodeContainer.querySelectorAll('.map-node').forEach(n => n.remove());

  // ノード描画
  Object.values(MISSIONS).forEach(m => {
    const node = document.createElement('div');
    node.className = 'map-node map-node-transparent';  // ★Phase3 v9: 透明タップ判定
    node.style.left = m.x + '%';
    node.style.top = m.y + '%';

    let state_class = 'locked';
    let clickable = false;
    let needsKey = null;
    let overlay = '';  // ★状態オーバーレイ(クリア/鍵不足時のみ)

    if (state.cleared.includes(m.id)) {
      state_class = 'cleared';
      // クリア済み: 小さなチェックマークオーバーレイ
      overlay = `<div class="map-node-overlay map-node-overlay-cleared">✓</div>`;
    } else if (state.available.includes(m.id)) {
      if (m.requiresKey) {
        const keyCount = (state.keys && state.keys[m.requiresKey]) || 0;
        if (keyCount > 0) {
          state_class = 'available';
          clickable = true;
          // 解放済み: 淡い金色glow(.map-node-availableクラスでCSSが描く)
        } else {
          state_class = 'key-locked';
          clickable = true;
          needsKey = m.requiresKey;
          // 鍵不足: 小さな🔒バッジ
          const lockColor = m.requiresKey === 'gold' ? '#ffe060' : '#6090ff';
          overlay = `<div class="map-node-overlay map-node-overlay-locked" style="color:${lockColor};">🔒</div>`;
        }
      } else {
        state_class = 'available';
        clickable = true;
      }
    }

    node.classList.add(state_class);
    node.innerHTML = overlay;

    if (clickable) {
      attachNodeTapHandler(node, m, needsKey);
    }
    nodeContainer.appendChild(node);
  });

  // ★Phase3: ゲート/ショップなどの装飾ノード描画
  renderMapDecorations();

  // エッジ(線)描画(layoutが確定してから)
  requestAnimationFrame(() => renderMapEdges());
}

// ★Phase3 v2: ノードタップ処理
// シングルタップ: ラベル(エリア名)をトースト表示
// ダブルタップ : 戦闘画面/サブミッション選択画面へ遷移
// 鍵不足/未実装の場合はシングルタップで即警告(ダブル不要)
// ★Phase3 v4: パン/ピンチ後のクリック抑制を追加
function attachNodeTapHandler(node, mission, needsKey) {
  let tapTimer = null;
  const TAP_DELAY = 280; // ms
  
  node.onclick = (e) => {
    // ★ジェスチャー直後ならクリック無効
    const viewport = document.getElementById('map-viewport');
    if (viewport && viewport._suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // 鍵不足/未実装は即警告(ダブルタップ判定不要)
    if (needsKey) {
      onKeyLockedNodeClick(mission, needsKey);
      return;
    }
    if (mission.notImplemented) {
      onNotImplementedNodeClick(mission);
      return;
    }
    
    // 通常エリア: シングル/ダブル判定
    if (tapTimer) {
      // ダブルタップ確定
      clearTimeout(tapTimer);
      tapTimer = null;
      // ★Phase3 v9: イベントは説明モーダル経由で戦闘へ
      if (mission.isEvent) {
        showEventModal(mission);
      } else {
        enterBattle(mission.id);
      }
    } else {
      // シングルタップ仮確定 → TAP_DELAY ms 後に確定
      tapTimer = setTimeout(() => {
        tapTimer = null;
        showNodeNameToast(mission);
      }, TAP_DELAY);
    }
  };
}

// ★Phase3 v2: ノード名のトースト表示(シングルタップ時)
function showNodeNameToast(mission) {
  const msg = `${mission.name_ja} ${mission.name ? '(' + mission.name + ')' : ''}\nもう一度タップで開く`;
  if (typeof addLogEquipToast === 'function') {
    addLogEquipToast(msg);
  } else {
    console.log(msg);
  }
}

// ★Phase3 v9: イベント説明モーダル(ダブルタップ時)
function showEventModal(mission) {
  // 既存モーダルがあれば消す
  document.querySelectorAll('.event-modal-overlay').forEach(o => o.remove());

  const overlay = document.createElement('div');
  overlay.className = 'event-modal-overlay';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.85); z-index:9999;
    display:flex; align-items:center; justify-content:center;
  `;

  overlay.innerHTML = `
    <div style="background:linear-gradient(180deg,#2a1810 0%,#1a0e08 100%);
                border:2px solid #d4a020; border-radius:8px;
                padding:24px 20px; max-width:480px; width:90%;
                box-shadow:0 0 40px rgba(212,160,32,0.5);">
      <div style="color:#d4a020; font-size:16px; font-weight:800; margin-bottom:16px; text-align:center; letter-spacing:2px;">
        ⚔️ ${mission.name_ja}
      </div>
      <div style="color:#e8d8b8; font-size:13px; line-height:1.8; margin-bottom:24px; text-align:left; padding:12px; background:rgba(0,0,0,0.4); border-radius:4px; border-left:3px solid #d4a020;">
        ${mission.eventNarration || mission.name_ja}
      </div>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="event-modal-cancel" style="flex:1; max-width:140px; padding:10px; background:#3a2a1a; border:1px solid #6a5040; color:#a8956e; font-weight:700; border-radius:4px; cursor:pointer; font-size:13px;">
          やめる
        </button>
        <button id="event-modal-accept" style="flex:1; max-width:140px; padding:10px; background:linear-gradient(180deg,#d4a020 0%,#a07810 100%); border:1px solid #ffe060; color:#1a0e08; font-weight:800; border-radius:4px; cursor:pointer; font-size:13px;">
          挑む
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('event-modal-cancel').onclick = () => {
    overlay.remove();
  };
  document.getElementById('event-modal-accept').onclick = () => {
    overlay.remove();
    // 戦闘開始(イベントは subMission なし、エリア直接)
    state.currentMission = mission.id;
    state.currentSubMissionId = null;
    state.currentAreaBackup = null;  // バックアップ不要
    initBattle(mission.id);
    goTo('battle');
    // ★戦闘開始後にイベントセリフ表示
    setTimeout(() => showEventOpeningDialog(mission), 200);
  };
}

// ★Phase3 v9: 戦闘開始時のイベントセリフ表示(bandit_boss流用パターン)
function showEventOpeningDialog(mission) {
  if (!mission.eventOpeningLine) return;
  const line = mission.eventOpeningLine;

  // 既存モーダルがあれば消す
  document.querySelectorAll('.event-dialog-overlay').forEach(o => o.remove());

  const overlay = document.createElement('div');
  overlay.className = 'event-dialog-overlay';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.6); z-index:9998;
    display:flex; align-items:flex-end; justify-content:center;
    padding-bottom:80px;
  `;
  overlay.innerHTML = `
    <div style="background:linear-gradient(180deg,#1a0e08 0%,#0a0604 100%);
                border:2px solid #d4a020; border-radius:6px;
                padding:18px 22px; max-width:480px; width:90%;
                box-shadow:0 0 30px rgba(212,160,32,0.5); cursor:pointer;">
      <div style="color:#d4a020; font-size:12px; font-weight:800; margin-bottom:8px; letter-spacing:1px;">
        ${line.speaker}
      </div>
      <div style="color:#fff; font-size:14px; line-height:1.7;">
        「${line.text}」
      </div>
      <div style="text-align:right; color:#a8956e; font-size:10px; margin-top:8px;">
        タップで閉じる
      </div>
    </div>
  `;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);

  // 自動で6秒後に閉じる(タップしなくても進める)
  setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
  }, 6000);
}

// ★Phase3 v2: マップを画面いっぱいに拡大(上下ヘッダー以外全部マップ)
// ★Phase3 v3: バグ修正 - displayを直接いじらず、画面切り替え(.active class)を邪魔しない
// ★Phase3 v4: パン/ピンチズーム対応 - viewport ラッパーを作って transform で操作
function applyFullscreenMapLayout() {
  const screen = document.getElementById('screen-map');
  const topBar = screen ? screen.querySelector('.map-top-bar') : null;
  const mapArea = document.getElementById('map-area');
  const mapHint = document.getElementById('map-hint');

  if (screen) {
    screen.style.flexDirection = 'column';
    screen.style.height = '100dvh';
    screen.style.padding = '0';
    screen.style.margin = '0';
    screen.style.boxSizing = 'border-box';
    if (screen.classList.contains('active')) {
      screen.style.display = 'flex';
    }
  }
  if (topBar) {
    topBar.style.flex = '0 0 auto';
  }
  if (mapArea) {
    mapArea.style.flex = '1 1 auto';
    mapArea.style.height = 'auto';
    mapArea.style.minHeight = '0';
    mapArea.style.width = '100%';
    mapArea.style.position = 'relative';
    mapArea.style.overflow = 'hidden';
    // 背景画像はviewport側に移すのでクリア
    mapArea.style.backgroundImage = 'none';
    // タッチイベント時のブラウザ挙動を抑制(ピンチズームの誤発動防止)
    mapArea.style.touchAction = 'none';

    // ★viewport ラッパーを作る(まだなければ)
    ensureMapViewport(mapArea);
  }
  if (mapHint) {
    mapHint.style.flex = '0 0 auto';
    mapHint.style.fontSize = '10px';
    mapHint.style.padding = '4px 8px';
    mapHint.style.lineHeight = '1.2';
    mapHint.textContent = '▶ 1本指でスワイプ / 2本指でピンチ / シングルタップ=名前 / ダブルタップ=開く';
  }
}

// ★Phase3 v4: map-viewport ラッパーを作って既存のmap-area子要素を全部その中に移す
// 1度だけ作る(idempotent)
function ensureMapViewport(mapArea) {
  let viewport = document.getElementById('map-viewport');
  if (viewport) {
    // すでに存在 → サイズ・スタイルだけ最新化
    applyViewportStyles(viewport, mapArea);
    return viewport;
  }

  // まだ無い → 新規作成
  viewport = document.createElement('div');
  viewport.id = 'map-viewport';
  applyViewportStyles(viewport, mapArea);

  // 既存の子要素(SVG, .map-node, .map-deco など)を viewport に移動
  while (mapArea.firstChild) {
    viewport.appendChild(mapArea.firstChild);
  }
  mapArea.appendChild(viewport);

  // ジェスチャーハンドラを mapArea に登録(touch + wheel)
  attachMapGestureHandlers(mapArea, viewport);

  return viewport;
}

function applyViewportStyles(viewport, mapArea) {
  // ★Phase3 v5: viewport はマップ画像のアスペクト比(1600:1000 = 1.6:1)に固定
  // map-area が縦長(iPhone)でも、マップ画像は1.6:1で表示する
  // これにより、ノードの%座標が地形オブジェクトと正確に合う
  const rect = mapArea.getBoundingClientRect();
  const W = Math.max(rect.width, 1);
  const H = Math.max(rect.height, 1);
  const MAP_ASPECT = 1.6;  // 1600 / 1000

  // map-area の中で1.6:1のアスペクトを保ちながら最大化
  let viewW, viewH;
  if (W / H > MAP_ASPECT) {
    // map-area が横長 → 高さ基準
    viewH = H;
    viewW = H * MAP_ASPECT;
  } else {
    // map-area が縦長 → 幅基準
    viewW = W;
    viewH = W / MAP_ASPECT;
  }
  
  // map-area の中央に viewport を配置(初期 pan は中央寄せ)
  viewport.style.position = 'absolute';
  viewport.style.left = '0';
  viewport.style.top = '0';
  viewport.style.width = viewW + 'px';
  viewport.style.height = viewH + 'px';
  viewport.style.transformOrigin = '0 0';
  viewport.style.willChange = 'transform';
  // 背景画像を viewport に設定 (アスペクト比1.6:1なので歪まない)
  if (typeof SPRITES !== 'undefined' && SPRITES.act1_map) {
    viewport.style.backgroundImage = `url(data:image/jpeg;base64,${SPRITES.act1_map})`;
    viewport.style.backgroundSize = '100% 100%';
    viewport.style.backgroundPosition = 'center';
    viewport.style.backgroundRepeat = 'no-repeat';
  }
}

// ★Phase3 v4: マップのパン/ピンチジェスチャー処理
// state は viewport に持たせる(_panX, _panY, _scale)
function attachMapGestureHandlers(mapArea, viewport) {
  // 状態は viewport の dataset に保存
  let panX = 0, panY = 0, scale = 1;
  const MIN_SCALE = 0.6;
  const MAX_SCALE = 2.5;
  
  function applyTransform() {
    viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    viewport._panX = panX;
    viewport._panY = panY;
    viewport._scale = scale;
  }
  // 初期化
  viewport._panX = 0;
  viewport._panY = 0;
  viewport._scale = 1;
  
  // ジェスチャー判定用変数
  let activeTouches = [];   // 現在の指の座標 [{id, x, y}]
  let gestureMode = null;   // 'pan' | 'pinch' | null
  let panStartX = 0, panStartY = 0;        // タッチ開始時のパン値
  let pinchStartDist = 0;                   // ピンチ開始時の指間距離
  let pinchStartScale = 1;                  // ピンチ開始時のスケール
  let pinchCenterX = 0, pinchCenterY = 0;   // ピンチ中心(map-area座標系)
  let pinchStartPanX = 0, pinchStartPanY = 0;
  let totalMoveDist = 0;                    // 累積移動距離(タップ判定用)
  
  function getMapAreaPoint(clientX, clientY) {
    const r = mapArea.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }
  
  function clampPan() {
    // viewport の表示サイズ(scale適用後)
    const r = mapArea.getBoundingClientRect();
    const W = r.width, H = r.height;
    const vw = parseFloat(viewport.style.width) * scale;
    const vh = parseFloat(viewport.style.height) * scale;
    // 画面に対してマップが小さい場合は中央寄せ、大きい場合は端で止める
    const minX = Math.min(0, W - vw);
    const maxX = Math.max(0, W - vw);
    const minY = Math.min(0, H - vh);
    const maxY = Math.max(0, H - vh);
    panX = Math.min(maxX, Math.max(minX, panX));
    panY = Math.min(maxY, Math.max(minY, panY));
  }
  
  // ====== TOUCH ======
  mapArea.addEventListener('touchstart', (e) => {
    // 既存のタッチを更新
    activeTouches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }));
    totalMoveDist = 0;
    
    if (activeTouches.length === 1) {
      gestureMode = 'pan';
      panStartX = panX;
      panStartY = panY;
    } else if (activeTouches.length >= 2) {
      gestureMode = 'pinch';
      const [a, b] = activeTouches;
      pinchStartDist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      pinchStartScale = scale;
      pinchStartPanX = panX;
      pinchStartPanY = panY;
      const mid = getMapAreaPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      pinchCenterX = mid.x;
      pinchCenterY = mid.y;
    }
  }, { passive: true });
  
  mapArea.addEventListener('touchmove', (e) => {
    // ブラウザのデフォルトピンチを抑止
    if (e.touches.length >= 2) e.preventDefault();
    
    const newTouches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }));
    
    if (gestureMode === 'pan' && newTouches.length === 1 && activeTouches.length === 1) {
      const dx = newTouches[0].x - activeTouches[0].x;
      const dy = newTouches[0].y - activeTouches[0].y;
      // 開始位置からの累計差分でpan更新(ドラッグ中の合計距離)
      totalMoveDist = Math.hypot(dx, dy);  // 開始からの距離
      panX = panStartX + dx;
      panY = panStartY + dy;
      clampPan();
      applyTransform();
    } else if (gestureMode === 'pinch' && newTouches.length >= 2) {
      const [a, b] = newTouches;
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      let newScale = pinchStartScale * (dist / pinchStartDist);
      newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      // ピンチ中心がマップ上で固定されるようにpanも調整
      // 中心点(mapArea座標系)に対して、scaleが変わる前後で同じマップ位置を保つ
      // 旧: mapPos = (centerX - panX) / oldScale
      // 新: mapPos = (centerX - newPanX) / newScale  → 同じ値にする
      // → newPanX = centerX - mapPos * newScale = centerX - ((centerX - pinchStartPanX) / pinchStartScale) * newScale
      panX = pinchCenterX - ((pinchCenterX - pinchStartPanX) / pinchStartScale) * newScale;
      panY = pinchCenterY - ((pinchCenterY - pinchStartPanY) / pinchStartScale) * newScale;
      scale = newScale;
      clampPan();
      applyTransform();
      totalMoveDist += 10;  // ピンチ中はタップ判定を必ず無効に
    }
  }, { passive: false });
  
  mapArea.addEventListener('touchend', (e) => {
    activeTouches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }));
    if (activeTouches.length === 0) {
      gestureMode = null;
    } else if (activeTouches.length === 1) {
      // ピンチ→1本指に戻った場合、パンに切り替え
      gestureMode = 'pan';
      panStartX = panX;
      panStartY = panY;
    }
  }, { passive: true });
  
  mapArea.addEventListener('touchcancel', () => {
    activeTouches = [];
    gestureMode = null;
  }, { passive: true });
  
  // ====== タップ判定: 累積移動距離が小さければ子要素のクリックを通す ======
  // touchstart時点でtotalMoveDistをリセットしてるので、touchendまでに10px超えてればドラッグ扱い
  // ノード/装飾のonclickハンドラに対して、ドラッグ後はクリックを抑制する処理を入れる
  // → 現状の onclick の冒頭で「直前にドラッグしたかどうか」を判定したい
  // viewport._lastWasGesture フラグで判定
  mapArea.addEventListener('touchend', () => {
    // タイミング: touchend で「ドラッグ扱いか」を viewport._suppressClick に格納
    viewport._suppressClick = (totalMoveDist > 10);
    if (viewport._suppressClick) {
      // 短時間 _suppressClick=true にしてから false に戻す
      setTimeout(() => { viewport._suppressClick = false; }, 100);
    }
  }, { passive: true });
  
  // ====== WHEEL (PC) ======
  mapArea.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const pt = getMapAreaPoint(e.clientX, e.clientY);
    panX = pt.x - ((pt.x - panX) / scale) * newScale;
    panY = pt.y - ((pt.y - panY) / scale) * newScale;
    scale = newScale;
    clampPan();
    applyTransform();
  }, { passive: false });
  
  // 初期表示
  applyTransform();
}

// ★Phase3 v3: 画面切り替え時に screen-map の display を毎回正しくセット
// goTo('map') 等で .active が付いた時に呼ばれるよう、MutationObserverで監視
(function setupMapDisplayWatcher() {
  if (typeof MutationObserver === 'undefined') return;
  // DOMContentLoaded後に登録
  function init() {
    const screen = document.getElementById('screen-map');
    if (!screen) {
      // まだDOMに無ければ少し待って再試行
      setTimeout(init, 100);
      return;
    }
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          if (screen.classList.contains('active')) {
            screen.style.display = 'flex';
          } else {
            // active外れたらインラインstyle消してCSS任せに(他の画面に切り替わった時)
            screen.style.removeProperty('display');
          }
        }
      }
    });
    observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ★Phase3: ゲート(GOLD/BLUE)とショップを視覚表示として描画
// MAP_DECORATIONSはdata_game.jsで定義。ロジックには関与せず純粋な装飾。
// ★Phase3 v2: ラベルは通常非表示、シングルタップで名前トースト
// ★Phase3 v4: viewport内に追加(パン/ズーム対象に)
function renderMapDecorations() {
  const mapArea = document.getElementById('map-area');
  if (!mapArea) return;
  if (typeof MAP_DECORATIONS === 'undefined') return;

  // viewport があればそちらに追加。無ければ mapArea 直下(後方互換)
  const container = document.getElementById('map-viewport') || mapArea;

  // 既存の装飾ノードを削除
  container.querySelectorAll('.map-deco').forEach(n => n.remove());

  // ★Phase3 v9: 透明タップ判定エリア(画像のオブジェクトに重ねる)
  // 30px円形のクリック判定だけで、見た目は透明
  const tapAreaStyle = 'position:absolute;width:6%;height:9.6%;transform:translate(-50%,-50%);z-index:3;cursor:pointer;user-select:none;pointer-events:auto;border-radius:50%;';

  // ゲート描画(透明タップ判定 + GOLD門だけ淡い金色glow)
  (MAP_DECORATIONS.gates || []).forEach(g => {
    const node = document.createElement('div');
    node.className = `map-deco map-deco-gate map-deco-gate-${g.type}`;
    node.style.cssText = tapAreaStyle + `left:${g.x}%;top:${g.y}%;`;
    node.title = `${g.name} (${g.type.toUpperCase()} KEY)`;
    // 中身は空(画像のゲートが見えるように)
    node.innerHTML = '';
    node.onclick = (e) => {
      const vp = document.getElementById('map-viewport');
      if (vp && vp._suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
      e.preventDefault(); e.stopPropagation();
      const msg = `🔒 ${g.name} (${g.type.toUpperCase()} KEY 必要、未実装)`;
      if (typeof addLogEquipToast === 'function') addLogEquipToast(msg);
    };
    container.appendChild(node);
  });

  // ショップ描画(透明タップ判定)
  (MAP_DECORATIONS.shops || []).forEach(s => {
    const node = document.createElement('div');
    node.className = 'map-deco map-deco-shop';
    node.style.cssText = tapAreaStyle + `left:${s.x}%;top:${s.y}%;`;
    node.title = s.name;
    node.innerHTML = '';
    node.onclick = (e) => {
      const vp = document.getElementById('map-viewport');
      if (vp && vp._suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
      e.preventDefault(); e.stopPropagation();
      onShopNodeClick(s);
    };
    container.appendChild(node);
  });

  // ★Phase3 v9: イベントはMISSIONSに統合済みなので、ここでは描画しない
  // (renderMap()で自動的にステージと同じ「?」「▶」「✓」アイコンで描画される)
}

// ★Phase3: 未実装エリアのクリック警告
function onNotImplementedNodeClick(mission) {
  if (typeof addLogEquipToast === 'function') {
    addLogEquipToast(`🚧 ${mission.name_ja} は次回以降のアップデートで実装予定`);
  } else {
    alert(`${mission.name_ja} は未実装です`);
  }
}

// ★Phase3: ショップクリック (今は未実装トースト)
function onShopNodeClick(shop) {
  if (typeof addLogEquipToast === 'function') {
    addLogEquipToast(`🏪 ${shop.name} (購買所は未実装)`);
  } else {
    alert(`${shop.name} は未実装です`);
  }
}

// ====== マップのエッジ(接続線)描画 ======
function renderMapEdges() {
  const svg = document.getElementById('map-edges');
  if (!svg) return;
  svg.innerHTML = '';

  // ★Phase3 v4: viewport基準でサイズ計算(viewport内にSVGがあるため)
  const viewport = document.getElementById('map-viewport');
  const refEl = viewport || document.getElementById('map-area');
  const rect = refEl.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  // viewportの中で全面に被せる
  svg.style.position = 'absolute';
  svg.style.left = '0';
  svg.style.top = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';

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

      // ★Phase3 v4: 黄色点線(原作Tactical Warrior風)
      // CSSの !important対策で style属性に !important を付ける
      line.setAttribute('style',
        'stroke:#ffc940 !important;' +
        'stroke-width:3 !important;' +
        'stroke-dasharray:8 6 !important;' +
        'stroke-linecap:round !important;' +
        'opacity:0.85 !important;' +
        'fill:none !important;'
      );

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
