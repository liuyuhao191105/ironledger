/* ==========================================
   sw.js —— Service Worker
   离线缓存 + 后台更新，无网络也能打开铁账本
   v1 — 2026-06-21
   ========================================== */

const CACHE_NAME = 'ironledger-v3';

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

// ========== fetch：缓存优先，后台更新 ==========
self.addEventListener('fetch', function (event) {
  // 只处理 GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        // 有缓存：后台拉新版本（下次生效）
        fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, response);
            });
          }
        }).catch(function () { /* 离线时 fetch 失败，忽略 */ });
        return cached;
      }

      // 无缓存：网络请求
      return fetch(event.request).then(function (response) {
        // 只缓存成功响应
        if (!response || response.status !== 200) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        // 离线且无缓存：对 HTML 请求返回空壳（实际不会触发，因为首页已预缓存）
        return new Response('离线不可用', { status: 503 });
      });
    })
  );
});
