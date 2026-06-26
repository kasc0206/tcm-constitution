/**
 * GB/T 46939-2025 中医体质分类与判定 — 主应用逻辑
 */

// ========================
// 问卷渲染
// ========================

function renderQuestionnaire() {
  const container = document.getElementById("questionnaire-container");
  let html = "";

  // 收集所有问题到扁平数组
  const allItems = [];
  for (const ct of CONSTITUTION_TYPES) {
    for (const item of ct.items) {
      allItems.push({ constitutionId: ct.id, item });
    }
  }

  // Fisher-Yates 洗牌算法打乱顺序
  for (let i = allItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
  }

  // 渲染打乱后的问题
  for (const { constitutionId, item } of allItems) {
    html += renderQuestionItem(item);
  }

  container.innerHTML = html;
}

function renderQuestionItem(item) {
  let notes = "";
  if (item.reverse) {
    notes = `<span class="reverse-note">逆向计分</span>`;
  }
  if (item.gender === "female") {
    notes = `<span class="gender-note">限女性回答</span>`;
  } else if (item.gender === "male") {
    notes = `<span class="gender-note">限男性回答</span>`;
  }

  let html = `<div class="question-item" data-id="${item.id}" data-gender="${item.gender || "all"}">`;
  html += `<div class="question-text">${item.text}${notes}</div>`;
  html += `<div class="rating-scale">`;

  for (const r of RATING_LABELS) {
    const id = `${item.id}_${r.value}`;
    html += `<div class="rating-option">`;
    html += `<input type="radio" name="${item.id}" id="${id}" value="${r.value}">`;
    html += `<label for="${id}">`;
    html += `<span class="rating-value">${r.value}</span>`;
    html += `<span class="rating-label">${r.label}</span>`;
    html += `</label>`;
    html += `</div>`;
  }

  html += `</div></div>`;
  return html;
}

// ========================
// 性别切换时显示/隐藏问题
// ========================

function updateGenderVisibility(gender) {
  document.querySelectorAll(".question-item").forEach((el) => {
    const itemGender = el.dataset.gender;
    if (itemGender === "all" || itemGender === gender) {
      el.style.display = "block";
    } else {
      el.style.display = "none";
      // 清除该组的选中状态
      el.querySelectorAll('input[type="radio"]').forEach(
        (r) => (r.checked = false),
      );
    }
  });
}

// ========================
// 提交 & 校验
// ========================

function submitAnswers() {
  const name = document.getElementById("name").value.trim();
  const age = document.getElementById("age").value.trim();
  const gender = document.getElementById("gender").value;

  if (!name) {
    showToast("请输入您的姓名");
    return;
  }
  if (!age || parseInt(age) < 1 || parseInt(age) > 150) {
    showToast("请输入有效的年龄");
    return;
  }

  // 收集答案
  const answers = {};
  let missingCount = 0;
  let totalVisible = 0;

  for (const ct of CONSTITUTION_TYPES) {
    for (const item of ct.items) {
      // 跳过性别不匹配的题目
      if (item.gender && item.gender !== gender) continue;

      totalVisible++;
      const radios = document.getElementsByName(item.id);
      let selected = null;
      for (const r of radios) {
        if (r.checked) {
          selected = parseInt(r.value);
          break;
        }
      }
      if (selected === null) {
        missingCount++;
        // 高亮未回答的题目
        const parent = radios[0]?.closest(".question-item");
        if (parent) parent.style.borderLeft = "3px solid #e53935";
      } else {
        answers[item.id] = selected;
      }
    }
  }

  if (missingCount > 0) {
    showToast(`还有 ${missingCount} 道题未回答，请完成所有题目`);
    return;
  }

  // 执行判定
  const assessment = performAssessment(answers, gender);
  assessment.userInfo = { name, age, gender };

  showResult(assessment);
}

// ========================
// 显示结果
// ========================

