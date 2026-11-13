(function () {
  document.documentElement.classList.add('js');
  function track(name, params) { if (typeof window.ssTrack === 'function') window.ssTrack(name, params); }

  // Header state
  var header = document.getElementById('header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  function closeGroups(except) {
    document.querySelectorAll('.nav-group.is-open').forEach(function (g) {
      if (g === except) return;
      g.classList.remove('is-open');
      var b = g.querySelector('.nav-drop-btn'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  function setMenu(open) {
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    if (!open) closeGroups();
  }
  if (btn && nav) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }
  // Nav dropdowns ("Talks", "Who it's for"): click/tap to toggle, hover on desktop via CSS
  document.querySelectorAll('.nav-drop-btn').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var g = b.closest('.nav-group');
      var open = !g.classList.contains('is-open');
      closeGroups(g);
      g.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.nav-group')) closeGroups(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); closeGroups(); } });

  // Smooth in-page links without touching history (works inside sandboxed previews)
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Reveal on scroll
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Video players (lite YouTube embed). Any .player works; a .video-grid[data-player] can drive it.
  function playerParts(player) {
    return {
      poster: player.querySelector('.player-poster'),
      img: player.querySelector('.player-poster img'),
      title: player.querySelector('.player-meta .h3')
    };
  }
  function embed(player, id, title) {
    var p = playerParts(player);
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
    f.title = title;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true;
    var old = player.querySelector('iframe');
    if (old) old.remove();
    p.poster.hidden = true;
    player.insertBefore(f, p.poster);
    player.classList.add('is-playing');
    track('video_play', { video_provider: 'youtube', video_id: id, video_title: title });
  }
  document.querySelectorAll('.player').forEach(function (player) {
    var p = playerParts(player);
    if (!p.poster) return;
    p.poster.addEventListener('click', function () { embed(player, player.dataset.id, p.title ? p.title.textContent : 'Video'); });
  });
  document.querySelectorAll('.video-grid').forEach(function (grid) {
    var player = document.getElementById(grid.dataset.player || 'player');
    if (!player) return;
    grid.addEventListener('click', function (e) {
      var v = e.target.closest('.vid');
      if (!v) return;
      var p = playerParts(player);
      player.dataset.id = v.dataset.id;
      if (p.title) p.title.textContent = v.dataset.title;
      if (p.img) p.img.src = '/assets/yt/' + v.dataset.id + '.jpg';
      p.poster.setAttribute('aria-label', 'Play video: ' + v.dataset.title);
      grid.querySelectorAll('.vid').forEach(function (o) { o.classList.toggle('is-active', o === v); });
      embed(player, v.dataset.id, v.dataset.title);
      player.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // Shared FormSubmit helpers
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/schmidtyspeaks@gmail.com';
  function cleanEmail(v) {
    // strip spaces, zero-width characters, and stray punctuation that phones/autofill can add
    return String(v || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '').replace(/^mailto:/i, '').replace(/[.,;]+$/, '');
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function nativeSubmit(payload, next) {
    // Fallback: classic form post (no CORS), returns to the site afterwards
    var f = document.createElement('form');
    f.method = 'POST';
    f.action = FORM_ENDPOINT.replace('/ajax/', '/');
    f.style.display = 'none';
    payload._captcha = 'false';
    payload._next = next;
    Object.keys(payload).forEach(function (k) {
      var i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = payload[k]; f.appendChild(i);
    });
    document.body.appendChild(f);
    f.submit();
  }
  function send(payload) {
    var serverSaid = null;
    return fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || String(j.success) === 'false') { serverSaid = j.message || 'Send failed'; var err = new Error(serverSaid); err.server = true; throw err; }
      });
    });
  }

  // Booking form -> emailed straight to Schmidty (FormSubmit), with a text alert copy
  var SMS_CC = '2483303231@vtext.com'; // carrier email-to-text address, e.g. 2483303231@vtext.com
  var form = document.getElementById('bookForm');
  if (form) {
    var note = document.getElementById('formNote');
    var submitBtn = form.querySelector('button[type="submit"]');

    // Preselect event type from ?type=Workshop (links from talk and audience pages)
    var typeParam = (location.search.match(/[?&]type=([^&]+)/) || [])[1];
    if (typeParam) {
      var want = decodeURIComponent(typeParam.replace(/\+/g, ' ')).toLowerCase();
      var sel = form.elements.type;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text.toLowerCase().indexOf(want) !== -1) { sel.selectedIndex = i; break; }
      }
    }
    if (/[?&]sent=1/.test(location.search)) {
      note.textContent = 'Thank you. Your request is on its way and Schmidty will follow up personally.';
      note.className = 'form-note is-ok';
      track('generate_lead', { form_id: 'booking', method: 'fallback' });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      if (String(d.get('_honey') || '').trim()) return;
      var name = form.elements.name, email = form.elements.email;
      var nameVal = String(d.get('name') || '').trim();
      var emailVal = cleanEmail(d.get('email'));
      email.value = emailVal;
      [name, email].forEach(function (el) { el.removeAttribute('aria-invalid'); });
      var problems = [];
      if (!nameVal) { name.setAttribute('aria-invalid', 'true'); problems.push('your name'); }
      if (!validEmail(emailVal)) { email.setAttribute('aria-invalid', 'true'); problems.push('a valid email address (like name@company.com)'); }
      if (problems.length) {
        note.textContent = 'Please add ' + problems.join(' and ') + ' so Schmidty can reply.';
        note.className = 'form-note is-error';
        (name.getAttribute('aria-invalid') ? name : email).focus();
        return;
      }
      var payload = {
        _subject: 'New booking request: ' + d.get('type') + (d.get('org') ? ' for ' + d.get('org') : '') + ' (' + nameVal + ')',
        _template: 'table',
        _replyto: emailVal,
        Name: nameVal,
        Organization: d.get('org') || '-',
        Email: emailVal,
        Phone: d.get('phone') || '-',
        'Event date': d.get('date') || 'TBD',
        'Event type': d.get('type'),
        'Audience size': d.get('size'),
        'Desired takeaway': d.get('message') || '-'
      };
      if (SMS_CC) payload._cc = SMS_CC;
      var leadInfo = { event_type: d.get('type'), audience_size: d.get('size'), form_id: 'booking' };
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending\u2026';
      note.textContent = '';
      note.className = 'form-note';
      send(payload)
        .then(function () {
          form.reset();
          note.textContent = 'Thank you. Your request is on its way and Schmidty will follow up personally.';
          note.className = 'form-note is-ok';
          submitBtn.disabled = false; submitBtn.textContent = 'Send booking request';
          track('generate_lead', leadInfo);
        })
        .catch(function (err) {
          if (!err || !err.server) { // network/CORS hiccup: use the classic post
            nativeSubmit(payload, location.origin + location.pathname + '?sent=1#book');
            return;
          }
          note.innerHTML = 'We couldn\u2019t send that just now. Please email <a href="mailto:schmidtyspeaks@gmail.com">schmidtyspeaks@gmail.com</a> or call <a href="tel:+12483303231">248-330-3231</a>.';
          note.className = 'form-note is-error';
          if (window.console) console.warn('Form service:', err.message);
          submitBtn.disabled = false; submitBtn.textContent = 'Send booking request';
        });
    });
  }

  // Workbook signup forms (home section + landing page)
  function showDownload(box) {
    box.classList.add('is-done');
    var done = box.querySelector('.signup-done');
    if (done) { done.hidden = false; var dl = done.querySelector('a'); if (dl) dl.focus({ preventScroll: true }); }
  }
  document.querySelectorAll('.signup-form').forEach(function (sf) {
    var box = sf.closest('.signup') || sf.parentNode;
    var sNote = sf.querySelector('.form-note');
    var sBtn = sf.querySelector('button[type="submit"]');
    var label = sBtn.textContent;
    if (/[?&]signed=1/.test(location.search)) { showDownload(box); track('sign_up', { method: 'workbook', form_id: sf.id || 'workbook', via: 'fallback' }); }
    sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(sf);
      if (String(d.get('_honey') || '').trim()) return;
      var nameEl = sf.elements.name, emailEl = sf.elements.email;
      var nameVal = String(d.get('name') || '').trim();
      var emailVal = cleanEmail(d.get('email'));
      emailEl.value = emailVal;
      [nameEl, emailEl].forEach(function (el) { el.removeAttribute('aria-invalid'); });
      var problems = [];
      if (!nameVal) { nameEl.setAttribute('aria-invalid', 'true'); problems.push('your name'); }
      if (!validEmail(emailVal)) { emailEl.setAttribute('aria-invalid', 'true'); problems.push('a valid email address'); }
      if (problems.length) {
        sNote.textContent = 'Please add ' + problems.join(' and ') + ' to get the workbook.';
        sNote.className = 'form-note is-error';
        (nameEl.getAttribute('aria-invalid') ? nameEl : emailEl).focus();
        return;
      }
      var role = d.get('role') || 'Not given';
      var payload = {
        _subject: 'New workbook signup - Schmidty Speaks',
        _template: 'table',
        _replyto: emailVal,
        Name: nameVal,
        Email: emailVal,
        'I am a': role,
        'Signed up on': location.pathname
      };
      var info = { method: 'workbook', role: role, form_id: sf.id || 'workbook' };
      sBtn.disabled = true; sBtn.textContent = 'Sending\u2026';
      sNote.textContent = ''; sNote.className = 'form-note';
      send(payload)
        .then(function () {
          sf.reset();
          sBtn.disabled = false; sBtn.textContent = label;
          track('sign_up', info);
          showDownload(box);
        })
        .catch(function (err) {
          if (!err || !err.server) {
            nativeSubmit(payload, location.origin + location.pathname + '?signed=1#' + (box.id || 'workbook'));
            return;
          }
          sNote.innerHTML = 'That didn\u2019t go through. Try again, or email <a href="mailto:schmidtyspeaks@gmail.com">schmidtyspeaks@gmail.com</a> and we\u2019ll send it over.';
          sNote.className = 'form-note is-error';
          sBtn.disabled = false; sBtn.textContent = label;
        });
    });
  });

  // Copy-to-clipboard buttons (Planner Kit)
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok ? Promise.resolve() : Promise.reject();
  }
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    var original = b.textContent;
    b.addEventListener('click', function () {
      var src = document.getElementById(b.getAttribute('data-copy'));
      if (!src) return;
      var text = src.innerText.trim();
      var p = (navigator.clipboard && window.isSecureContext) ? navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); }) : fallbackCopy(text);
      p.then(function () {
        b.textContent = 'Copied'; b.classList.add('is-copied');
      }, function () {
        b.textContent = 'Select and copy';
      }).then(function () {
        setTimeout(function () { b.textContent = original; b.classList.remove('is-copied'); }, 1800);
      });
    });
  });

  // Live clips: only one plays at a time
  document.querySelectorAll('.clip video').forEach(function (v) {
    v.addEventListener('play', function () {
      document.querySelectorAll('.clip video').forEach(function (o) { if (o !== v) o.pause(); });
    });
  });
})();
