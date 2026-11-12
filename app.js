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

  // Booking form -> pre-filled email
  var form = document.getElementById('bookForm');
  var note = document.getElementById('formNote');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var name = form.elements.name, email = form.elements.email;
    var ok = true;
    [name, email].forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (!String(d.get('name')).trim()) { name.setAttribute('aria-invalid', 'true'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.get('email')).trim())) { email.setAttribute('aria-invalid', 'true'); ok = false; }
    if (!ok) {
      note.textContent = 'Please add your name and a valid email so Schmidty can reply.';
      note.className = 'form-note is-error';
      (name.getAttribute('aria-invalid') ? name : email).focus();
      return;
    }
    var subject = 'Booking request: ' + d.get('type') + (d.get('org') ? ' for ' + d.get('org') : '');
    var body = [
      'Name: ' + d.get('name'),
      'Organization: ' + (d.get('org') || '-'),
      'Email: ' + d.get('email'),
      'Event date: ' + (d.get('date') || 'TBD'),
      'Event type: ' + d.get('type'),
      'Audience size: ' + d.get('size'),
      '',
      'Desired takeaway:',
      d.get('message') || '-'
    ].join('\n');
    var href = 'mailto:schmidtyspeaks@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    var a = document.createElement('a');
    a.href = href; a.target = '_top'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    note.innerHTML = 'Your email app should open now. If it doesn\u2019t, email <a href="' + href + '" target="_top">schmidtyspeaks@gmail.com</a>.';
    note.className = 'form-note is-ok';
  });
})();
