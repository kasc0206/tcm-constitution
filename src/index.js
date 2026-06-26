/**
 * 中医体质分类与判定 API — Cloudflare Worker
 *
 * 提供体质判定的服务端 API 接口，可用于前端调用或第三方集成。
 * GB/T 46939-2025 标准实现
 */

// ============================================================
// 体质数据定义
// ============================================================

const CONSTITUTION_TYPES = [
  {
    id: "balanced",
    name: "平和质",
    icon: "🌿",
    color: "#4a7c59",
    description: "阴阳气血调和，以体态适中、面色红润、精力充沛为主要特征。",
  },
  {
    id: "qi-deficiency",
    name: "气虚质",
    icon: "💨",
    color: "#d4a574",
    description: "元气不足，以疲乏、气短、自汗等为主要特征。",
  },
  {
    id: "yang-deficiency",
    name: "阳虚质",
    icon: "❄️",
    color: "#8fc1d9",
    description: "阳气不足，以畏寒怕冷、手足不温等虚寒表现为主要特征。",
  },
  {
    id: "yin-deficiency",
    name: "阴虚质",
    icon: "🔥",
    color: "#d97a7a",
    description: "阴液亏少，以口燥咽干、手足心热等虚热表现为主要特征。",
  },
  {
    id: "phlegm-dampness",
    name: "痰湿质",
    icon: "💧",
    color: "#b8a07a",
    description: "痰湿凝聚，以形体肥胖、腹部肥满、口黏苔腻等为主要特征。",
  },
  {
    id: "damp-heat",
    name: "湿热质",
    icon: "🌡️",
    color: "#d9a84a",
    description: "湿热内蕴，以面垢油光、口苦、苔黄腻等为主要特征。",
  },
  {
    id: "blood-stasis",
    name: "血瘀质",
    icon: "🩸",
    color: "#7a4a6b",
    description: "血行不畅，以肤色晦暗、舌质紫暗等为主要特征。",
  },
  {
    id: "qi-stagnation",
    name: "气郁质",
    icon: "😔",
    color: "#6b8fa0",
    description: "气机郁滞，以神情抑郁、忧虑脆弱等为主要特征。",
  },
  {
    id: "allergic",
    name: "特禀质",
    icon: "🤧",
    color: "#a08ab8",
    description: "禀赋不耐，以过敏反应等为主要特征。",
  },
];

/** 各体质条目定义：条目ID、是否逆向计分、性别限制 */
const ITEMS = {
  // 平和质 (4 items)
  b1: { constitution: "balanced", text: "您精力充沛吗？", reverse: false },
  b2: { constitution: "balanced", text: "您容易疲乏吗？", reverse: true },
  b3: {
    constitution: "balanced",
    text: "您感到闷闷不乐、情绪低沉吗？",
    reverse: true,
  },
  b4: {
    constitution: "balanced",
    text: "您比一般人耐受不了寒冷（冬天的寒冷、夏天的冷空调、电扇等）吗？",
    reverse: true,
  },
  // 气虚质 (3 items)
  qd1: { constitution: "qi-deficiency", text: "您容易疲乏吗？" },
  qd2: {
    constitution: "qi-deficiency",
    text: "您容易气短（呼吸短促、接不上气）吗？",
  },
  qd3: { constitution: "qi-deficiency", text: "您容易心慌吗？" },
  // 阳虚质 (3 items)
  yd1: {
    constitution: "yang-deficiency",
    text: "您胃脘部、背部或腰膝部怕冷吗？",
  },
  yd2: {
    constitution: "yang-deficiency",
    text: "您感到怕冷、衣服比别人穿得多吗？",
  },
  yd3: {
    constitution: "yang-deficiency",
    text: "您比一般人耐受不了寒冷（冬天的寒冷、夏天的冷空调、电扇等）吗？",
  },
  // 阴虚质 (3 items)
  yid1: { constitution: "yin-deficiency", text: "您感觉身体、脸上发热吗？" },
  yid2: { constitution: "yin-deficiency", text: "您皮肤或口唇干吗？" },
  yid3: { constitution: "yin-deficiency", text: "您面部两颧潮红或偏红吗？" },
  // 痰湿质 (3 items)
  pd1: {
    constitution: "phlegm-dampness",
    text: "您感到身体沉重不轻松或不爽快吗？",
  },
  pd2: { constitution: "phlegm-dampness", text: "您腹部肥满松软吗？" },
  pd3: { constitution: "phlegm-dampness", text: "您嘴里有黏黏的感觉吗？" },
  // 湿热质 (4 items, 2 with gender limits)
  dh1: {
    constitution: "damp-heat",
    text: "您面部或鼻部有油腻感或者油亮发光吗？",
  },
  dh2: {
    constitution: "damp-heat",
    text: "您小便时尿道有发热感、尿色浓（深）吗？",
  },
  dh3: {
    constitution: "damp-heat",
    text: "您带下色黄（白带颜色发黄）吗？",
    gender: "female",
  },
  dh4: {
    constitution: "damp-heat",
    text: "您的阴囊部位潮湿吗？",
    gender: "male",
  },
  // 血瘀质 (3 items)
  bs1: { constitution: "blood-stasis", text: "您身体上有哪里疼痛吗？" },
  bs2: { constitution: "blood-stasis", text: "您面色晦暗或容易出现褐斑吗？" },
  bs3: { constitution: "blood-stasis", text: "您口唇颜色偏暗吗？" },
  // 气郁质 (3 items)
  qs1: { constitution: "qi-stagnation", text: "您感到闷闷不乐、情绪低沉吗？" },
  qs2: { constitution: "qi-stagnation", text: "您容易精神紧张、焦虑不安吗？" },
  qs3: { constitution: "qi-stagnation", text: "您多愁善感、感情脆弱吗？" },
  // 特禀质 (4 items)
  al1: { constitution: "allergic", text: "您没有感冒时也会打喷嚏吗？" },
  al2: {
    constitution: "allergic",
    text: "您容易过敏（对药物、食物、气味、花粉或在季节交替、气候变化时）吗？",
  },
  al3: {
    constitution: "allergic",
    text: "您的皮肤容易起荨麻疹（风团、风疹块、风疙瘩）吗？",
  },
  al4: { constitution: "allergic", text: "您的皮肤一抓就红、并出现抓痕吗？" },
};

