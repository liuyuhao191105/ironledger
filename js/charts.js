/* ==========================================
   charts.js —— Chart.js 图表初始化和数据刷新
   ========================================== */

let barChart = null; // 柱状图实例
let pieChart = null; // 饼图实例

// ---------- 图表初始化 ----------

/** 初始化两个 Chart.js 图表（页面加载时调用一次） */
function initCharts() {
  // ========== 柱状图：收入 VS 支出 ==========
  const barCtx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: ['收入', '支出'],
      datasets: [{
        label: '',                                        // 由 tooltip callback 按 index 区分
        data: [0, 0],
        backgroundColor: ['#00be72', '#911b39'],        // 收入绿 / 支出紫红
        borderRadius: 4,
        barThickness: 36,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var v = ctx.parsed.y;
              return ctx.dataIndex === 0
                ? '收入：¥' + v.toFixed(2)
                : '支出：¥' + v.toFixed(2);
            },
          },
        },
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: { size: 12 },
            padding: 16,
            generateLabels: function (chart) {
              return [
                { text: '收入', fillStyle: '#00be72', strokeStyle: '#00be72', index: 0, hidden: false, lineWidth: 0, pointStyle: 'rectRounded', rotation: 0 },
                { text: '支出', fillStyle: '#911b39', strokeStyle: '#911b39', index: 1, hidden: false, lineWidth: 0, pointStyle: 'rectRounded', rotation: 0 },
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },                      // 隐藏 X 轴网格线
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6',                            // 弱化 Y 轴网格线
          },
          ticks: {
            callback: function (value) { return '¥' + value; },
            font: { size: 11 },
          },
        },
      },
    },
  });

  // ========== 环形饼图：支出分类占比 ==========
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  pieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: [],                                        
      datasets: [{
        data: [],                                        
        backgroundColor: [
          '#c15236', '#b33f38', '#a32d39', '#911b39',
          '#7e0738', '#00be72', '#008792', '#004d79',
          '#051937', '#acea1f',
        ],
        borderWidth: 2,
        borderColor: '#fff',
        hoverBorderWidth: 3,
        hoverBorderColor: '#fff',
        hoverOffset: 6,                                  // hover 放大高亮
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '55%',                                     // 空心环形
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            font: { size: 11 },
            padding: 14,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              // 格式化浮窗：分类 / 金额
              var label = ctx.label || '';
              var value = ctx.parsed || 0;
              return '分类：' + label + '    金额：¥' + value.toFixed(2);
            },
          },
        },
      },
    },
  });
}

// ---------- 图表数据刷新 ----------

/**
 * 根据当日账单更新图表（Phase B 接入真实数据）
 * @param {Array} bills - 当日账单数组
 */
function updateCharts(bills) {
  var barEmpty = document.getElementById('barEmpty');
  var pieEmpty = document.getElementById('pieEmpty');

  // ---- 汇总 ----
  var totalIncome = 0, totalExpense = 0;
  var expenseByCat = {};   // { 分类名: 金额合计 }
  for (var i = 0; i < bills.length; i++) {
    var b = bills[i];
    if (b.type === 'income') {
      totalIncome += b.amount;
    } else {
      totalExpense += b.amount;
      expenseByCat[b.category] = (expenseByCat[b.category] || 0) + b.amount;
    }
  }

  // ---- 柱状图：收入 VS 支出 ----
  barChart.data.datasets[0].data = [totalIncome, totalExpense];
  barChart.update();

  // 空状态 overlay
  barEmpty.style.display = (totalIncome === 0 && totalExpense === 0) ? '' : 'none';

  // ---- 环形图：支出分类占比 ----
  var catNames   = Object.keys(expenseByCat);
  var catAmounts = catNames.map(function (k) { return expenseByCat[k]; });

  pieChart.data.labels = catNames;
  pieChart.data.datasets[0].data = catAmounts;
  pieChart.update();

  pieEmpty.style.display = catNames.length === 0 ? '' : 'none';
}
