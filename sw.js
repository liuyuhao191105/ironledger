/* ==========================================
   sw.js —— Service Worker
   离线缓存 + 后台更新，无网络也能打开铁账本
   v1 — 2026-06-21
   ========================================== */

const CACHE_NAME = 'ironledger-v4';

// 需要预缓存的本地文件
const PRECACHE = [
  './',
  'index.html',
  'css/style.css',
  'js/categories.js',
  'js/storage.js',
  'js/charts.js',
  'js/app.js',
  'manifest.json',
];

// CDN 文件（首次加载后缓存）
const CDN_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

// ========== install：预缓存本地文件 ==========
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting(); // 立即激活
    })
  );
});

// ========== activate：清理旧缓存 ==========
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim(); // 接管所有页面
    })
  );
});

// ========== fetch：网络优先，离线回退缓存 ==========
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function (response) {
      // 网络成功 → 更新缓存，返回最新内容
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function () {
      // 网络失败 → 回退缓存
      return caches.match(event.request).then(function (cached) {
        return cached || new Response('离线不可用', { status: 503 });
      });
    })
  );
});