function showResult(assessment) {
  const { results, conclusion, userInfo } = assessment;

  // 切换页面
  switchPage(2);

  // 更新步骤
  updateSteps(3);

  // 结果横幅
  const banner = document.getElementById("result-banner");
  const typeEl = document.getElementById("result-type");
  const descEl = document.getElementById("result-desc");

  banner.className =
    "result-banner " + (conclusion.isBalanced ? "balanced" : "biased");

  if (conclusion.verdict === "yes") {
    typeEl.className = "result-type balanced";
    typeEl.textContent = `${conclusion.primaryIcon} ${conclusion.primaryName}`;
  } else if (conclusion.verdict === "basic") {
    typeEl.className = "result-type balanced";
    typeEl.textContent = `${conclusion.primaryIcon} ${conclusion.primaryName}`;
  } else {
    typeEl.className = `result-type ${conclusion.primary?.id || conclusion.primaryName}`;
    typeEl.textContent = `${conclusion.primaryIcon} ${conclusion.primaryName}偏向`;
  }

  descEl.textContent = conclusion.description;

  // 结果表格
  const tbody = document.getElementById("result-body");
  tbody.innerHTML = "";
  for (const r of results) {
    const tr = document.createElement("tr");
    if (r.verdict === "yes" || r.verdict === "basic") {
      tr.className = "highlight-row";
    }
    tr.innerHTML = `
            <td><span style="color:${r.color}">${r.icon}</span> ${r.name}</td>
            <td>${r.rawScore}</td>
            <td>${r.convertedScore.toFixed(1)}</td>
            <td class="verdict-${r.verdict}">${r.label}</td>
        `;
    tbody.appendChild(tr);
  }

  // 体质特征与调养建议
  const detailContainer = document.getElementById("constitution-detail");
  detailContainer.innerHTML = "";

  // 显示主要体质的详情
  const detailConstitutions = [];
  if (conclusion.isBalanced || conclusion.verdict === "basic") {
    detailConstitutions.push(
      CONSTITUTION_TYPES.find((c) => c.id === "balanced"),
    );
  }
  if (conclusion.primary) {
    const primaryCT = CONSTITUTION_TYPES.find(
      (c) => c.id === conclusion.primary.id,
    );
    if (primaryCT) detailConstitutions.push(primaryCT);
  }
  if (conclusion.biased) {
    for (const b of conclusion.biased) {
      if (!detailConstitutions.find((d) => d.id === b.id)) {
        const ct = CONSTITUTION_TYPES.find((c) => c.id === b.id);
        if (ct) detailConstitutions.push(ct);
      }
    }
  }
  if (conclusion.tend) {
    for (const t of conclusion.tend) {
      if (!detailConstitutions.find((d) => d.id === t.id)) {
        const ct = CONSTITUTION_TYPES.find((c) => c.id === t.id);
        if (ct) detailConstitutions.push(ct);
      }
    }
  }

  for (const ct of detailConstitutions) {
    const card = document.createElement("div");
    card.className = "constitution-detail-card";
    card.style.borderLeftColor = ct.color;
    card.innerHTML = `
            <h4 style="color:${ct.color}">${ct.icon} ${ct.name}</h4>
            <p><strong>形体特征：</strong>${ct.traits.形体特征}</p>
            <p><strong>常见表现：</strong>${ct.traits.常见表现}</p>
            <p><strong>心理特征：</strong>${ct.traits.心理特征}</p>
            <p><strong>发病倾向：</strong>${ct.traits.发病倾向}</p>
            <p><strong>适应能力：</strong>${ct.traits.适应能力}</p>
            <p style="margin-top:8px;padding-top:8px;border-top:1px dashed #ddd">
                <strong>💡 调养建议：</strong>${ct.调养建议}
            </p>
        `;
    detailContainer.appendChild(card);
  }

  // 存储结果供 resize 重绘 和 下载报告使用
  window._lastResults = results;
  window._lastAssessment = assessment;

  // 延迟绘制雷达图，等待 DOM 布局完成
  setTimeout(() => drawRadarChart(results), 100);
}

