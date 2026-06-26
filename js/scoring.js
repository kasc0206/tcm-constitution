/**
 * GB/T 46939-2025 中医体质分类与判定 — 计分与判定算法
 *
 * 第5章 — 中医体质分类的判定
 */

/**
 * 计算单个体质类型的原始分和转化分
 * @param {Array<number>} scores - 该体质各条目的评分值 (1-5)
 * @param {Array<boolean>} reverseFlags - 各条目是否需要逆向计分
 * @returns {{ rawScore: number, convertedScore: number }}
 */
function calculateConstitutionScore(scores, reverseFlags) {
  const n = scores.length;
  if (n === 0) return { rawScore: 0, convertedScore: 0 };

  // 逆向计分: 1↔5, 2↔4, 3→3
  const adjusted = scores.map((s, i) => {
    return reverseFlags && reverseFlags[i] ? 6 - s : s;
  });

  const rawScore = adjusted.reduce((a, b) => a + b, 0);

  // 转化分数 = [(原始分 - 条目数) / (条目数 × 4)] × 100
  const convertedScore = ((rawScore - n) / (n * 4)) * 100;

  return { rawScore, convertedScore };
}

/**
 * 判定平和质结果
 * @param {number} balancedScore - 平和质转化分
 * @param {Array<number>} biasedScores - 其他8种偏颇体质转化分数组
 * @returns {{ verdict: string, label: string }}
 */
function judgeBalanced(balancedScore, biasedScores) {
  const allBelow30 = biasedScores.every((s) => s < 30);
  const allBelow40 = biasedScores.every((s) => s < 40);

  if (balancedScore >= 60 && allBelow30) {
    return { verdict: "yes", label: "是" };
  }
  if (balancedScore >= 60 && allBelow40) {
    return { verdict: "basic", label: "基本是" };
  }
  return { verdict: "no", label: "否" };
}

/**
 * 判定单个偏颇体质结果
 * @param {number} convertedScore - 转化分
 * @returns {{ verdict: string, label: string }}
 */
function judgeBiased(convertedScore) {
  if (convertedScore >= 40) {
    return { verdict: "yes", label: "是" };
  }
  if (convertedScore >= 30) {
    return { verdict: "tend", label: "倾向是" };
  }
  return { verdict: "no", label: "否" };
}

/**
 * 执行完整判定
 * @param {Object} answers - 用户答案 { questionId: score }
 * @param {string} gender - 'male' | 'female'
 * @returns {Object} 判定结果
 */
function performAssessment(answers, gender) {
  const results = [];

  for (const ct of CONSTITUTION_TYPES) {
    // 获取该体质实际回答的条目
    const answeredItems = ct.items.filter((item) => {
      if (item.gender && item.gender !== gender) return false;
      return answers[item.id] !== undefined && answers[item.id] !== null;
    });

    const scores = answeredItems.map((item) => answers[item.id]);
    const reverseFlags = answeredItems.map((item) => !!item.reverse);

    const { rawScore, convertedScore } = calculateConstitutionScore(
      scores,
      reverseFlags,
    );

    let verdict, label;
    if (ct.id === "balanced") {
      // 平和质的判定需要等待所有偏颇体质结果
      // 这里先存储，稍后计算
      results.push({
        ...ct,
        rawScore,
        convertedScore: Math.round(convertedScore * 100) / 100,
        answeredCount: answeredItems.length,
        totalItems: ct.items.filter((i) => !i.gender || i.gender === gender)
          .length,
        _temp: { verdict, label },
      });
    } else {
      ({ verdict, label } = judgeBiased(convertedScore));
      results.push({
        ...ct,
        rawScore,
        convertedScore: Math.round(convertedScore * 100) / 100,
        answeredCount: answeredItems.length,
        totalItems: ct.items.filter((i) => !i.gender || i.gender === gender)
          .length,
        verdict,
        label,
      });
    }
  }

  // 计算平和质的最终判定
  const balancedResult = results.find((r) => r.id === "balanced");
  const biasedScores = results
    .filter((r) => r.id !== "balanced")
    .map((r) => r.convertedScore);
  const balancedJudgment = judgeBalanced(
    balancedResult.convertedScore,
    biasedScores,
  );
  balancedResult.verdict = balancedJudgment.verdict;
  balancedResult.label = balancedJudgment.label;

  // 确定最终的体质分类结论
  const conclusion = determineConclusion(results);

  return { results, conclusion };
}

/**
 * 确定最终体质结论
 * @param {Array} results - 所有体质的判定结果
 * @returns {Object} { type, subtype, description }
 */
function determineConclusion(results) {
  const balanced = results.find((r) => r.id === "balanced");

  // 如果是平和质
  if (balanced.verdict === "yes") {
    return {
      isBalanced: true,
      verdict: "yes",
      primaryName: "平和质",
      primaryIcon: "🌿",
      primaryColor: "#4a7c59",
      description: "恭喜！您目前的体质状态为平和质，属于理想的健康体质。",
    };
  }

  if (balanced.verdict === "basic") {
    // 基本是平和质，列出偏颇倾向
    const biased = results.filter(
      (r) =>
        r.id !== "balanced" && (r.verdict === "yes" || r.verdict === "tend"),
    );
    return {
      isBalanced: false,
      verdict: "basic",
      primaryName: "基本是平和质",
      primaryIcon: "🌿",
      primaryColor: "#6b9c7a",
      biased: biased.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        verdict: r.verdict,
        label: r.label,
        score: r.convertedScore,
      })),
      description:
        "您基本属于平和质，但部分偏颇体质有一定倾向，建议针对性调养。",
    };
  }

  // 偏颇体质 — 找出主要偏颇类型（按转化分从高到低排序）
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
      primaryColor: primary.color,
      primary: {
        id: primary.id,
        name: primary.name,
        icon: primary.icon,
        score: primary.convertedScore,
      },
      biased: biased.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        verdict: r.verdict,
        label: r.label,
        score: r.convertedScore,
      })),
      tend: tend.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        verdict: r.verdict,
        label: r.label,
        score: r.convertedScore,
      })),
      description: `您的体质偏向「${primary.name}」，建议参考下方调养建议进行调理。`,
    };
  }

  if (tend.length > 0) {
    const primary = tend[0];
    return {
      isBalanced: false,
      verdict: "tend",
      primaryName: primary.name,
      primaryIcon: primary.icon,
      primaryColor: primary.color,
      primary: {
        id: primary.id,
        name: primary.name,
        icon: primary.icon,
        score: primary.convertedScore,
      },
      tend: tend.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        verdict: r.verdict,
        label: r.label,
        score: r.convertedScore,
      })),
      description: `您的体质有「${primary.name}」的倾向，需要注意调养。`,
    };
  }

  return {
    isBalanced: true,
    verdict: "yes",
    primaryName: "平和质",
    primaryIcon: "🌿",
    primaryColor: "#4a7c59",
    description: "您目前的体质状态为平和质。",
  };
}
