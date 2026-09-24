const mount = document.querySelector('#elementDetails');
const symbol = new URLSearchParams(location.search).get('symbol')?.trim();
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

fetch('data/elements.json', { cache: 'no-store' }).then((response) => response.json()).then((elements) => {
  const element = elements.find((item) => item.symbol.toLowerCase() === symbol?.toLowerCase());
  if (!element) {
    mount.innerHTML = '<h1>Element not found</h1><p><a href="chemistry.html">Return to the periodic table.</a></p>';
    return;
  }
  document.title = `${element.name} (${element.symbol})`;
  const structuredData = document.createElement('script');
  structuredData.type = 'application/ld+json';
  structuredData.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'ChemicalSubstance', name: element.name, alternateName: element.symbol, description: element.description || '', url: location.href });
  document.head.appendChild(structuredData);
  mount.innerHTML = `<p class="calc-muted">Atomic number ${element.atomicNumber}</p><h1>${escapeHtml(element.name)} (${escapeHtml(element.symbol)})</h1><p>${escapeHtml(element.description || '')}</p><table class="calc-table"><tbody><tr><th>Atomic mass</th><td>${element.atomicMass ?? '—'}</td></tr><tr><th>Category</th><td>${escapeHtml(element.category)}</td></tr><tr><th>Group</th><td>${element.group ?? '—'}</td></tr><tr><th>Period</th><td>${element.period ?? '—'}</td></tr><tr><th>Block</th><td>${element.block ?? '—'}</td></tr><tr><th>Electronegativity</th><td>${element.electronegativity ?? '—'}</td></tr></tbody></table>`;
}).catch(() => { mount.innerHTML = '<h1>Unable to load element details</h1>'; });
