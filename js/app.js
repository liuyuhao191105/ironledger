/* ==========================================
   app.js —— 主控逻辑
   Phase A：底栏骨架 + Tab 切换
   Phase B：表格 CRUD + 统计刷新 + 图表联动
   （弹窗交互 / 分类联动 / 金额校验 / 标签着色 / 提交 / 编辑 / 删除）
   ========================================== */

// ---------- 全局状态 ----------

var currentDate  = new Date().toISOString().slice(0, 10);
var currentTab   = 'ledger';        // 当前激活的 Tab
var editingId    = null;
var currentType  = 'expense';
var selectedTag = null;

// ---------- DOM 引用 ----------

var datePicker     = document.getElementById('datePicker');
var addBtn         = document.getElementById('addBtn');
var modalOverlay   = document.getElementById('modalOverlay');
var modalTitle     = document.getElementById('modalTitle');
var modalClose     = document.getElementById('modalClose');
var modalCancel    = document.getElementById('modalCancel');
var modalConfirm   = document.getElementById('modalConfirm');
var typeSwitch     = document.getElementById('typeSwitch');
var categorySelect = document.getElementById('categorySelect');
var amountInput    = document.getElementById('amountInput');
var tagList        = document.getElementById('tagList');
var tagInput       = document.getElementById('tagInput');
var tagAddBtn      = document.getElementById('tagAddBtn');
var noteInput      = document.getElementById('noteInput');
var amountError    = document.getElementById('amountError');
var billTooltip    = document.getElementById('billTooltip');

// ---------- 工具函数 ----------
// getTagColorByName() 由 categories.js 提供，按标签名哈希取色

// ---------- 账单浮窗 ----------

/** 显示浮窗：分类 / 备注 / 金额（无收支颜色） */
function showTooltip(bill, e) {
  billTooltip.innerHTML =
    '<div class="bill-tooltip__row"><span class="bill-tooltip__label">分类</span><span class="bill-tooltip__value">' + bill.category + '</span></div>' +
    '<div class="bill-tooltip__row"><span class="bill-tooltip__label">备注</span><span class="bill-tooltip__value">' + (bill.note || '无') + '</span></div>' +
    '<div class="bill-tooltip__row"><span class="bill-tooltip__label">金额</span><span class="bill-tooltip__value">¥' + bill.amount.toFixed(2) + '</span></div>';
  billTooltip.style.display = 'block';
  positionTooltip(e);
}

/** 浮窗跟随鼠标 */
function positionTooltip(e) {
  var x = e.clientX + 14;
  var y = e.clientY + 14;
  // 防溢出右边界
  if (x + 220 > window.innerWidth) x = e.clientX - 230;
  // 防溢出下边界
  if (y + 80 > window.innerHeight) y = e.clientY - 90;
  billTooltip.style.left = x + 'px';
  billTooltip.style.top  = y + 'px';
}

function hideTooltip() {
  billTooltip.style.display = 'none';
}

// ---------- 初始化 ----------

function init() {
  datePicker.value = currentDate;

  // ---- 底部导航 Tab 切换 ----
  document.querySelectorAll('.bottom-nav__item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(this.dataset.tab);
    });
  });

  addBtn.addEventListener('click', openAddModal);
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  // 收支类型切换
  typeSwitch.querySelectorAll('.switch__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchType(this.dataset.type);
    });
  });

  // 金额实时校验
  amountInput.addEventListener('input', function () {
    validateAmount(this.value);
  });

  // 标签新增：回车（桌面）或点击添加按钮（移动端）
  tagInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTagInput();
    }
  });
  tagAddBtn.addEventListener('click', function () {
    commitTagInput();
  });

  // 确认提交
  modalConfirm.addEventListener('click', submitForm);

  // 分类切换 → 联动刷新标签池
  categorySelect.addEventListener('change', function () {
    selectedTag = null;
    renderTags();
  });

  // 日期切换：所有 Tab 共享的数据联动刷新
  datePicker.addEventListener('change', function () {
    currentDate = this.value;
    renderAll();
  });

  if (typeof Chart !== 'undefined') {
    initCharts();
  }

  // 初始渲染（加载当日数据）
  renderAll();

  console.log('Phase B 就绪：表格 CRUD + 统计刷新 + 图表联动');
}

