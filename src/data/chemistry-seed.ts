import type { Grade, KnowledgePoint, KnowledgeRelation, Question } from "@/domain/types";

export const grades: Grade[] = ["初三", "高一", "高二", "高三"];

export const knowledgePoints: KnowledgePoint[] = [
  { id: "change", grade: "初三", name: "物质的变化", description: "判断物理变化和化学变化。", x: 50, y: 10 },
  { id: "solution", grade: "初三", name: "水与溶液", description: "理解溶液特征和酸碱性基础。", x: 70, y: 30 },
  { id: "indicator", grade: "初三", name: "酸碱指示剂", description: "掌握石蕊、酚酞等指示剂变色规律。", x: 42, y: 52 },
  { id: "acid_base", grade: "初三", name: "酸碱盐基础", description: "理解酸、碱、盐性质和常见反应。", x: 72, y: 58 },
  { id: "equation", grade: "初三", name: "化学方程式计算", description: "依据质量守恒和方程式进行计算。", x: 52, y: 82 },
  { id: "amount", grade: "高一", name: "物质的量", description: "理解摩尔和阿伏伽德罗常数。", x: 50, y: 12 },
  { id: "ion", grade: "高一", name: "离子反应", description: "理解离子方程式和反应本质。", x: 30, y: 40 },
  { id: "redox", grade: "高一", name: "氧化还原反应", description: "理解化合价和电子转移。", x: 70, y: 40 },
  { id: "structure", grade: "高二", name: "原子结构与周期律", description: "理解结构决定性质。", x: 50, y: 12 },
  { id: "balance", grade: "高二", name: "化学平衡", description: "理解动态平衡和移动规律。", x: 70, y: 48 },
  { id: "integrated", grade: "高三", name: "综合化学思维", description: "综合运用化学知识解决真实问题。", x: 50, y: 12 },
  { id: "experiment", grade: "高三", name: "实验探究", description: "设计实验、控制变量、分析证据。", x: 78, y: 48 }
];

export const knowledgeRelations: KnowledgeRelation[] = [
  { fromPointId: "change", toPointId: "solution", relationType: "parent" },
  { fromPointId: "solution", toPointId: "indicator", relationType: "prerequisite" },
  { fromPointId: "indicator", toPointId: "acid_base", relationType: "prerequisite" },
  { fromPointId: "acid_base", toPointId: "equation", relationType: "prerequisite" },
  { fromPointId: "amount", toPointId: "ion", relationType: "prerequisite" },
  { fromPointId: "amount", toPointId: "redox", relationType: "parent" },
  { fromPointId: "structure", toPointId: "balance", relationType: "prerequisite" },
  { fromPointId: "integrated", toPointId: "experiment", relationType: "parent" }
];

export const questions: Question[] = [
  {
    id: "q_indicator_1",
    grade: "初三",
    stem: "某无色溶液能使紫色石蕊试液变红，该溶液可能呈什么性？",
    options: [
      { label: "A", text: "酸性" },
      { label: "B", text: "碱性" },
      { label: "C", text: "中性" },
      { label: "D", text: "无法判断" }
    ],
    answer: "A",
    analysis: "紫色石蕊遇酸变红，遇碱变蓝。",
    difficulty: "basic",
    medianTimeSeconds: 22,
    auditStatus: "published",
    primaryKnowledgePointId: "indicator",
    prerequisiteKnowledgePointIds: ["solution"],
    coreLiteracy: ["evidence_model"],
    abilityTarget: "能根据实验现象判断溶液酸碱性。",
    positiveFeedback: "你能根据颜色变化推出溶液性质，证据推理能力正在提升。",
    wrongFeedback: "这题关键证据是“石蕊变红”，先抓住现象，再判断酸碱性。"
  },
  {
    id: "q_indicator_2",
    grade: "初三",
    stem: "向某无色溶液中滴加酚酞试液后变红，该溶液最可能呈什么性？",
    options: [
      { label: "A", text: "酸性" },
      { label: "B", text: "碱性" },
      { label: "C", text: "中性" },
      { label: "D", text: "无法判断" }
    ],
    answer: "B",
    analysis: "无色酚酞遇碱性溶液变红，在酸性或中性溶液中通常不变色。",
    difficulty: "basic",
    medianTimeSeconds: 24,
    auditStatus: "published",
    primaryKnowledgePointId: "indicator",
    prerequisiteKnowledgePointIds: ["solution"],
    coreLiteracy: ["evidence_model"],
    abilityTarget: "能根据指示剂现象提取证据并判断溶液酸碱性。",
    positiveFeedback: "你能把酚酞变色情况和溶液性质对应起来，证据推理更稳了。",
    wrongFeedback: "这题先抓住“酚酞变红”这个证据，再对应到碱性溶液。"
  },
  {
    id: "q_acid_base_1",
    grade: "初三",
    stem: "酸和碱反应生成盐和水的反应通常称为什么？",
    options: [
      { label: "A", text: "置换反应" },
      { label: "B", text: "中和反应" },
      { label: "C", text: "分解反应" },
      { label: "D", text: "化合反应" }
    ],
    answer: "B",
    analysis: "酸与碱反应生成盐和水，这类反应称为中和反应。",
    difficulty: "basic",
    medianTimeSeconds: 25,
    auditStatus: "published",
    primaryKnowledgePointId: "acid_base",
    prerequisiteKnowledgePointIds: ["indicator"],
    coreLiteracy: ["change_balance"],
    abilityTarget: "能识别酸碱反应的基本类型。",
    positiveFeedback: "你抓住了酸和碱反应的产物，变化观念更清楚了。",
    wrongFeedback: "这题要先看反应物是酸和碱，再看产物是盐和水。"
  },
  {
    id: "q_redox_1",
    grade: "高一",
    stem: "氧化还原反应的本质是什么？",
    options: [
      { label: "A", text: "有氧气参加" },
      { label: "B", text: "电子转移" },
      { label: "C", text: "产生沉淀" },
      { label: "D", text: "温度升高" }
    ],
    answer: "B",
    analysis: "氧化还原反应的本质是电子得失或偏移。",
    difficulty: "medium",
    medianTimeSeconds: 30,
    auditStatus: "published",
    primaryKnowledgePointId: "redox",
    prerequisiteKnowledgePointIds: ["amount"],
    coreLiteracy: ["macro_micro", "change_balance"],
    abilityTarget: "能从微观电子转移理解反应本质。",
    positiveFeedback: "你能从表面现象深入到电子转移本质，微观探析能力在提升。",
    wrongFeedback: "氧化还原不等于一定有氧气参加，关键要看电子转移。"
  },
  {
    id: "q_ai_pending_1",
    grade: "初三",
    stem: "下列变化中，属于化学变化的是哪一项？",
    options: [
      { label: "A", text: "冰雪融化" },
      { label: "B", text: "纸张燃烧" },
      { label: "C", text: "酒精挥发" },
      { label: "D", text: "玻璃破碎" }
    ],
    answer: "B",
    analysis: "纸张燃烧生成了新物质，属于化学变化。",
    difficulty: "basic",
    medianTimeSeconds: 24,
    auditStatus: "pending_review",
    primaryKnowledgePointId: "change",
    prerequisiteKnowledgePointIds: [],
    coreLiteracy: ["change_balance"],
    abilityTarget: "能从是否生成新物质判断物理变化和化学变化。",
    positiveFeedback: "你能抓住“生成新物质”这个核心证据，变化观念正在变稳。",
    wrongFeedback: "判断变化类型时，先看有没有生成新物质。"
  }
];
