var CACHE_NAME = 'tsukiyomi-v2';
var CACHE_URLS = [
  './wonderland_gate.html',
  './challenge_intro.html',
  './challenge_day1_sync.html',
  './challenge_day2_sync.html',
  './challenge_day3_sync.html',
  './challenge_day4_sync.html',
  './challenge_day5_sync.html',
  './challenge_day6_sync.html',
  './challenge_day7_sync.html',
  './moon_diary_book.html',
  './moon_seed_deep_report.html',
  './moon_diary_7days_summary.html',
  './moon_cycle_dashboard.html',
  './moon_cycle_diary.html',
  './moon_cycle_report.html',
  './moon_cycle_data.js',
  './app.js',
  './diary_data_sync.js',
  './style.css',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/moon_diary_cover.png',
  './images/deep_report_frame.png',
  './images/antique_paper_bg.jpg'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // GASへのリクエストはキャッシュしない
  if (e.request.url.indexOf('script.google.com') !== -1) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function() {
        return cached;
      });
    })
  );
});
