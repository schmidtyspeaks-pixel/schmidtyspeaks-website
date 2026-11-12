(function () {
  document.documentElement.classList.add('js');

  // Header state
  var header = document.getElementById('header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
  }
  btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

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

  // Video player (lite YouTube embed)
  var player = document.getElementById('player');
  var poster = document.getElementById('playerPoster');
  var posterImg = document.getElementById('playerImg');
  var titleEl = document.getElementById('playerTitle');
  var grid = document.getElementById('videoGrid');

  function embed(id, title) {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
    f.title = title;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true;
    var old = player.querySelector('iframe');
    if (old) old.remove();
    poster.hidden = true;
    player.insertBefore(f, poster);
    player.classList.add('is-playing');
  }
  function select(id, title, autoplay) {
    player.dataset.id = id;
    titleEl.textContent = title;
    posterImg.src = 'assets/yt/' + id + '.jpg';
    poster.setAttribute('aria-label', 'Play video: ' + title);
    grid.querySelectorAll('.vid').forEach(function (v) { v.classList.toggle('is-active', v.dataset.id === id); });
    if (autoplay) embed(id, title);
  }
  poster.addEventListener('click', function () { embed(player.dataset.id, titleEl.textContent); });
  grid.addEventListener('click', function (e) {
    var v = e.target.closest('.vid');
    if (!v) return;
    select(v.dataset.id, v.dataset.title, true);
    player.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Booking form -> emailed straight to Schmidty (FormSubmit), with a text alert copy
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/schmidtyspeaks@gmail.com';
  var SMS_CC = '2483303231@vtext.com'; // carrier email-to-text address, e.g. 2483303231@vtext.com
  var form = document.getElementById('bookForm');
  var note = document.getElementById('formNote');
  var submitBtn = form.querySelector('button[type="submit"]');
  function cleanEmail(v) {
    // strip spaces, zero-width characters, and stray punctuation that phones/autofill can add
    return String(v || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '').replace(/^mailto:/i, '').replace(/[.,;]+$/, '');
  }
  function nativeSubmit(payload) {
    // Fallback: classic form post (no CORS), returns to the site afterwards
    var f = document.createElement('form');
    f.method = 'POST';
    f.action = FORM_ENDPOINT.replace('/ajax/', '/');
    f.style.display = 'none';
    var extra = { _captcha: 'false', _next: location.origin + location.pathname + '?sent=1#book' };
    Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    Object.keys(payload).forEach(function (k) {
      var i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = payload[k]; f.appendChild(i);
    });
    document.body.appendChild(f);
    f.submit();
  }
  if (/[?&]sent=1/.test(location.search)) {
    note.textContent = 'Thank you. Your request is on its way and Schmidty will follow up personally.';
    note.className = 'form-note is-ok';
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal)) { email.setAttribute('aria-invalid', 'true'); problems.push('a valid email address (like name@company.com)'); }
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
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending\u2026';
    note.textContent = '';
    note.className = 'form-note';
    var serverSaid = null;
    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || String(j.success) === 'false') { serverSaid = j.message || null; throw new Error(serverSaid || 'Send failed'); }
      });
    })
      .then(function () {
        form.reset();
        note.textContent = 'Thank you. Your request is on its way and Schmidty will follow up personally.';
        note.className = 'form-note is-ok';
        submitBtn.disabled = false; submitBtn.textContent = 'Send booking request';
      })
      .catch(function () {
        if (!serverSaid) { nativeSubmit(payload); return; } // network/CORS hiccup: use the classic post
        note.innerHTML = 'We couldn\u2019t send that just now. Please email <a href="mailto:schmidtyspeaks@gmail.com">schmidtyspeaks@gmail.com</a> or call <a href="tel:+12483303231">248-330-3231</a>.';
        note.className = 'form-note is-error';
        if (window.console) console.warn('Form service:', serverSaid);
        submitBtn.disabled = false; submitBtn.textContent = 'Send booking request';
      });
  });

  // Live clips: only one plays at a time
  document.querySelectorAll('.clip video').forEach(function (v) {
    v.addEventListener('play', function () {
      document.querySelectorAll('.clip video').forEach(function (o) { if (o !== v) o.pause(); });
    });
  });
})();
