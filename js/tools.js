const toolsGrid = document.querySelector('#toolsGrid');

async function loadTools() {
  if (!toolsGrid) return;

  try {
    const response = await fetch('data/tools.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to load chemistry tools.');
    }

    const tools = await response.json();

    if (!Array.isArray(tools) || !tools.length) {
      toolsGrid.innerHTML = '<div class="empty-state">No lab tools available.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    tools.forEach((tool) => {
      const card = document.createElement('article');
      card.className = 'tool-card';
      card.innerHTML = `
        <span class="tool-card__icon" aria-hidden="true">${tool.icon || '🧪'}</span>
        <h3 class="tool-card__name">${tool.name}</h3>
        <p class="tool-card__category">${tool.category}</p>
        <p>${tool.description}</p>
      `;
      fragment.appendChild(card);
    });

    toolsGrid.innerHTML = '';
    toolsGrid.appendChild(fragment);
  } catch (error) {
    toolsGrid.innerHTML = '<div class="empty-state">Unable to load the chemistry tools right now.</div>';
    console.error(error);
  }
}

loadTools();
