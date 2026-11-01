/* Public YouTube feeds: no .github, no server, no search.list (100-unit) requests.
 * Collaborations: newest public videos in the three user-supplied playlists.
 * Personal livestreams: newest uploads with liveStreamingDetails indicating
 * a stream actually started. Public-only; private / deleted cannot be shown.
 */
(() => {
  'use strict';
  const cfg = window.RACCOON_YOUTUBE_CONFIG || {};
  const apiKey = String(cfg.apiKey || '').trim();
  const usableKey = apiKey.length > 15 && !/PASTE|YOUR_|PLACEHOLDER/i.test(apiKey);
  const collab = document.getElementById('collab-videos');
  const personal = document.getElementById('personal-videos');
  const collabStatus = document.getElementById('collab-status');
  const personalStatus = document.getElementById('personal-status');
  const updateLabel = document.getElementById('feed-updated');
  const refreshButtons = [...document.querySelectorAll('[data-refresh]')];
  const cacheKey = 'raccoon-yt-feeds-v2';
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
    card.appendChild(node('p','',why || 'Add a restricted YouTube API key to show the three most recent ones here.'));
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
  async function get(resource, params) {
    const qs = new URLSearchParams({...params,key:apiKey});
    const url = `https://www.googleapis.com/youtube/v3/${resource}?${qs.toString()}`;
    const response = await fetch(url,{headers:{Accept:'application/json'}});
    let data;
    try { data = await response.json(); } catch (_) { throw Error(`YouTube returned HTTP ${response.status}.`); }
    if (!response.ok || data.error) {
      const message = data?.error?.message || `Request failed (${response.status}).`;
      throw Error(message);
    }
    return data;
  }
  function extractIds(items) { return [...new Set((items || []).map(i => i.contentDetails?.videoId || i.snippet?.resourceId?.videoId).filter(id => typeof id === 'string' && id.length === 11))]; }
  async function detailsFor(ids) {
    const unique = [...new Set(ids)];
    const chunks=[];
    for (let i=0; i<unique.length; i+=50) chunks.push(unique.slice(i,i+50));
    const data = await Promise.all(chunks.map(group => get('videos',{part:'snippet,liveStreamingDetails', id:group.join(','), maxResults:50})));
    return data.flatMap(d=>d.items||[]);
  }
  function simplify(v,label) {
    const thumbnails=v.snippet?.thumbnails || {};
    return {
      id:v.id, title:v.snippet?.title || 'YouTube video',
      date:v.liveStreamingDetails?.actualStartTime || v.snippet?.publishedAt || '',
      thumbnail:(thumbnails.medium || thumbnails.high || thumbnails.default || {}).url || imgUrl(v.id),
      label
    };
  }
  async function collaborations() {
    const sources = Array.isArray(cfg.collabPlaylists) ? cfg.collabPlaylists : [];
    const responses = await Promise.allSettled(sources.map(async source=> {
      const d=await get('playlistItems',{part:'snippet,contentDetails',playlistId:source.id,maxResults:50});
      return {ids:extractIds(d.items),label:source.label || 'Collaboration'};
    }));
    const rows = responses.filter(r=>r.status==='fulfilled').map(r=>r.value);
    const errors = responses.filter(r=>r.status==='rejected');
    if (!rows.length) throw Error(errors[0]?.reason?.message || 'The collaboration playlists could not be loaded.');
    const labels = new Map(); rows.forEach(row=>row.ids.forEach(id => { if(!labels.has(id)) labels.set(id,row.label); }));
    const videos = await detailsFor([...labels.keys()]);
    const result = videos.filter(v=>v.id && v.snippet?.title && v.snippet?.title!=='Private video')
      .map(v=>simplify(v,labels.get(v.id)))
      .sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,MAX_COLLAB);
    return {result, partial:errors.length>0};
  }
  function wasLive(v) {
    const streaming = v.liveStreamingDetails;
    return !!(streaming && (streaming.actualStartTime || streaming.actualEndTime || v.snippet?.liveBroadcastContent === 'live'));
  }
  async function personalStreams() {
    const handle = String(cfg.channelHandle || '@daddydepresso').replace(/^@/,'');
    const channel=await get('channels',{part:'contentDetails,snippet',forHandle:handle,maxResults:1});
    const uploads=channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) throw Error('Could not find an uploads playlist for that channel handle.');
    const found=[];
    let pageToken='';
    // Up to 150 of the most recent uploads, to find streams even amid Shorts.
    for(let p=0;p<3 && found.length<MAX_PERSONAL;p++) {
      const d=await get('playlistItems',{part:'contentDetails',playlistId:uploads,maxResults:50,...(pageToken?{pageToken}:{})});
      const ids=extractIds(d.items);
      if (ids.length) {
        const videos=await detailsFor(ids);
        found.push(...videos.filter(wasLive).map(v=>simplify(v,'Livestream')));
      }
      if(!d.nextPageToken) break;
      pageToken=d.nextPageToken;
    }
    return [...new Map(found.map(v=>[v.id,v])).values()]
      .sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,MAX_PERSONAL);
  }
  function saveCache(data) {
    try { localStorage.setItem(cacheKey, JSON.stringify({when:Date.now(),handle:cfg.channelHandle,playlists:JSON.stringify(cfg.collabPlaylists),data})); } catch (_) { /* no localStorage */ }
  }
  function readCache() {
    try {
      const s=JSON.parse(localStorage.getItem(cacheKey)||'null');
      const maxAge=Math.min(Math.max(Number(cfg.refreshHours)||2,0.5),24)*3600000;
      if (s && Date.now()-s.when < maxAge && s.handle === cfg.channelHandle && s.playlists===JSON.stringify(cfg.collabPlaylists)) return s;
    } catch (_) { /* corrupt cache */ }
    return null;
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
  let inFlight=false;
  async function refresh(force=false) {
    if(!usableKey) { fallback('Set up the YouTube API key to show the newest three automatically.'); return; }
    if (!force) {
      const cached=readCache();
      if(cached) { show(cached.data,true); return; }
    }
    if (inFlight) return;
    inFlight=true; refreshButtons.forEach(b=>b.disabled=true); loading();
    const [c,p]=await Promise.allSettled([collaborations(),personalStreams()]);
    const data={collabs:c.status==='fulfilled'?c.value.result:[],collabPartial:c.status==='fulfilled'?c.value.partial:true,
      personal:p.status==='fulfilled'?p.value:[],personalError:p.status==='rejected'?p.reason?.message:null,time:Date.now()};
    if(c.status==='rejected') collabStatus.textContent='Collab fetch issue: '+c.reason.message;
    if(c.status==='rejected' && p.status==='rejected') {
      fallback('YouTube requests failed. Check key, domain referrer restrictions, playlist IDs, and API quota.');
      collabStatus.textContent='YouTube API error: '+c.reason.message;
      personalStatus.textContent='YouTube API error: '+p.reason.message;
    } else { show(data); saveCache(data); if(c.status==='rejected') collabStatus.textContent='Collab fetch issue: '+c.reason.message; }
    inFlight=false; refreshButtons.forEach(b=>b.disabled=false);
  }
  refreshButtons.forEach(b=>b.addEventListener('click',()=>refresh(true)));
  refresh(false);
})();