// ============================================================
// 核心算法
// ============================================================

/**
 * 计算单个体质的原始分和转化分
 */
function calculateScore(scores, reverseFlags) {
  const n = scores.length;
  if (n === 0) return { rawScore: 0, convertedScore: 0 };
  const adjusted = scores.map((s, i) => (reverseFlags[i] ? 6 - s : s));
  const rawScore = adjusted.reduce((a, b) => a + b, 0);
  const convertedScore = ((rawScore - n) / (n * 4)) * 100;
  return { rawScore, convertedScore: Math.round(convertedScore * 100) / 100 };
}

/**
 * 完整判定流程
 * @param {Object} answers - { itemId: score, ... }
 * @param {'male'|'female'} gender
 */
function performAssessment(answers, gender) {
  // 按体质分组收集分数
  const groups = {};
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.gender && item.gender !== gender) continue;
    if (answers[id] == null) continue;
    const c = item.constitution;
    if (!groups[c]) groups[c] = [];
    groups[c].push({ score: answers[id], reverse: !!item.reverse });
  }

  const results = CONSTITUTION_TYPES.map((ct) => {
    const items = groups[ct.id] || [];
    const scores = items.map((i) => i.score);
    const reverseFlags = items.map((i) => i.reverse);
    const { rawScore, convertedScore } = calculateScore(scores, reverseFlags);

    let verdict, label;
    if (ct.id === "balanced") {
      verdict = "pending";
      label = "--";
    } else {
      if (convertedScore >= 40) {
        verdict = "yes";
        label = "是";
      } else if (convertedScore >= 30) {
        verdict = "tend";
        label = "倾向是";
      } else {
        verdict = "no";
        label = "否";
      }
    }

    return {
      id: ct.id,
      name: ct.name,
      icon: ct.icon,
      color: ct.color,
      rawScore,
      convertedScore,
      verdict,
      label,
      answeredCount: items.length,
      totalItems: Object.values(ITEMS).filter(
        (i) => i.constitution === ct.id && (!i.gender || i.gender === gender),
      ).length,
    };
  });

  // 平和质最终判定
  const balanced = results.find((r) => r.id === "balanced");
  const biasedScores = results
    .filter((r) => r.id !== "balanced")
    .map((r) => r.convertedScore);

  const allBelow30 = biasedScores.every((s) => s < 30);
  const allBelow40 = biasedScores.every((s) => s < 40);

  if (balanced.convertedScore >= 60 && allBelow30) {
    balanced.verdict = "yes";
    balanced.label = "是";
  } else if (balanced.convertedScore >= 60 && allBelow40) {
    balanced.verdict = "basic";
    balanced.label = "基本是";
  } else {
    balanced.verdict = "no";
    balanced.label = "否";
  }

  // 结论
  const conclusion = determineConclusion(results);
  return { results, conclusion };
}

