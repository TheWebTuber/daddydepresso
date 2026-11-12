/* Daddy Depresso emote gallery. No external dependencies or API key required. */
(() => {
  'use strict';
  const MANIFEST = 'emotes/emotes.json';
  const ALLOWED = /\.(gif|png|apng|webp|jpe?g|avif)$/i;
  const ANIMATED = /\.(gif|apng)$/i;
  const gallery = document.getElementById('emote-gallery');
  const search = document.getElementById('emote-search');
  const total = document.getElementById('emote-total');
  const status = document.getElementById('emote-status');
  const empty = document.getElementById('emote-empty');
  const emptyTitle = document.getElementById('emote-empty-title');
  const emptyMessage = document.getElementById('emote-empty-message');
  const reset = document.getElementById('emote-reset');
  const sort = document.getElementById('emote-sort');
  const filters = [...document.querySelectorAll('[data-filter]')];
  if (!gallery || !search || !total || !status || !sort) return;

  const state = { items: [], filter: 'all', query: '', sort: 'az', failed: false };
  const filenameToTitle = file => file.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const isAnimated = file => ANIMATED.test(file);
  const safeFile = file => typeof file === 'string' && file !== '.' && file !== '..' && !file.includes('/') && !file.includes('\\') && !file.includes('\0') && ALLOWED.test(file);
  const fileUrl = file => new URL('emotes/' + encodeURIComponent(file), document.baseURI).href;

  function displayEmpty(title, message, showReset) {
    empty.hidden = false;
    emptyTitle.textContent = title;
    emptyMessage.textContent = message;
    reset.hidden = !showReset;
  }

  async function copyToClipboard(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    // Fallback for environments without the async Clipboard API.
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    input.remove();
    if (!ok) throw new Error('Clipboard copy was blocked');
  }

  function makeCard(item) {
    const card = document.createElement('article');
    card.className = 'emote-card';
    const preview = document.createElement('div');
    preview.className = 'emote-preview';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = fileUrl(item.file);
    img.alt = item.title + ' emote';
    img.onerror = () => {
      img.classList.add('is-broken');
      const symbol = document.createElement('span');
      symbol.className = 'emote-preview-fallback';
      symbol.textContent = '✧';
      symbol.setAttribute('aria-label','Image not found');
      preview.appendChild(symbol);
    };
    preview.appendChild(img);

    const details = document.createElement('div');
    details.className = 'emote-details';
    const name = document.createElement('h3');
    name.className = 'emote-name';
    name.textContent = item.title;
    name.title = item.file;
    const meta = document.createElement('span');
    meta.className = 'emote-meta';
    meta.textContent = item.file.split('.').pop().toUpperCase();
    const actions = document.createElement('div');
    actions.className = 'emote-card-actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'emote-copy';
    copy.textContent = 'Copy link';
    copy.setAttribute('aria-label',`Copy link for ${item.title}`);
    copy.addEventListener('click', async () => {
      try {
        await copyToClipboard(fileUrl(item.file));
        // Clear the previous "Copied" state when copying a different item.
        gallery.querySelectorAll('.emote-copy.is-copied').forEach(button => {
          button.classList.remove('is-copied');
          button.textContent = 'Copy link';
        });
        copy.textContent = '✓ Copied!';
        copy.classList.add('is-copied');
        status.textContent = `${item.title}: direct link copied.`;
      } catch (_err) {
        status.textContent = 'Copy was blocked. Use the open button to copy the URL from your address bar.';
      }
    });
    const open = document.createElement('a');
    open.className = 'emote-open';
    open.href = fileUrl(item.file);
    open.textContent = '↗';
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.title = 'Open emote in new tab';
    open.setAttribute('aria-label',`Open ${item.title} in new tab`);
    actions.append(copy, open);
    details.append(name, meta, actions);
    card.append(preview, details);
    return card;
  }

  function render() {
    const q = state.query.toLocaleLowerCase().trim();
    const items = state.items.filter(item => {
      if (state.filter === 'animated' && !isAnimated(item.file)) return false;
      if (state.filter === 'static' && isAnimated(item.file)) return false;
      return `${item.title} ${item.file}`.toLocaleLowerCase().includes(q);
    }).sort((a,b) => state.sort === 'az'
      ? a.title.localeCompare(b.title, undefined, { numeric:true })
      : b.title.localeCompare(a.title, undefined, { numeric:true }));
    gallery.replaceChildren(...items.map(makeCard));
    gallery.setAttribute('aria-busy','false');
    total.textContent = state.items.length === 1 ? '1 emote' : `${state.items.length} emotes`;

    if (state.failed) {
      displayEmpty('The emote list could not be loaded.', 'Check that emotes/emotes.json exists and that you opened the site through Live Server or your web host.', false);
      status.textContent = 'Could not load emotes/emotes.json.';
      return;
    }
    if (!state.items.length) {
      displayEmpty('The stash is empty for now.', 'Add emote files to the emotes folder, regenerate emotes.json, and refresh this page.', false);
      status.textContent = 'No emotes added yet.';
      return;
    }
    if (!items.length) {
      displayEmpty('No matching emotes.', 'Try a different search or choose another format.', true);
      status.textContent = '0 matches';
      return;
    }
    empty.hidden = true;
    status.textContent = `Showing ${items.length} of ${state.items.length} emotes.`;
  }

  search.addEventListener('input', () => { state.query = search.value; render(); });
  sort.addEventListener('change', () => { state.sort = sort.value; render(); });
  filters.forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    filters.forEach(b => { const active = b === button; b.classList.toggle('is-active',active); b.setAttribute('aria-pressed', String(active)); });
    render();
  }));
  reset.addEventListener('click', () => {
    search.value = '';
    state.query = '';
    state.filter = 'all';
    filters.forEach(b => { const active = b.dataset.filter === 'all'; b.classList.toggle('is-active',active); b.setAttribute('aria-pressed',String(active)); });
    render();
    search.focus();
  });
  const year = document.getElementById('emote-year');
  if (year) year.textContent = new Date().getFullYear();

  async function load() {
    try {
      const response = await fetch(MANIFEST, { cache:'no-store' });
      if (!response.ok) throw new Error('Manifest status: ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Manifest must be a JSON array');
      const seen = new Set();
      state.items = data.map(entry => {
        if (typeof entry === 'string') return {file:entry, title:filenameToTitle(entry)};
        if (entry && typeof entry === 'object' && typeof entry.file === 'string') {
          return { file:entry.file, title:typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : filenameToTitle(entry.file) };
        }
        return null;
      }).filter(entry => {
        if (!entry || !safeFile(entry.file)) return false;
        const key = entry.file.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (error) {
      console.error('Daddy Depresso emotes:', error);
      state.failed = true;
    }
    render();
  }
  load();
})();