// ==================== Tab 切换 ====================

/**
 * 切换底部 Tab 页面
 * 数据流：更新 currentTab → toggle 导航高亮 → toggle 页面显隐
 * FAB 因为放在 #tabLedger 内部，切走时自动隐藏
 */
function switchTab(tabName) {
  if (currentTab === tabName) return;
  currentTab = tabName;

  // 底部导航高亮切换
  document.querySelectorAll('.bottom-nav__item').forEach(function (btn) {
    btn.classList.toggle('bottom-nav__item--active', btn.dataset.tab === tabName);
  });

  // 页面容器显隐切换
  document.querySelectorAll('.tab-page').forEach(function (page) {
    page.classList.toggle('tab-page--active', page.id === 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  });

  console.log('📑 切换到：' + tabName);
}

// ==================== 弹窗控制 ====================

function openAddModal() {
  editingId = null;
  modalTitle.textContent = '新增记录';
  currentType = 'expense';
  selectedTag = null;
  resetForm();
  setModalTypeClass();
  modalOverlay.classList.add('modal-overlay--open');
}

function closeModal() {
  modalOverlay.classList.remove('modal-overlay--open');
  resetForm();
  renderAll();   // 弹窗关闭时刷新主界面（分类管理可能改过数据）
}

function resetForm() {
  typeSwitch.querySelector('[data-type="expense"]').classList.add('switch__btn--active');
  typeSwitch.querySelector('[data-type="income"]').classList.remove('switch__btn--active');
  currentType = 'expense';
  amountInput.value = '';
  clearAmountError();
  noteInput.value = '';
  tagInput.value = '';
  selectedTag = null;
  renderCategories();
  renderTags();
}

// ==================== 类型切换 ====================

function switchType(type) {
  if (currentType === type) return;
  currentType = type;
  typeSwitch.querySelectorAll('.switch__btn').forEach(function (btn) {
    btn.classList.toggle('switch__btn--active', btn.dataset.type === type);
  });
  setModalTypeClass();
  selectedTag = null;    // 切换类型时清空已选标签
  renderCategories();
  renderTags();         // 标签列表跟随类型刷新
}

/** 弹窗顶边 + 确认按钮跟随收支类型变色 */
function setModalTypeClass() {
  var modal = document.getElementById('modal');
  modal.classList.remove('modal--expense', 'modal--income');
  modal.classList.add(currentType === 'expense' ? 'modal--expense' : 'modal--income');
}

// ==================== 分类 ====================

/** 渲染分类下拉框（直接读取预设，不可自定义） */
function renderCategories() {
  var cats = currentType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  categorySelect.innerHTML = '';
  cats.forEach(function (name) {
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    categorySelect.appendChild(opt);
  });
}

// ==================== 金额校验 ====================

function validateAmount(value) {
  if (value === '' || value === null) {
    showAmountError('请填写金额');
    return false;
  }
  var num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    showAmountError('金额必须为正数');
    return false;
  }
  var parts = value.split('.');
  if (parts.length === 2 && parts[1].length > 2) {
    showAmountError('最多两位小数');
    return false;
  }
  clearAmountError();
  return true;
}

/** 显示金额报错 */
function showAmountError(msg) {
  amountInput.classList.add('form-input--error');
  amountError.textContent = msg;
  amountError.classList.add('form-error--show');
  modalConfirm.disabled = true;
  modalConfirm.classList.add('is-disabled');
}

/** 清除金额报错 */
function clearAmountError() {
  amountInput.classList.remove('form-input--error');
  amountError.classList.remove('form-error--show');
  modalConfirm.disabled = false;
  modalConfirm.classList.remove('is-disabled');
}

// ==================== 标签 ====================