function determineConclusion(results) {
  const balanced = results.find((r) => r.id === "balanced");

  if (balanced.verdict === "yes") {
    return {
      isBalanced: true,
      primaryName: "平和质",
      primaryIcon: "🌿",
      description: "恭喜！您目前的体质状态为平和质，属于理想的健康体质。",
    };
  }

  if (balanced.verdict === "basic") {
    const biased = results.filter(
      (r) =>
        r.id !== "balanced" && (r.verdict === "yes" || r.verdict === "tend"),
    );
    return {
      isBalanced: false,
      verdict: "basic",
      primaryName: "基本是平和质",
      primaryIcon: "🌿",
      biased,
      description:
        "您基本属于平和质，但部分偏颇体质有一定倾向，建议针对性调养。",
    };
  }

  const biased = results
    .filter((r) => r.id !== "balanced" && r.verdict === "yes")
    .sort((a, b) => b.convertedScore - a.convertedScore);

  const tend = results
    .filter((r) => r.id !== "balanced" && r.verdict === "tend")
    .sort((a, b) => b.convertedScore - a.convertedScore);

  if (biased.length > 0) {
    const primary = biased[0];
    return {
      isBalanced: false,
      verdict: "biased",
      primaryName: primary.name,
      primaryIcon: primary.icon,
      primary,
      biased,
      tend,
      description: `您的体质偏向「${primary.name}」，建议参考调养建议进行调理。`,
    };
  }

  if (tend.length > 0) {
    const primary = tend[0];
    return {
      isBalanced: false,
      verdict: "tend",
      primaryName: primary.name,
      primaryIcon: primary.icon,
      primary,
      tend,
      description: `您的体质有「${primary.name}」的倾向，需要注意调养。`,
    };
  }

  return {
    isBalanced: true,
    primaryName: "平和质",
    primaryIcon: "🌿",
    description: "您目前的体质状态为平和质。",
  };
}

// ============================================================
// CORS 头
// ============================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

// ============================================================
// Worker 路由
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // API 路由
    if (url.pathname === "/api/health" || url.pathname === "/api/health/") {
      return jsonResponse({
        status: "ok",
        service: "中医体质分类与判定 API",
        standard: "GB/T 46939-2025",
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/types" || url.pathname === "/api/types/") {
      return jsonResponse({ types: CONSTITUTION_TYPES });
    }

    if (
      url.pathname === "/api/questions" ||
      url.pathname === "/api/questions/"
    ) {
      const questions = Object.entries(ITEMS).map(([id, item]) => ({
        id,
        constitution: item.constitution,
        text: item.text,
        reverse: item.reverse || false,
        gender: item.gender || "all",
      }));
      return jsonResponse({ questions });
    }

    if (
      (url.pathname === "/api/assess" || url.pathname === "/api/assess/") &&
      method === "POST"
    ) {
      try {
        const body = await request.json();
        const { gender, answers } = body;

        if (!gender || !["male", "female"].includes(gender)) {
          return jsonResponse(
            { error: "请提供有效的性别参数 (male/female)" },
            400,
          );
        }
        if (!answers || typeof answers !== "object") {
          return jsonResponse({ error: "请提供 answers 对象" }, 400);
        }

        const result = performAssessment(answers, gender);
        return jsonResponse(result);
      } catch (err) {
        return jsonResponse({ error: "请求解析失败: " + err.message }, 400);
      }
    }

    // 静态资源 — 由 Workers Static Assets 处理
    // 根路径或未匹配 API 路由时，尝试从 assets 获取对应文件
    try {
      if (url.pathname === "/" || url.pathname === "") {
        // 根路径返回 index.html
        const indexReq = new Request(
          new URL("/index.html", request.url),
          request,
        );
        return await env.ASSETS.fetch(indexReq);
      }
      return await env.ASSETS.fetch(request);
    } catch {
      // assets 返回 404 时，回退到 index.html（支持 SPA 客户端路由）
      try {
        const indexReq = new Request(
          new URL("/index.html", request.url),
          request,
        );
        return await env.ASSETS.fetch(indexReq);
      } catch {
        return jsonResponse({ error: "Not Found", path: url.pathname }, 404);
      }
    }
  },
};
