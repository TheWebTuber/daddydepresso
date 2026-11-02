(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  function closeNav() {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
  }
  menu.addEventListener('click', () => {
    const opening = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', opening);
    menu.setAttribute('aria-expanded', String(opening));
    menu.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  document.addEventListener('click', e => { if (!nav.contains(e.target) && !menu.contains(e.target)) closeNav(); });
  document.getElementById('year').textContent = new Date().getFullYear();

  const fates = [
    ['The raccoon was here first.', 'Your sandwich has become part of a new side quest.'],
    ['A door opens.', 'A new adventure is waiting. Maybe bring a friend.'],
    ['A perfect roll!', 'The whole party laughs. Someone will tell this story again.'],
    ['A rustle behind you.', 'Too late. The sandwich has already disappeared.'],
    ['The story takes a turn.', 'What happens next is entirely up to you.'],
    ['The Game Master smiles.', 'That could be good news. It probably isn\'t.'],
    ['You find a quiet moment.', 'Take it. The next chapter can wait a minute.'],
    ['The raccoon flips your card.', 'Your plans are upside down. Your lunch is missing too.']
  ];
  const deck = document.getElementById('fate-card');
  const result = document.getElementById('fate-result');
  const detail = document.getElementById('fate-detail');
  const draw = document.getElementById('draw-card');
  let previous = -1;
  let switching = false;
  draw.addEventListener('click', () => {
    if (switching) return;
    switching = true;
    let choice = Math.floor(Math.random() * fates.length);
    if (choice === previous) choice = (choice + 1) % fates.length;
    previous = choice;
    const setCard = () => {
      result.textContent = fates[choice][0];
      detail.textContent = fates[choice][1];
      deck.classList.add('is-flipped');
      draw.textContent = 'Flip another card ✦';
      switching = false;
    };
    if (deck.classList.contains('is-flipped')) {
      deck.classList.remove('is-flipped');
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setCard();
      else window.setTimeout(setCard, 420);
    } else setCard();
  });
  const copy = document.getElementById('copy-email');
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('josephpenax@gmail.com');
      copy.textContent = 'Copied!';
    } catch (_) {
      copy.textContent = 'Select the email above';
    }
    window.setTimeout(() => { copy.textContent = 'Copy address'; }, 2300);
  });
})();