/** 渲染标签列表（跟随当前选中分类，带色） */
function renderTags() {
  var catName = categorySelect.value;
  if (!catName) return;   // 下拉框为空时跳过
  var tags = loadTags(catName);
  tagList.innerHTML = '';
  tags.forEach(function (tag, idx) {
    var color = getTagColorByName(tag, currentType);
    var isSelected = selectedTag === tag;

    var el = document.createElement('span');
    el.className = 'tag-item';
    if (isSelected) el.classList.add('tag-item--selected');

    // 动态着色：选中=实心色块，未选中=彩色描边+色字
    // 浅底色用深色文字，深底色用白色文字
    var isLight = isLightColor(color);
    el.style.borderColor = color;
    if (isSelected) {
      el.style.background = color;
      el.style.color = isLight ? '#005c4c' : '#fff';
    } else {
      el.style.background = '#fff';
      el.style.color = color;
    }

    var label = document.createElement('span');
    label.textContent = tag;
    el.appendChild(label);

    // × 删除按钮（浅色标签上加深，提升可见度）
    var closeBtn = document.createElement('span');
    closeBtn.className = 'tag-item__close';
    closeBtn.textContent = '×';
    if (isLight) {
      closeBtn.style.color = '#30685c';
      closeBtn.style.borderColor = '#30685c';
    }
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      removeTag(tag);
    });
    el.appendChild(closeBtn);

    el.addEventListener('click', function () { toggleTag(tag); });
    tagList.appendChild(el);
  });
}

function toggleTag(tagName) {
  selectedTag = (selectedTag === tagName) ? null : tagName;
  renderTags();
}

/** 提交自定义标签输入（回车或按钮点击） */
function commitTagInput() {
  var name = tagInput.value.trim();
  if (name) { addTag(name); tagInput.value = ''; }
}

function addTag(name) {
  var catName = categorySelect.value;
  var tags = loadTags(catName);
  if (tags.indexOf(name) !== -1) return;
  tags.push(name);
  saveTags(catName, tags);
  selectedTag = name;
  renderTags();
}

function removeTag(name) {
  var catName = categorySelect.value;
  var tags = loadTags(catName);
  var idx = tags.indexOf(name);
  if (idx === -1) return;
  tags.splice(idx, 1);
  saveTags(catName, tags);
  if (selectedTag === name) selectedTag = null;
  renderTags();
}

// ==================== 提交 ====================

function submitForm() {
  var category = categorySelect.value;
  var amountStr = amountInput.value.trim();

  if (!category)    { alert('请选择分类'); return; }
  if (!selectedTag)  { alert('请选择标签'); return; }
  if (!validateAmount(amountStr)) return;

  var amount = Math.round(parseFloat(amountStr) * 100) / 100;
  var note = noteInput.value.trim();

  if (editingId) {
    // 编辑模式：找到原记录并覆盖字段（保留原始日期和 ID）
    var bills = loadBills();
    for (var i = 0; i < bills.length; i++) {
      if (bills[i].id === editingId) {
        bills[i].type     = currentType;
        bills[i].category = category;
        bills[i].amount   = amount;
        bills[i].tags     = selectedTag ? [selectedTag] : [];
        bills[i].note     = note;
        break;
      }
    }
    saveBills(bills);
    console.log('✏️ 编辑账单：' + editingId);
  } else {
    // 新增模式
    var bill = {
      id:       'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date:     currentDate,
      type:     currentType,
      category: category,
      amount:   amount,
      tags:     selectedTag ? [selectedTag] : [],
      note:     note,
    };
    var bills = loadBills();
    bills.push(bill);
    saveBills(bills);
    console.log('✅ 新增账单：', bill);
  }

  closeModal();   // closeModal 内部已调用 renderAll()
}

// ==================== 数据渲染（Phase B） ====================

/**
 * 总刷新入口：按当前日期过滤账单，联动更新统计卡片 + 表格 + 图表
 * 数据流：loadBills() → filter by currentDate → { summary, table, charts }
 */
function renderAll() {
  var allBills = loadBills();
  var bills = [];
  for (var i = 0; i < allBills.length; i++) {
    if (allBills[i].date === currentDate) bills.push(allBills[i]);
  }
  refreshSummary(bills);
  renderTable(bills);
  if (typeof updateCharts === 'function') updateCharts(bills);
}

/** 刷新三张收支概览卡片 */
function refreshSummary(bills) {
  var totalIncome = 0, totalExpense = 0;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].type === 'income') totalIncome += bills[i].amount;
    else totalExpense += bills[i].amount;
  }
  document.getElementById('totalIncome').textContent  = '¥' + totalIncome.toFixed(2);
  document.getElementById('totalExpense').textContent = '¥' + totalExpense.toFixed(2);
  document.getElementById('balance').textContent      = '¥' + (totalIncome - totalExpense).toFixed(2);
}

