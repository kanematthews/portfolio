const BOARDS = [
  { label: 'Game Dev', shortLink: '90XXxsX8' }
];

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

function renderTabs(container, boards, activeIndex, onSelect) {
  container.innerHTML = '';
  boards.forEach((board, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'status-tab' + (i === activeIndex ? ' is-active' : '');
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
