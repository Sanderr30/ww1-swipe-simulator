const state = {
  army: 50,
  economy: 50,
  society: 50,
  cardIndex: 0,
  cards: [],
  gameOver: false,
};


const screens = {
  start:  document.getElementById('screen-start'),
  game:   document.getElementById('screen-game'),
  result: document.getElementById('screen-result'),
};

const barArmy        = document.getElementById('bar-army');
const barEconomy     = document.getElementById('bar-economy');
const barSociety     = document.getElementById('bar-society');
const yearDisplay    = document.getElementById('year-display');
const timelineFill   = document.getElementById('timeline-fill');
const cardEl         = document.getElementById('card');
const cardTitle      = document.getElementById('card-title');
const cardText       = document.getElementById('card-text');
const hintLeft       = document.getElementById('card-hint-left');
const hintRight      = document.getElementById('card-hint-right');
const hintLeftLabel  = document.getElementById('hint-left-label');
const hintRightLabel = document.getElementById('hint-right-label');
const hintLeftFx     = document.getElementById('hint-left-effects');
const hintRightFx    = document.getElementById('hint-right-effects');
const floatsContainer = document.getElementById('floats-container');
const consequenceFlash = document.getElementById('consequence-flash');
const btnLeftLabel   = document.getElementById('btn-left-label');
const btnRightLabel  = document.getElementById('btn-right-label');


function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].style.opacity = '';
  screens[name].classList.add('active');
}

async function loadCards() {
  const res = await fetch('data/cards.json');
  state.cards = await res.json();
}


function updateBars() {
  const map = { army: barArmy, economy: barEconomy, society: barSociety };
  for (const key of ['army', 'economy', 'society']) {
    const v = Math.max(0, Math.min(100, state[key]));
    map[key].style.width = v + '%';
    map[key].classList.toggle('bar-critical', v <= 20);
  }
}

function updateTimeline() {
  const total = state.cards.length;
  const pct = total > 0 ? (state.cardIndex / total) * 100 : 0;
  timelineFill.style.width = pct + '%';
}


const STAT_COLORS = {
  army:    'var(--army-color)',
  economy: 'var(--economy-color)',
  society: 'var(--society-color)',
};

const STAT_LABELS = { army: 'Армия', economy: 'Экономика', society: 'Общество' };

const BAR_ANCHORS = {
  army:    document.getElementById('stat-army'),
  economy: document.getElementById('stat-economy'),
  society: document.getElementById('stat-society'),
};

