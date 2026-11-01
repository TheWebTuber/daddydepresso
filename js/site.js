(() => {
  'use strict';
  const root = document.documentElement;
  const themes = ['grove','dusk','rose'];
  const buttons = [...document.querySelectorAll('[data-theme-target]')];
  try { const saved = localStorage.getItem('raccoon-color-theme'); if (themes.includes(saved)) root.dataset.theme = saved; } catch (_) { /* private browsing */ }
  function updateTheme() { buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.themeTarget === root.dataset.theme))); }
  updateTheme();
  buttons.forEach(btn => btn.addEventListener('click', () => {
    root.dataset.theme = btn.dataset.themeTarget;
    updateTheme();
    try { localStorage.setItem('raccoon-color-theme', root.dataset.theme); } catch (_) { /* storage disabled */ }
  }));

  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  function closeNav() { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label', 'Open navigation'); }
  menu.addEventListener('click', () => { const opening = !nav.classList.contains('is-open'); nav.classList.toggle('is-open', opening); menu.setAttribute('aria-expanded', String(opening)); menu.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation'); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNav(); });
  document.addEventListener('click', (event) => { if (!nav.contains(event.target) && !menu.contains(event.target)) closeNav(); });
  document.getElementById('year').textContent = new Date().getFullYear();
  const profile = document.getElementById('profile-photo');
  profile.addEventListener('error', () => { if (profile.src !== new URL(profile.dataset.fallback, document.baseURI).href) profile.src = profile.dataset.fallback; });
  if (profile.complete && !profile.naturalWidth) profile.src = profile.dataset.fallback;

  const fates = [
    ['A mysterious raccoon appears!', 'It found your blind spot. Your sandwich is now a side quest.'],
    ['The next door is unlocked.', 'Behind it? A completely new adventure, waiting for a brave first step.'],
    ['Natural 20: shared laughter.', 'The party gets a moment they will quote for the rest of the campaign.'],
    ['You hear a rustle behind you.', 'Roll perception. Too late — the sandwich thief has already escaped.'],
    ['A new quest lands in your lap.', 'Your next move changes the whole story. No pressure, of course.'],
    ['The table falls silent.', 'Your GM smiles. This is either excellent news or very bad news.'],
    ['A small miracle occurs.', 'Everyone agrees on a plan. It lasts almost a full minute.'],
    ['The raccoon flips your card.', 'Your destiny is upside down. Your snacks are also gone.']
  ];
  const deck = document.getElementById('fate-card');
  const result = document.getElementById('fate-result');
  const detail = document.getElementById('fate-detail');
  const draw = document.getElementById('draw-card');
  let lastPick = -1;
  let busy = false;
  function chooseFate() {
    if (busy) return;
    busy = true;
    let pick = Math.floor(Math.random() * fates.length);
    if (pick === lastPick) pick = (pick + 1) % fates.length;
    lastPick = pick;
    if (deck.classList.contains('is-flipped')) {
      deck.classList.remove('is-flipped');
      setTimeout(() => { result.textContent = fates[pick][0]; detail.textContent = fates[pick][1]; deck.classList.add('is-flipped'); draw.innerHTML = 'Another twist <span aria-hidden="true">✦</span>'; busy = false; }, 380);
    } else {
      result.textContent = fates[pick][0]; detail.textContent = fates[pick][1];
      deck.classList.add('is-flipped'); draw.innerHTML = 'Another twist <span aria-hidden="true">✦</span>'; busy = false;
    }
  }
  draw.addEventListener('click', chooseFate);
  const copy = document.getElementById('copy-email');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('josephpenax@gmail.com'); copy.textContent='Copied!'; setTimeout(() => { copy.textContent='Copy'; }, 1800); }
    catch (_) { copy.textContent='Select email'; setTimeout(() => { copy.textContent='Copy'; }, 1800); }
  });
})();
