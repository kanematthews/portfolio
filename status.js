const BOARDS = [
  { label: 'Game Dev', shortLink: '90XXxsX8' }
];
const POLL_MS = window.__STATUS_POLL_MS__ || 60000;

let activeIndex = 0;
const boardCache = {};

function groupCardsByList(lists, cards) {
  const sortedLists = [...lists].sort((a, b) => a.pos - b.pos);
  return sortedLists.map(list => ({
    id: list.id,
    name: list.name,
    cards: cards
      .filter(c => c.idList === list.id)
      .sort((a, b) => a.pos - b.pos)
  }));
}

function renderTabs(container, boards, activeIdx, onSelect) {
  container.innerHTML = '';
  boards.forEach((board, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'status-tab' + (i === activeIdx ? ' is-active' : '');
    btn.textContent = board.label;
    btn.addEventListener('click', () => onSelect(i));
    container.appendChild(btn);
  });
}

function renderColumns(container, lists) {
  container.innerHTML = '';
  lists.forEach(list => {
    const col = document.createElement('div');
    col.className = 'status-column';
    const header = document.createElement('h3');
    header.className = 'status-column__title';
    header.textContent = list.name;
    col.appendChild(header);
    list.cards.forEach(card => {
      const chip = document.createElement('p');
      chip.className = 'status-card';
      chip.textContent = card.name;
      col.appendChild(chip);
    });
    container.appendChild(col);
  });
}

function trelloUrl(shortLink) {
  return `https://trello.com/b/${shortLink}.json?lists=open&cards=open&fields=name&list_fields=name,pos&card_fields=name,idList,pos`;
}

async function fetchBoard(shortLink) {
  const res = await fetch(trelloUrl(shortLink));
  if (!res.ok) throw new Error('Trello fetch failed: ' + res.status);
  const data = await res.json();
  return groupCardsByList(data.lists, data.cards);
}

function showError(message) {
  const el = document.getElementById('statusError');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function hideError() {
  const el = document.getElementById('statusError');
  if (!el) return;
  el.hidden = true;
}

function renderLastUpdatedText() {
  const el = document.getElementById('statusUpdated');
  if (!el || !el.dataset.ts) return;
  const secs = Math.max(0, Math.round((Date.now() - Number(el.dataset.ts)) / 1000));
  el.textContent = `Last updated ${secs}s ago`;
}

function markUpdatedNow() {
  const el = document.getElementById('statusUpdated');
  if (!el) return;
  el.dataset.ts = String(Date.now());
  renderLastUpdatedText();
}

async function renderActiveBoard() {
  const board = BOARDS[activeIndex];
  const columnsEl = document.getElementById('statusColumns');
  if (!boardCache[board.shortLink] && columnsEl) {
    columnsEl.innerHTML = '<p class="status-loading">Loading board…</p>';
  }
  try {
    const lists = await fetchBoard(board.shortLink);
    boardCache[board.shortLink] = lists;
    if (columnsEl) renderColumns(columnsEl, lists);
    markUpdatedNow();
    hideError();
  } catch (err) {
    if (boardCache[board.shortLink] && columnsEl) {
      renderColumns(columnsEl, boardCache[board.shortLink]);
    } else if (columnsEl) {
      columnsEl.innerHTML = '';
    }
    showError("Couldn't load board right now — retrying…");
  }
}

function selectBoard(index) {
  if (index === activeIndex) return;
  activeIndex = index;
  const tabsEl = document.getElementById('statusTabs');
  if (tabsEl) renderTabs(tabsEl, BOARDS, activeIndex, selectBoard);
  renderActiveBoard();
}

function startPolling() {
  setInterval(() => { renderActiveBoard(); }, POLL_MS);
  setInterval(renderLastUpdatedText, 1000);
}

function whenGateDismissed(cb) {
  if (!document.body.classList.contains('gate-active')) { cb(); return; }
  const obs = new MutationObserver(() => {
    if (!document.body.classList.contains('gate-active')) {
      obs.disconnect();
      cb();
    }
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

function initStatusPage() {
  const tabsEl = document.getElementById('statusTabs');
  if (!tabsEl) return;
  renderTabs(tabsEl, BOARDS, activeIndex, selectBoard);
  renderActiveBoard();
  startPolling();
}

document.addEventListener('DOMContentLoaded', () => {
  whenGateDismissed(initStatusPage);
});