// ========================
// 下载 Markdown 报告
// ========================

function downloadMarkdownReport() {
  const assessment = window._lastAssessment;
  if (!assessment) {
    showToast("没有可下载的报告，请先完成测评");
    return;
  }

  const { results, conclusion, userInfo } = assessment;
  const now = new Date();
  const dateStr =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");

  const genderLabel = userInfo.gender === "male" ? "男" : "女";

  let md = "";

  // 标题
  md += "# 中医体质分类与判定报告\n\n";
  md += `依据 **GB/T 46939-2025**《中医体质分类与判定》国家标准\n\n`;

  // 基本信息
  md += "## 基本信息\n\n";
  md += `| 项目 | 内容 |\n| --- | --- |\n`;
  md += `| 姓名 | ${userInfo.name} |\n`;
  md += `| 性别 | ${genderLabel} |\n`;
  md += `| 年龄 | ${userInfo.age} 岁 |\n`;
  md += `| 测评日期 | ${dateStr} |\n`;
  md += "\n";

  // 判定结论
  md += "## 判定结论\n\n";
  md += `**${conclusion.primaryIcon} ${conclusion.primaryName}**\n\n`;
  md += `${conclusion.description}\n\n`;

  // 各体质得分
  md += "## 各体质得分详情\n\n";
  md += "| 体质类型 | 原始分 | 转化分 | 判定结果 |\n";
  md += "| --- | --- | --- | --- |\n";
  for (const r of results) {
    md += `| ${r.icon} ${r.name} | ${r.rawScore} | ${r.convertedScore.toFixed(1)} | ${r.label} |\n`;
  }
  md += "\n";

  // 体质特征与调养建议
  md += "## 体质特征与调养建议\n\n";

  const detailConstitutions = [];
  if (conclusion.isBalanced || conclusion.verdict === "basic") {
    detailConstitutions.push(
      CONSTITUTION_TYPES.find((c) => c.id === "balanced"),
    );
  }
  if (conclusion.primary) {
    const primaryCT = CONSTITUTION_TYPES.find(
      (c) => c.id === conclusion.primary.id,
    );
    if (primaryCT) detailConstitutions.push(primaryCT);
  }
  if (conclusion.biased) {
    for (const b of conclusion.biased) {
      if (!detailConstitutions.find((d) => d.id === b.id)) {
        const ct = CONSTITUTION_TYPES.find((c) => c.id === b.id);
        if (ct) detailConstitutions.push(ct);
      }
    }
  }
  if (conclusion.tend) {
    for (const t of conclusion.tend) {
      if (!detailConstitutions.find((d) => d.id === t.id)) {
        const ct = CONSTITUTION_TYPES.find((c) => c.id === t.id);
        if (ct) detailConstitutions.push(ct);
      }
    }
  }

  for (const ct of detailConstitutions) {
    md += `### ${ct.icon} ${ct.name}\n\n`;
    md += `- **形体特征**：${ct.traits.形体特征}\n`;
    md += `- **常见表现**：${ct.traits.常见表现}\n`;
    md += `- **心理特征**：${ct.traits.心理特征}\n`;
    md += `- **发病倾向**：${ct.traits.发病倾向}\n`;
    md += `- **适应能力**：${ct.traits.适应能力}\n\n`;
    md += `**💡 调养建议**：${ct.调养建议}\n\n`;
  }

  // 免责声明
  md += "---\n\n";
  md += `> 本报告由中医体质分类与判定系统自动生成，依据 GB/T 46939-2025 国家标准计算。\n`;
  md += `> 测评结果仅供参考，不构成医疗建议。如有身体不适，请及时就医。\n`;
  md += `> 生成时间：${dateStr}\n`;

  // 下载
  const filename = `中医体质判定报告_${userInfo.name}_${dateStr}.md`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`✅ 报告已下载：${filename}`);
}

