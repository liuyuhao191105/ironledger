/* ==========================================
   storage.js —— localStorage 读写封装
   ========================================== */

// ---------- 键名 ----------
const STORAGE_KEY = 'ledger_data';

/**
 * 按分类名生成标签存储 key
 * 例：categoryKey('饮食餐食') → 'ledger_ctag_饮食餐食'
 */
function categoryKey(catName) {
  return 'ledger_ctag_' + catName;
}

// ==================== 账单数据 ====================

function loadBills() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function saveBills(bills) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

// ==================== 标签数据 ====================

/**
 * 按分类名读取标签列表
 * 逻辑：预设 - 已删预设 + 自定义 = 当前可见标签
 * @param {string} catName - 分类名
 * @returns {Array<string>}
 */
function loadTags(catName) {
  var presets = CATEGORY_TAGS[catName] || [];
  var raw = localStorage.getItem(categoryKey(catName));
  var deletedPresets = [];
  var custom = [];

  if (raw) {
    try {
      var data = JSON.parse(raw);
      deletedPresets = data.d || [];
      custom = data.c || [];
    } catch (e) { /* ignore */ }
  }

  // 预设中剔除已删的
  var result = [];
  presets.forEach(function (p) {
    if (deletedPresets.indexOf(p) === -1) result.push(p);
  });
  // 追加自定义（去重）
  custom.forEach(function (c) {
    if (result.indexOf(c) === -1) result.push(c);
  });
  return result;
}

/**
 * 按分类名保存标签变更
 * 存储结构：{ d: [已删预设名], c: [自定义标签名] }
 * @param {string} catName
 * @param {Array<string>} tags - 当前完整标签列表（含预设 + 自定义）
 */
function saveTags(catName, tags) {
  var presets = CATEGORY_TAGS[catName] || [];
  var deletedPresets = [];
  var custom = [];

  // 预设中有但当前列表没有 → 用户已删除
  presets.forEach(function (p) {
    if (tags.indexOf(p) === -1) deletedPresets.push(p);
  });

  // 当前列表中有但预设没有 → 用户自定义
  tags.forEach(function (t) {
    if (presets.indexOf(t) === -1) custom.push(t);
  });

  localStorage.setItem(categoryKey(catName), JSON.stringify({
    d: deletedPresets,
    c: custom
  }));
}
