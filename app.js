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

  // Booking form -> emailed to Schmidty (Web3Forms) + instant phone alert (ntfy)
  var W3F_ENDPOINT = 'https://api.web3forms.com/submit';
  var W3F_KEY = '34744278-2264-452a-a3f9-62e95d0c0af3';
  var NTFY_TOPIC = 'schmidty-bookings-c6615a2cbc';
  var form = document.getElementById('bookForm');
  var note = document.getElementById('formNote');
  var submitBtn = form.querySelector('button[type="submit"]');
  function cleanEmail(v) {
    return String(v || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '').replace(/^mailto:/i, '').replace(/[.,;]+$/, '');
  }
  function phoneAlert(f) {
    // Push to Schmidty's phone via the ntfy app. text/plain JSON avoids a CORS preflight.
    var msg = f.Name + (f.Organization !== '-' ? ' (' + f.Organization + ')' : '') +
      '\n' + f['Event type'] + ' | ' + f['Event date'] + ' | ' + f['Audience size'] +
      '\nEmail: ' + f.Email + (f.Phone !== '-' ? '\nPhone: ' + f.Phone : '') +
      (f['Desired takeaway'] !== '-' ? '\n' + String(f['Desired takeaway']).slice(0, 300) : '');
    try {
      return fetch('https://ntfy.sh/', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ topic: NTFY_TOPIC, title: 'New booking request', message: msg, priority: 5, tags: ['microphone'], click: 'mailto:' + f.Email }),
        keepalive: true
      }).catch(function () {});
    } catch (err) { return Promise.resolve(); }
  }
  function toFormData(o) {
    var fd = new FormData();
    Object.keys(o).forEach(function (k) { fd.append(k, o[k]); });
    return fd;
  }
  function nativePost(o) {
    var f = document.createElement('form');
    f.method = 'POST'; f.action = W3F_ENDPOINT; f.style.display = 'none';
    o.redirect = location.origin + location.pathname + '?sent=1#book';
    Object.keys(o).forEach(function (k) {
      var i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = o[k]; f.appendChild(i);
    });
    document.body.appendChild(f); f.submit();
  }
  if (/[?&]sent=1/.test(location.search)) {
    note.textContent = 'Thank you. Your request is on its way and Schmidty will follow up personally.';
    note.className = 'form-note is-ok';
  }
  function done(ok, msg) {
    if (ok) form.reset();
    note.innerHTML = msg;
    note.className = 'form-note ' + (ok ? 'is-ok' : 'is-error');
    submitBtn.disabled = false; submitBtn.textContent = 'Send booking request';
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
    var fields = {
      Name: nameVal,
      Organization: d.get('org') || '-',
      Email: emailVal,
      Phone: d.get('phone') || '-',
      'Event date': d.get('date') || 'TBD',
      'Event type': d.get('type'),
      'Audience size': d.get('size'),
      'Desired takeaway': d.get('message') || '-'
    };
    var payload = Object.assign({
      access_key: W3F_KEY,
      subject: 'New booking request: ' + d.get('type') + (d.get('org') ? ' for ' + d.get('org') : '') + ' (' + nameVal + ')',
      from_name: 'SchmidtySpeaks.com',
      replyto: emailVal
    }, fields);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending\u2026';
    note.textContent = '';
    note.className = 'form-note';
    var alertSent = phoneAlert(fields);
    var fail = 'We couldn\u2019t send that just now. Please email <a href="mailto:schmidtyspeaks@gmail.com">schmidtyspeaks@gmail.com</a> or call <a href="tel:+12483303231">248-330-3231</a>.';
    fetch(W3F_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: toFormData(payload) // multipart = "simple" request, no CORS preflight
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.success === false) throw new Error(j.message || 'Send failed');
      });
    }).then(function () {
      done(true, 'Thank you. Your request is on its way and Schmidty will follow up personally.');
    }).catch(function (err) {
      if (window.console) console.warn('Form service:', err && err.message);
      // Network/CORS hiccup: retry as a classic form post (no CORS involved), which returns to the site.
      if (!(err && err.message && err.message !== 'Failed to fetch' && !/NetworkError|Load failed/i.test(err.message))) {
        alertSent.then(function () { nativePost(payload); });
        return;
      }
      alertSent.then(function () { done(false, fail); });
    });
  });

  // Live clips: only one plays at a time
  document.querySelectorAll('.clip video').forEach(function (v) {
    v.addEventListener('play', function () {
      document.querySelectorAll('.clip video').forEach(function (o) { if (o !== v) o.pause(); });
    });
  });
})();
