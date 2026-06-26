<div align="center">

# 🌿 中医体质分类与判定系统

**GB/T 46939-2025 国家标准 · 全平台实现**

[![Deployed on Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%26%20Pages-F38020?logo=cloudflare&logoColor=white)](https://tcm-constitution.kasc0206.workers.dev)
[![国家标准](https://img.shields.io/badge/标准-GB/T%2046939--2025-4a7c59)](https://github.com/kasc0206/tcm-constitution)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/kasc0206/tcm-constitution?style=social)](https://github.com/kasc0206/tcm-constitution)

**在线体验 → [tcm-constitution.kasc0206.workers.dev](https://tcm-constitution.kasc0206.workers.dev/)**

</div>

---

## 📋 项目简介

基于 **GB/T 46939-2025《中医体质分类与判定》** 国家标准，构建的现代化中医体质辨识系统。通过 30 道标准化判定条目，运用科学的转化分算法，精准识别 **9 种基本体质类型**，并提供针对性的调养建议。

> 🏛️ 该标准由北京中医药大学王琦院士领衔起草，累计服务超过 **5.7 亿人次**，在全国 **1734 家** 二级以上中医医院推广应用。

### ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 🎯 **国标合规** | 严格遵循 GB/T 46939-2025 判定方法与转化分公式 |
| ⚡ **边缘部署** | Cloudflare Workers + Static Assets，全球加速毫秒级响应 |
| 📊 **雷达图可视化** | Canvas 绘制的多维度体质得分分布图 |
| 📥 **MD 报告导出** | 一键下载完整的 Markdown 体质分析报告 |
| 🔀 **随机排序** | 每次加载题目顺序随机，避免答题 bias |
| 🚻 **性别适配** | 湿热质题目根据性别自动显隐 |
| 🔄 **逆向计分** | 平和质标记条目自动 1↔5 转换 |
| 📡 **REST API** | 完整的 HTTP API，支持第三方集成 |

---

## 🏗️ 系统架构

```mermaid
graph TD
    A[用户浏览器] --> B{Cloudflare Workers <br/> tcm-constitution.kasc0206.workers.dev}
    B --> C[Static Assets<br/>/public]
    B --> D[Worker Runtime<br/>/src/index.js]
    C --> E[index.html]
    C --> F[CSS / JS]
    D --> G[/api/health]
    D --> H[/api/assess]
    D --> I[/api/types]
    D --> J[/api/questions]
    
    subgraph "共享数据源 shared/constitution-data.js"
        K[9种体质定义]
        L[30道判定条目]
        M[评分等级标签]
    end
    
    E --> K
    F --> K
    D --> K
    
    style A fill:#f0f7f2,stroke:#4a7c59
    style B fill:#F38020,stroke:#fff,color:#fff
    style K fill:#e8f5e9,stroke:#4a7c59
```

### 📁 项目结构

```
tcm-constitution/
├── shared/
│   └── constitution-data.js   ← 单⼀数据源 (ES Module)
├── public/                     ← 前端静态资源
│   ├── index.html              ← 测评页面
│   ├── css/style.css           ← 响应式样式
│   └── js/
│       ├── constitution-data.js  ← 前端数据（引用 shared/）
│       ├── scoring.js            ← 判定算法（计算/判定/结论）
│       └── app.js                ← 主逻辑（渲染/交互/下载）
├── src/index.js               ← Worker（API + 静态资源路由）
├── wrangler.toml              ← Cloudflare 部署配置
└── README.md
```

---

## 🧬 九种体质一览

| 体质类型 | 特征 | 倾向疾病 |
|---------|------|---------|
| 🌿 **平和质** | 阴阳平衡，面色红润，精力充沛 | 患病较少 |
| 💨 **气虚质** | 元气不足，疲乏气短，易出汗 | 感冒、内脏下垂、慢性疲劳 |
| ❄️ **阳虚质** | 畏寒怕冷，手足不温 | 痰饮、泄泻、痛经 |
| 🔥 **阴虚质** | 口燥咽干，手足心热 | 糖尿病、高血压、失眠 |
| 💧 **痰湿质** | 形体肥胖，腹部肥满，口黏苔腻 | 代谢综合征、脂肪肝 |
| 🌡️ **湿热质** | 面垢油光，口苦苔黄 | 痤疮、高尿酸血症 |
| 🩸 **血瘀质** | 肤色晦暗，舌质紫暗 | 心血管疾病、痛证 |
| 😔 **气郁质** | 神情抑郁，忧虑脆弱 | 抑郁、不寐、脏躁 |
| 🤧 **特禀质** | 过敏反应，禀赋不耐 | 哮喘、荨麻疹、花粉症 |

---

## 🔬 算法详解

### 计分公式

根据国标第 5.1 节：

```
转化分数 = [(原始分 − 条目数) / (条目数 × 4)] × 100
```

### 判定标准（表 1）

| 体质类型 | 条件 | 结果 |
|---------|------|------|
| **平和质** | 转化分 ≥ 60 **且** 其他 8 种体质转化分均 < 30 | **是** |
| | 转化分 ≥ 60 **且** 其他 8 种体质转化分均 < 40 | **基本是** |
| | 不满足上述条件 | **否** |
| **偏颇体质** | 转化分 ≥ 40 | **是** |
| | 转化分 30 ~ 39 | **倾向是** |
| | 转化分 < 30 | **否** |

### 逆向计分

平和质中标有 `*` 的条目（b2、b3、b4）需逆向转换：

```
1 ↔ 5,  2 ↔ 4,  3 → 3
```

---

## 🚀 快速开始

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/kasc0206/tcm-constitution.git
cd tcm-constitution

# 直接用浏览器打开
open public/index.html

# 或使用 npx 本地开发
npx wrangler dev
```

### 部署到 Cloudflare

```bash
# 部署 Worker + 静态资源
npx wrangler deploy
```

### 调用 API

```bash
# 健康检查
curl https://tcm-constitution.kasc0206.workers.dev/api/health

# 获取体质类型列表
curl https://tcm-constitution.kasc0206.workers.dev/api/types

# 获取判定条目
curl https://tcm-constitution.kasc0206.workers.dev/api/questions

# 提交判定
curl -X POST https://tcm-constitution.kasc0206.workers.dev/api/assess \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "answers": {
      "b1": 5, "b2": 1, "b3": 1, "b4": 1,
      "qd1": 1, "qd2": 1, "qd3": 1,
      "yd1": 1, "yd2": 1, "yd3": 1,
      "yid1": 1, "yid2": 1, "yid3": 1,
      "pd1": 1, "pd2": 1, "pd3": 1,
      "dh1": 1, "dh2": 1,
      "bs1": 1, "bs2": 1, "bs3": 1,
      "qs1": 1, "qs2": 1, "qs3": 1,
      "al1": 1, "al2": 1, "al3": 1, "al4": 1
    }
  }'
```

---

## 📡 API 文档

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 体质测评前端页面 |
| `/api/health` | GET | 健康检查 |
| `/api/types` | GET | 获取 9 种体质类型 |
| `/api/questions` | GET | 获取全部判定条目 |
| `/api/assess` | POST | 提交答案进行体质判定 |

### POST `/api/assess` 请求体

```json
{
  "gender": "male | female",
  "answers": {
    "b1": 5,
    "b2": 1,
    ...
  }
}
```

### 响应示例

```json
{
  "results": [
    { "id": "balanced", "name": "平和质", "rawScore": 20, "convertedScore": 100, "verdict": "yes", "label": "是" },
    { "id": "qi-deficiency", "name": "气虚质", "rawScore": 3, "convertedScore": 0, "verdict": "no", "label": "否" }
  ],
  "conclusion": {
    "isBalanced": true,
    "primaryName": "平和质",
    "description": "恭喜！您目前的体质状态为平和质，属于理想的健康体质。"
  }
}
```

---

## 🧪 测试验证

```javascript
// 平和质测试（最健康选项）
平和质: 原始分=20, 转化分=100.0 → 判定: 是 ✅
气虚质: 原始分=3,  转化分=0.0   → 判定: 否 ✅
阳虚质: 原始分=3,  转化分=0.0   → 判定: 否 ✅
// ... 全部偏颇体质转化分均为 0

// 气虚质测试（气虚条目全5，其余全1）
气虚质: 原始分=13, 转化分=83.3  → 判定: 是 ✅
平和质: 原始分=11, 转化分=43.8  → 判定: 否 ✅
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Cloudflare Workers](https://workers.cloudflare.com/) | 无服务器运行时 + API 路由 |
| [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) | CDN 静态资源分发 |
| [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) | 部署与配置管理 |
| Vanilla JavaScript | 纯前端实现，零依赖 |
| Canvas API | 雷达图可视化 |
| HTML5 + CSS3 | 响应式界面 |

---

## 📜 License

本项目基于 GB/T 46939-2025《中医体质分类与判定》国家标准实现。

- **标准文本** © 国家市场监督管理总局、国家标准化管理委员会
- **代码实现** 采用 MIT 许可证开源
- **健康建议仅供参考**，如有身体不适请及时就医

---

<div align="center">

**🌿 上工治未病，辨体施养 🌿**

[![在线体验](https://img.shields.io/badge/在线体验-https://tcm--constitution.kasc0206.workers.dev-4a7c59?style=for-the-badge)](https://tcm-constitution.kasc0206.workers.dev/)
[![GitHub](https://img.shields.io/badge/GitHub-kasc0206/tcm--constitution-181717?style=for-the-badge&logo=github)](https://github.com/kasc0206/tcm-constitution)

</div>