/** 渲染账单表格（含编辑/删除操作按钮） */
function renderTable(bills) {
  var emptyState = document.getElementById('emptyState');
  var tableWrap  = document.getElementById('tableWrap');
  var tbody      = document.getElementById('tableBody');

  if (bills.length === 0) {
    emptyState.style.display = '';
    tableWrap.style.display  = 'none';
    return;
  }

  emptyState.style.display = 'none';
  tableWrap.style.display  = '';
  tbody.innerHTML = '';

  for (var i = 0; i < bills.length; i++) {
    var b = bills[i];
    var tr = document.createElement('tr');

    // 标签（着色 chip）
    var tdTags = document.createElement('td');
    var tags = b.tags || [];
    for (var j = 0; j < tags.length; j++) {
      var span = document.createElement('span');
      span.className = 'tag';
      var color = getTagColorByName(tags[j], b.type);
      span.style.background = color;
      span.style.color = '#fff';
      span.textContent = tags[j];
      tdTags.appendChild(span);
    }
    if (tags.length === 0) tdTags.textContent = '-';
    tr.appendChild(tdTags);

    // 金额（收入绿 / 支出橙）
    var tdAmt = document.createElement('td');
    tdAmt.className = 'amount-cell';
    tdAmt.style.color = b.type === 'income' ? 'var(--income)' : 'var(--expense)';
    tdAmt.textContent = (b.type === 'income' ? '+' : '-') + '¥' + b.amount.toFixed(2);
    tr.appendChild(tdAmt);

    // 备注
    var tdNote = document.createElement('td');
    tdNote.textContent = b.note || '-';
    tr.appendChild(tdNote);

    // 操作按钮
    var tdAct = document.createElement('td');
    var btnEdit = document.createElement('button');
    btnEdit.className = 'btn--sm btn--edit';
    btnEdit.textContent = '编辑';
    btnEdit.addEventListener('click', (function (id) {
      return function () { editBill(id); };
    })(b.id));
    tdAct.appendChild(btnEdit);

    var btnDel = document.createElement('button');
    btnDel.className = 'btn--sm btn--del';
    btnDel.textContent = '删除';
    btnDel.addEventListener('click', (function (id) {
      return function () { deleteBill(id); };
    })(b.id));
    tdAct.appendChild(btnDel);

    tr.appendChild(tdAct);

    // 浮窗 hover 事件（闭包捕获当前账单数据）
    (function (bill) {
      tr.addEventListener('mouseenter', function (e) { showTooltip(bill, e); });
      tr.addEventListener('mousemove', positionTooltip);
      tr.addEventListener('mouseleave', hideTooltip);
    })(b);

    tbody.appendChild(tr);
  }
}

/** 点击编辑：回填弹窗 */
function editBill(id) {
  var bills = loadBills();
  var bill = null;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === id) { bill = bills[i]; break; }
  }
  if (!bill) return;

  editingId    = id;
  modalTitle.textContent = '编辑记录';
  currentType  = bill.type;
  selectedTag = (bill.tags && bill.tags[0]) ? bill.tags[0] : null;

  // 收支类型切换
  typeSwitch.querySelectorAll('.switch__btn').forEach(function (btn) {
    btn.classList.toggle('switch__btn--active', btn.dataset.type === bill.type);
  });

  setModalTypeClass();
  renderCategories();
  categorySelect.value = bill.category;
  amountInput.value    = bill.amount;
  clearAmountError();
  noteInput.value = bill.note || '';
  tagInput.value  = '';
  renderTags();

  modalOverlay.classList.add('modal-overlay--open');
}

/** 删除账单（含确认） */
function deleteBill(id) {
  if (!confirm('确定要删除这条记录吗？')) return;
  var bills = loadBills();
  bills = bills.filter(function (b) { return b.id !== id; });
  saveBills(bills);
  console.log('🗑 删除账单：' + id);
  renderAll();
}

// ==================== 入口 ====================
document.addEventListener('DOMContentLoaded', init);