function spawnFloat(key, delta) {
  if (delta === 0) return;
  const anchor = BAR_ANCHORS[key];
  const rect = anchor.getBoundingClientRect();

  const el = document.createElement('div');
  el.className = 'float-num';
  el.textContent = (delta > 0 ? '+' : '') + delta + ' ' + STAT_LABELS[key];
  el.style.color = STAT_COLORS[key];
  el.style.left = (rect.left + rect.width / 2 - 40) + 'px';
  el.style.top  = (rect.top - 10) + 'px';

  floatsContainer.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function spawnFloats(effects) {
  let delay = 0;
  for (const key of ['army', 'economy', 'society']) {
    if (effects[key] !== 0) {
      setTimeout(() => spawnFloat(key, effects[key]), delay);
      delay += 120;
    }
  }
}


function shakeScreen() {
  const game = screens.game;
  game.classList.remove('shaking');
  void game.offsetWidth;
  game.classList.add('shaking');
  game.addEventListener('animationend', () => game.classList.remove('shaking'), { once: true });
}


function showConsequence(text) {
  consequenceFlash.textContent = text;
  consequenceFlash.classList.remove('consequence-show');
  void consequenceFlash.offsetWidth;
  consequenceFlash.classList.add('consequence-show');
  consequenceFlash.addEventListener('animationend', () => {
    consequenceFlash.classList.remove('consequence-show');
  }, { once: true });
}


function buildEffectsHtml(effects) {
  const icons = { army: '⚔️', economy: '🏭', society: '👥' };
  return Object.entries(effects).map(([key, val]) => {
    if (val === 0) return '';
    const cls = val > 0 ? 'pos' : 'neg';
    const sign = val > 0 ? '+' : '';
    return `<div class="hint-effect-row ${cls}">${icons[key]} ${sign}${val}</div>`;
  }).join('');
}


function showCard() {
  const card = state.cards[state.cardIndex];
  if (!card) { endGame('victory'); return; }

  cardTitle.textContent = card.title;
  cardText.textContent  = card.text;
  yearDisplay.textContent = card.year + ' год';

  hintLeftLabel.textContent  = card.left.label;
  hintRightLabel.textContent = card.right.label;
  hintLeftFx.innerHTML  = buildEffectsHtml(card.left.effects);
  hintRightFx.innerHTML = buildEffectsHtml(card.right.effects);

  btnLeftLabel.textContent  = card.left.label;
  btnRightLabel.textContent = card.right.label;

  updateTimeline();

  cardEl.classList.remove('card-fly-left', 'card-fly-right', 'card-appear');
  void cardEl.offsetWidth;
  cardEl.classList.add('card-appear');
}


function applyChoice(direction) {
  if (state.gameOver) return;

  const card    = state.cards[state.cardIndex];
  const choice  = direction === 'left' ? card.left : card.right;
  const effects = choice.effects;

  state.army     = Math.min(100, state.army     + effects.army);
  state.economy  = Math.min(100, state.economy  + effects.economy);
  state.society  = Math.min(100, state.society  + effects.society);

  updateBars();
  spawnFloats(effects);

  if (state.army <= 20 || state.economy <= 20 || state.society <= 20) {
    shakeScreen();
  }

  if (choice.consequence) {
    setTimeout(() => showConsequence(choice.consequence), 200);
  }

  const delay = choice.consequence ? 800 : 0;

  if (state.army     <= 0) { animateFly(direction, () => setTimeout(() => endGame('army'),     delay)); return; }
  if (state.economy  <= 0) { animateFly(direction, () => setTimeout(() => endGame('economy'),  delay)); return; }
  if (state.society  <= 0) { animateFly(direction, () => setTimeout(() => endGame('society'),  delay)); return; }

  state.cardIndex++;
  animateFly(direction, () => {
    setTimeout(() => {
      showCard();
    }, 2000);
  });
}

function animateFly(direction, callback) {
  const cls       = direction === 'left' ? 'card-fly-left' : 'card-fly-right';
  const animName  = direction === 'left' ? 'fly-left' : 'fly-right';

  cardEl.classList.remove('card-appear');
  void cardEl.offsetWidth;
  cardEl.classList.add(cls);

  let done = false;
  function finish() {
    if (done) return;
    done = true;
    cardEl.removeEventListener('animationend', onEnd);
    callback();
  }

  function onEnd(e) {
    if (e.animationName === animName) finish();
  }

  cardEl.addEventListener('animationend', onEnd);
  setTimeout(finish, 500);
}


function endGame(reason) {
  state.gameOver = true;

  setTimeout(() => {
    showScreen('result');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screens.result.style.opacity = '1';
      });
    });
  }, 300);

  const endings = {
    army: {
      icon: '💀',
      title: 'Фронт рухнул',
      text: 'Армия деморализована и разбита. Немцы захватывают Петроград. Трёхсотлетняя монархия пала под ударами внешнего врага.',
    },
    economy: {
      icon: '📉',
      title: 'Экономический коллапс',
      text: 'Заводы встали, казна пуста, солдаты голодают на фронте. Без снарядов и хлеба война проиграна изнутри.',
    },
    society: {
      icon: '🔥',
      title: 'Февральская революция',
      text: 'Народный гнев достиг предела. Рабочие и солдаты вышли на улицы. Николай II отрёкся от престола. Империя пала.',
    },
    victory: {
      icon: '🏆',
      title: 'Империя устояла',
      text: 'Вам удалось провести страну через все испытания Великой войны. Редчайший исход — история знала лишь один путь.',
    },
  };

  const e = endings[reason];
  document.getElementById('result-icon').textContent  = e.icon;
  document.getElementById('result-title').textContent = e.title;
  document.getElementById('result-text').textContent  = e.text;

  document.getElementById('result-stats').innerHTML = `
    <div class="result-stat">
      <span class="result-stat-val" style="color:var(--army-color)">${Math.max(0, state.army)}</span>
      <span class="result-stat-name">Армия</span>
    </div>
    <div class="result-stat">
      <span class="result-stat-val" style="color:var(--economy-color)">${Math.max(0, state.economy)}</span>
      <span class="result-stat-name">Экономика</span>
    </div>
    <div class="result-stat">
      <span class="result-stat-val" style="color:var(--society-color)">${Math.max(0, state.society)}</span>
      <span class="result-stat-name">Общество</span>
    </div>
  `;
}


function resetGame() {
  state.army      = 50;
  state.economy   = 50;
  state.society   = 50;
  state.cardIndex = 0;
  state.gameOver  = false;
  updateBars();
  showCard();
  showScreen('game');
}


let dragStartX   = null;
let dragCurrentX = null;
let isDragging   = false;

const HINT_THRESHOLD = 40;
const SWIPE_THRESHOLD = 80;

function onDragStart(x) {
  if (state.gameOver) return;
  dragStartX   = x;
  dragCurrentX = x;
  isDragging   = true;
}

function onDragMove(x) {
  if (!isDragging) return;
  dragCurrentX = x;
  const delta = x - dragStartX;

  cardEl.style.transform = `translateX(${delta}px) rotate(${delta * 0.04}deg)`;

  const leftPct  = delta < -HINT_THRESHOLD ? Math.min(1, (-delta - HINT_THRESHOLD) / 60) : 0;
  const rightPct = delta >  HINT_THRESHOLD ? Math.min(1,  (delta - HINT_THRESHOLD) / 60) : 0;

  hintLeft.style.opacity  = leftPct;
  hintRight.style.opacity = rightPct;
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;

  const delta = dragCurrentX - dragStartX;
  cardEl.style.transform = '';
  hintLeft.style.opacity  = 0;
  hintRight.style.opacity = 0;

  if (delta < -SWIPE_THRESHOLD)     applyChoice('left');
  else if (delta > SWIPE_THRESHOLD) applyChoice('right');
}

cardEl.addEventListener('mousedown',  e => onDragStart(e.clientX));
window.addEventListener('mousemove',  e => onDragMove(e.clientX));
window.addEventListener('mouseup',    ()  => onDragEnd());

cardEl.addEventListener('touchstart', e => onDragStart(e.touches[0].clientX), { passive: true });
window.addEventListener('touchmove',  e => onDragMove(e.touches[0].clientX),  { passive: true });
window.addEventListener('touchend',   ()  => onDragEnd());


document.getElementById('btn-left').addEventListener('click',    () => applyChoice('left'));
document.getElementById('btn-right').addEventListener('click',   () => applyChoice('right'));
document.getElementById('btn-start').addEventListener('click',   resetGame);
document.getElementById('btn-restart').addEventListener('click', resetGame);


loadCards().then(() => showScreen('start'));