// ========================
// 雷达图
// ========================

function drawRadarChart(results) {
  const canvas = document.getElementById("radar-chart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  // 获取父容器尺寸
  const container = canvas.parentElement;
  const size = Math.min(container.clientWidth, 460);

  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const levels = 5; // 0, 20, 40, 60, 80, 100

  // 数据: 转化分 (0-100)
  const data = results.map((r) => ({
    name: r.name,
    score: Math.min(Math.max(r.convertedScore, 0), 100),
    color: r.color,
    verdict: r.verdict,
  }));

  const count = data.length;
  const angleStep = (Math.PI * 2) / count;

  // 清空
  ctx.clearRect(0, 0, size, size);

  // 绘制背景网格
  for (let level = 1; level <= levels; level++) {
    const r = (maxR / levels) * level;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 辐射线
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 刻度标签
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "11px -apple-system, sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let level = 1; level <= levels; level++) {
    const val = (100 / levels) * level;
    const r = (maxR / levels) * level;
    ctx.fillText(val, cx + r + 6, cy);
  }
  ctx.fillText("0", cx + 6, cy);

  // 数据区域
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (data[i].score / 100) * maxR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(74, 124, 89, 0.2)";
  ctx.fill();
  ctx.strokeStyle = "rgba(74, 124, 89, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 数据点 + 标签
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (data[i].score / 100) * maxR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    // 数据点
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = data[i].color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 标签
    const labelR = maxR + 20;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "12px -apple-system, sans-serif";
    ctx.fillStyle = data[i].color;
    ctx.fillText(data[i].name, lx, ly);

    // 分数
    const scoreY = ly + 16;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillText(data[i].score.toFixed(1), lx, scoreY);
  }
}

// ========================
// 页面导航
// ========================

function switchPage(pageIndex) {
  // 1: 问卷, 2: 结果 (实际是3步但第2步是计算过程)
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  if (pageIndex === 1) {
    document.getElementById("page-questionnaire").classList.add("active");
  } else {
    document.getElementById("page-result").classList.add("active");
  }
}

function updateSteps(activeStep) {
  document.querySelectorAll(".step").forEach((el) => {
    const step = parseInt(el.dataset.step);
    el.classList.remove("active", "completed");
    if (step === activeStep) {
      el.classList.add("active");
    } else if (step < activeStep) {
      el.classList.add("completed");
    }
  });
}

// ========================
// 重置
// ========================

function resetAll() {
  switchPage(1);
  updateSteps(1);

  // 清除选择
  document
    .querySelectorAll('input[type="radio"]')
    .forEach((r) => (r.checked = false));
  document.querySelectorAll(".question-item").forEach((el) => {
    el.style.borderLeft = "";
  });
}

// ========================
// Toast 提示
// ========================

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: #323232; color: #fff; padding: 12px 24px;
        border-radius: 8px; font-size: 14px; z-index: 9999;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        animation: fadeIn 0.3s ease;
        max-width: 80vw; text-align: center;
    `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ========================
// 窗口 resize 重绘雷达图
// ========================

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const canvas = document.getElementById("radar-chart");
    if (canvas && canvas.width > 0) {
      // 只在结果页可见时重绘
      const resultPage = document.getElementById("page-result");
      if (resultPage.classList.contains("active")) {
        // 重新获取结果数据重绘
        const table = document.getElementById("result-table");
        if (table) {
          // 简单触发重绘：从本地变量重新画
          if (window._lastResults) {
            drawRadarChart(window._lastResults);
          }
        }
      }
    }
  }, 200);
});

// ========================
// 初始化
// ========================

document.addEventListener("DOMContentLoaded", () => {
  renderQuestionnaire();
  updateSteps(1);

  // 性别切换
  document.getElementById("gender").addEventListener("change", (e) => {
    updateGenderVisibility(e.target.value);
  });
  updateGenderVisibility(document.getElementById("gender").value);
});
