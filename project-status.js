const BOARDS = [
  { label: 'Game Dev', shortLink: '90XXxsX8' }
];
const POLL_MS = window.__STATUS_POLL_MS__ || 60000;

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

function trelloUrl(shortLink) {
  return `https://trello.com/b/${shortLink}.json?lists=open&cards=open&fields=name&list_fields=name,pos&card_fields=name,idList,pos`;
}

async function fetchBoard(shortLink) {
  const res = await fetch(trelloUrl(shortLink));
  if (!res.ok) throw new Error('Trello fetch failed: ' + res.status);
  const data = await res.json();
  return groupCardsByList(data.lists, data.cards);
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

function ensureColumnsContainer(el) {
  let container = el.querySelector('.project-status__columns');
  if (!container) {
    container = document.createElement('div');
    container.className = 'project-status__columns';
    el.appendChild(container);
  }
  return container;
}

async function renderProjectStatusElement(el, board) {
  const columnsContainer = ensureColumnsContainer(el);
  const lists = await fetchBoard(board.shortLink);
  boardCache[board.shortLink] = lists;
  renderColumns(columnsContainer, lists);
}

function collectStatusElements() {
  return Array.from(document.querySelectorAll('[data-trello-label]'))
    .map(el => {
      const board = BOARDS.find(b => b.label === el.dataset.trelloLabel);
      return board ? { el, board } : null;
    })
    .filter(Boolean);
}

function renderAllProjectStatuses(items) {
  return Promise.all(items.map(({ el, board }) => renderProjectStatusElement(el, board)));
}

function startPolling(items) {
  setInterval(() => { renderAllProjectStatuses(items); }, POLL_MS);
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

function initProjectStatus() {
  const items = collectStatusElements();
  if (items.length === 0) return;
  renderAllProjectStatuses(items);
  startPolling(items);
}

document.addEventListener('DOMContentLoaded', () => {
  whenGateDismissed(initProjectStatus);
});
