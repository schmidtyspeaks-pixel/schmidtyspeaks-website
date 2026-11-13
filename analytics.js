/* Schmidty Speaks analytics
 * Paste a GA4 Measurement ID (e.g. 'G-ABC123XYZ') below to turn on Google Analytics.
 * Leave it empty and nothing loads: no cookies, no network requests, events are ignored.
 */
var GA_ID = '';

(function () {
  var enabled = /^G-[A-Z0-9]+$/i.test(GA_ID);

  if (enabled) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID); // sends the page_view
  }

  // Small event helper used across the site. Safe to call whether or not GA is on.
  window.ssTrack = function (name, params) {
    params = params || {};
    params.page_path = params.page_path || location.pathname;
    if (enabled && typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
    if (window.SS_DEBUG && window.console) console.log('[track]', name, params);
  };

  var SOCIAL = /(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|linkedin\.com|facebook\.com|x\.com|twitter\.com)/i;

  // Downloads and outbound social clicks (delegated, works for links added later)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (a.hasAttribute('data-download') || /\.pdf(\?|#|$)/i.test(href) || (a.hasAttribute('download') && /\.(jpe?g|png)$/i.test(href))) {
      var file = href.split('/').pop().split('?')[0];
      window.ssTrack('file_download', { file_name: file, link_url: a.href, file_extension: file.split('.').pop() });
      return;
    }
    if (a.hostname && a.hostname !== location.hostname && SOCIAL.test(a.hostname)) {
      window.ssTrack('click_social', { link_url: a.href, network: a.hostname.replace(/^www\./, '').split('.')[0] });
    }
  });

  // Native clip plays (play events don't bubble, so capture them)
  document.addEventListener('play', function (e) {
    var v = e.target;
    if (!v || v.tagName !== 'VIDEO' || v.dataset.tracked) return;
    v.dataset.tracked = '1';
    var src = (v.currentSrc || v.getAttribute('src') || '').split('/').pop();
    window.ssTrack('video_play', { video_provider: 'self', video_title: v.getAttribute('aria-label') || src, video_url: src });
  }, true);
})();
