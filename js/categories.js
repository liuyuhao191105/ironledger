/* ==========================================
   categories.js —— 分类和标签的配置数据
   ========================================== */

/** 预设支出分类（7 个固定大类，不可增删改） */
const EXPENSE_CATEGORIES = [
  '饮食餐食', '健身投入', '日常日用', '学习交通',
  '社交娱乐', '医疗备用', '其他杂项'
];

/** 预设收入分类（4 个固定大类，不可增删改） */
const INCOME_CATEGORIES = [
  '生活费', '兼职', '红包/奖励', '其他收入'
];

/**
 * 每个分类独立绑定的专属标签池
 * key = 分类名，value = 预设标签数组
 * 标签只做明细筛选，不参与金额统计
 */
const CATEGORY_TAGS = {
  // ---- 支出 ----
  '饮食餐食': ['早餐', '午餐', '晚餐', '训练加餐', '外卖', '自制餐'],
  '健身投入': ['日常训练', '备赛', '增肌', '减脂', '装备更新', '私教课'],
  '日常日用': ['宿舍耗材', '洗护用品', '月度囤货', '一次性用品'],
  '学习交通': ['通勤', '教材采购', '校内打印', '外出办事'],
  '社交娱乐': ['朋友聚餐', '下午茶', '单人消遣', '节日送礼'],
  '医疗备用': ['运动损伤', '日常小病', '体检', '防护药膏'],
  '其他杂项': ['快递运费', '临时零碎开销'],

  // ---- 收入 ----
  '生活费':     ['爸爸转账', '妈妈转账', '长辈补贴', '月度固定发放'],
  '兼职':       ['健身助教', '校内勤工', '周末工', '赛事劳务'],
  '红包/奖励':  ['生日红包', '节日礼金', '奖学金', '竞赛奖金'],
  '其他收入':   ['二手转卖', '理财收益', '临时补助'],
};

/** 收入标签色板（冷色深→浅 5 阶） */
const INCOME_TAG_COLORS = ['#0a2846', '#005878', '#008b90', '#00c495', '#86ddbc'];

/** 支出标签色板（暖色深紫→浅粉 5 阶） */
const EXPENSE_TAG_COLORS = ['#912244', '#c44850', '#e06b42', '#f2935c', '#e8b0d0'];

/**
 * 字符串哈希 → 整数（同一字符串永远返回同一值）
 * @param {string} s
 * @returns {number}
 */
function hashStr(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h | 0;
  }
  return Math.abs(h);
}

/**
 * 按标签名哈希取色，同名标签永远同一个颜色
 * @param {string} name - 标签名或分类名
 * @param {'income'|'expense'} [type]
 * @returns {string}
 */
function getTagColorByName(name, type) {
  var colors = type === 'expense' ? EXPENSE_TAG_COLORS : INCOME_TAG_COLORS;
  return colors[hashStr(name) % colors.length];
}

/**
 * 判断 hex 颜色是否为浅色（用于决定文字用深色还是白色）
 * 使用相对亮度公式，> 0.5 判定为浅色
 * @param {string} hex - 如 '#86ddbc'
 * @returns {boolean}
 */
function isLightColor(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5;
}
