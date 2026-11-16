/* Public YouTube feeds supplied by CreatorPromote API Hub. */
(() => {
  'use strict';
  const cfg = window.RACCOON_YOUTUBE_CONFIG || {};
  const collab = document.getElementById('collab-videos');
  const personal = document.getElementById('personal-videos');
  const collabStatus = document.getElementById('collab-status');
  const personalStatus = document.getElementById('personal-status');
  const updateLabel = document.getElementById('feed-updated');
  const refreshButtons = [...document.querySelectorAll('[data-refresh]')];
  const MAX_COLLAB = 4;
  const MAX_PERSONAL = 3;
  const fallbackSessions = [
    { id: 'FRVmoksciRg', title: 'Player adventures — first collection', label:'Featured player session' },
    { id: '8R5yICkMZn4', title: 'Player adventures — second collection', label:'Featured player session' },
    { id: 'TqJk7cQ72e0', title: 'Behind the screen — GM session', label:'Featured GM session' }
  ];
  const isoDate = str => str && !Number.isNaN(Date.parse(str)) ? new Date(str).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : 'YouTube';
  const videoUrl = id => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const imgUrl = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  function node(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content != null) el.textContent = content;
    return el;
  }
  function videoCard(v) {
    const a = node('a','video-card');
    a.href = videoUrl(v.id);
    a.target='_blank'; a.rel='noopener noreferrer';
    a.setAttribute('aria-label',`Watch ${v.title} on YouTube (opens new tab)`);
    const thumb = node('div','video-poster');
    const img = document.createElement('img'); img.src = (v.thumbnail && /^https:\/\//.test(v.thumbnail)) ? v.thumbnail : imgUrl(v.id);
    img.alt=''; img.loading='lazy'; thumb.appendChild(img);
    thumb.appendChild(node('span','video-play','▶'));
    const body = node('div','video-card-body');
    body.appendChild(node('h4','', v.title || 'Watch on YouTube'));
    const meta = node('div','video-meta');
    meta.appendChild(node('span','', v.label || 'YouTube'));
    meta.appendChild(node('span','', v.date ? isoDate(v.date) : 'Open video'));
    body.appendChild(meta); a.append(thumb,body); return a;
  }
  function render(target, items, limit) {
    target.replaceChildren(...items.slice(0,limit).map(videoCard));
  }
  function fallback(why) {
    render(collab, fallbackSessions, MAX_COLLAB);
    collabStatus.textContent = 'Featured sessions from your supplied links are shown instead of an automatic newest-video list.';
    const card = node('div','video-placeholder');
    card.appendChild(node('strong','', 'His own livestreams are on YouTube.'));
    card.appendChild(node('p','',why || 'The feed is temporarily unavailable. Visit YouTube for his latest streams.'));
    const a = node('a','', 'View personal livestreams ↗');
    a.href = 'https://www.youtube.com/@daddydepresso/streams'; a.target='_blank'; a.rel='noopener noreferrer';
    card.appendChild(a); personal.replaceChildren(card);
    personalStatus.textContent='';
    updateLabel.textContent='✦ Featured sessions (automatic updates not active)';
  }
  function loading() {
    const placeholder = node('div','video-placeholder','Gathering stories from YouTube…');
    collab.replaceChildren(placeholder.cloneNode(true));
    personal.replaceChildren(placeholder);
    collabStatus.textContent=''; personalStatus.textContent='';
  }
  function show(data, cached=false) {
    if (data.collabs?.length) {
      render(collab,data.collabs,MAX_COLLAB);
      collabStatus.textContent=data.collabPartial?'One or more playlists could not be read; showing available collaborations.':'';
    } else {
      render(collab,fallbackSessions,MAX_COLLAB);
      collabStatus.textContent='No public playlist videos found yet; showing the three featured sessions you provided.';
    }
    if (data.personal?.length) {
      render(personal,data.personal,MAX_PERSONAL);
      personalStatus.textContent=data.personalError?'Showing available livestreams. The latest check was incomplete.':'';
    } else {
      const block=node('div','video-placeholder');
      block.appendChild(node('strong','', 'No public personal livestreams found in the recent uploads checked.'));
      const a=node('a','', 'Visit his streams on YouTube ↗');
      a.href='https://www.youtube.com/@daddydepresso/streams'; a.target='_blank'; a.rel='noopener noreferrer';
      block.appendChild(a); personal.replaceChildren(block);
      personalStatus.textContent=data.personalError?'Could not load his channel feed: '+data.personalError:'';
    }
    updateLabel.textContent='✦ '+(cached?'Cached results':'Updated')+' · '+new Date(data.time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  }
  const adapterUrl = new URL('./hub-feed.mjs', document.currentScript.src).href;
  let watcher, inFlight = false, hasFeed = false, signature = '';
  const failure = () => {
    if (hasFeed) updateLabel.textContent = '✦ Showing saved results · Refresh temporarily unavailable';
    else fallback('The feed could not load. Please try again later or visit YouTube.');
  };
  refreshButtons.forEach(button => button.addEventListener('click', async () => {
    if (!watcher || inFlight) return;
    inFlight = true; refreshButtons.forEach(b => b.disabled = true);
    try {await watcher.refresh();}
    finally {inFlight = false; refreshButtons.forEach(b => b.disabled = false);}
  }));
  loading();
  import(adapterUrl).then(({watchCreatorFeed}) => {
    watcher = watchCreatorFeed(cfg, ({data, source}) => {
      const section = data.sections;
      const saved = source === 'fallback' || Object.values(section || {}).some(s => s.status === 'cached');
      const card = video => ({...video, date:video.startedAt || video.publishedAt,
        label:video.featured ? (video.label || 'Featured session') : video.label});
      const view = {
        collabs:data.collabs.map(card),
        personal:data.latestLivestreams.map(v => card({...v,label:'Livestream'})),
        collabPartial:!!data.collabIssues?.length || ['cached','unavailable'].includes(section?.collabs?.status),
        personalError:['cached','unavailable'].includes(section?.videos?.status) ? 'The latest check is unavailable.' : null,
        time:data.updatedAt
      };
      const next = JSON.stringify([view, saved]);
      if (next === signature) return;
      signature = next; hasFeed = true; show(view, saved);
      if (data.collabs.some(v => v.featured)) {
        collabStatus.textContent += (collabStatus.textContent ? ' ' : '') + 'Includes featured sessions from the supplied links.';
      }
    }, failure);
  }).catch(failure);
})();
