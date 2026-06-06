import { pbkdf2Sync, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const demoPassword = "Chem2Exam@2026";

const gradeMap = {
  初三: "junior_three",
  高一: "senior_one",
  高二: "senior_two",
  高三: "senior_three"
};

const difficultyMap = {
  basic: "basic",
  medium: "medium",
  advanced: "advanced",
  integrated: "integrated"
};

const schools = [
  {
    id: "school_seed_demo",
    name: "化学诊断示范学校",
    region: "长沙试点校",
    status: "active"
  },
  {
    id: "school_seed_joint",
    name: "星城联合教研试点校",
    region: "长沙联合教研片区",
    status: "active"
  }
];

const classGroups = [
  {
    id: "class_seed_junior_three",
    schoolId: "school_seed_demo",
    name: "初三化学诊断一班",
    grade: "初三",
    status: "active"
  },
  {
    id: "class_seed_senior_one",
    schoolId: "school_seed_demo",
    name: "高一化学衔接班",
    grade: "高一",
    status: "active"
  },
  {
    id: "class_seed_senior_two",
    schoolId: "school_seed_demo",
    name: "高二选择性必修诊断班",
    grade: "高二",
    status: "active"
  },
  {
    id: "class_seed_senior_three",
    schoolId: "school_seed_demo",
    name: "高三综合复习 A 班",
    grade: "高三",
    status: "active"
  },
  {
    id: "class_seed_joint_senior_three",
    schoolId: "school_seed_joint",
    name: "联合教研高三样本班",
    grade: "高三",
    status: "active"
  }
];

const knowledgePoints = [
  { id: "change", grade: "初三", name: "物质的变化", description: "判断物理变化和化学变化。", x: 16, y: 14 },
  { id: "solution", grade: "初三", name: "水与溶液", description: "理解溶液特征、溶质溶剂和酸碱性基础。", x: 38, y: 30 },
  { id: "indicator", grade: "初三", name: "酸碱指示剂", description: "掌握石蕊、酚酞等指示剂变色规律。", x: 62, y: 28 },
  { id: "acid_base", grade: "初三", name: "酸碱盐基础", description: "理解酸、碱、盐性质和常见反应。", x: 74, y: 48 },
  { id: "gas_preparation", grade: "初三", name: "气体制取与检验", description: "掌握常见气体制取、收集和检验方法。", x: 26, y: 60 },
  { id: "metal_activity", grade: "初三", name: "金属活动性", description: "运用金属活动性顺序解释置换反应。", x: 52, y: 68 },
  { id: "equation", grade: "初三", name: "化学方程式计算", description: "依据质量守恒和方程式进行计算。", x: 78, y: 76 },
  { id: "substance_classification", grade: "高一", name: "物质分类", description: "从组成和性质角度辨析物质类别。", x: 14, y: 16 },
  { id: "amount", grade: "高一", name: "物质的量", description: "理解摩尔、阿伏伽德罗常数和计量关系。", x: 36, y: 30 },
  { id: "ion", grade: "高一", name: "离子反应", description: "理解离子方程式和反应本质。", x: 58, y: 32 },
  { id: "redox", grade: "高一", name: "氧化还原反应", description: "理解化合价变化和电子转移。", x: 78, y: 48 },
  { id: "sodium_chlorine", grade: "高一", name: "钠及氯及其化合物", description: "从性质、转化和实验现象理解元素化合物。", x: 42, y: 66 },
  { id: "experiment_basics", grade: "高一", name: "化学实验基础", description: "掌握基本操作、分离提纯和安全规范。", x: 70, y: 78 },
  { id: "structure", grade: "高二", name: "原子结构与周期律", description: "理解结构决定性质。", x: 16, y: 16 },
  { id: "rate", grade: "高二", name: "化学反应速率", description: "理解浓度、温度、催化剂对速率的影响。", x: 38, y: 30 },
  { id: "balance", grade: "高二", name: "化学平衡", description: "理解动态平衡和平衡移动规律。", x: 60, y: 42 },
  { id: "electrolyte", grade: "高二", name: "电解质溶液", description: "理解弱电解质电离、水解和沉淀溶解平衡。", x: 80, y: 58 },
  { id: "thermo", grade: "高二", name: "化学反应热", description: "利用能量变化和热化学方程式解释反应。", x: 30, y: 72 },
  { id: "organic_basics", grade: "高二", name: "有机化学基础", description: "认识官能团、同分异构和典型反应。", x: 62, y: 78 },
  { id: "integrated", grade: "高三", name: "综合化学思维", description: "综合运用化学知识解决真实问题。", x: 16, y: 18 },
  { id: "experiment", grade: "高三", name: "实验探究", description: "设计实验、控制变量、分析证据。", x: 38, y: 34 },
  { id: "industrial_process", grade: "高三", name: "工艺流程分析", description: "分析工业流程中的转化、分离和条件控制。", x: 62, y: 42 },
  { id: "equilibrium_calculation", grade: "高三", name: "平衡综合计算", description: "综合浓度、转化率、平衡常数进行计算。", x: 80, y: 58 },
  { id: "organic_synthesis", grade: "高三", name: "有机合成推断", description: "利用官能团转化和反应条件推断路线。", x: 36, y: 74 },
  { id: "evidence_reasoning", grade: "高三", name: "证据推理综合", description: "整合图表、现象和数据形成解释模型。", x: 66, y: 80 }
];

const relations = [
  { fromPointId: "change", toPointId: "solution", relationType: "parent", weight: 0.7 },
  { fromPointId: "solution", toPointId: "indicator", relationType: "prerequisite", weight: 0.9 },
  { fromPointId: "indicator", toPointId: "acid_base", relationType: "prerequisite", weight: 0.95 },
  { fromPointId: "acid_base", toPointId: "equation", relationType: "prerequisite", weight: 0.85 },
  { fromPointId: "acid_base", toPointId: "gas_preparation", relationType: "similar_practice", weight: 0.65 },
  { fromPointId: "metal_activity", toPointId: "gas_preparation", relationType: "prerequisite", weight: 0.72 },
  { fromPointId: "substance_classification", toPointId: "amount", relationType: "prerequisite", weight: 0.82 },
  { fromPointId: "amount", toPointId: "ion", relationType: "prerequisite", weight: 0.88 },
  { fromPointId: "ion", toPointId: "redox", relationType: "confused_with", weight: 0.52 },
  { fromPointId: "redox", toPointId: "sodium_chlorine", relationType: "integrated_application", weight: 0.7 },
  { fromPointId: "experiment_basics", toPointId: "ion", relationType: "similar_practice", weight: 0.55 },
  { fromPointId: "structure", toPointId: "rate", relationType: "parent", weight: 0.64 },
  { fromPointId: "rate", toPointId: "balance", relationType: "prerequisite", weight: 0.9 },
  { fromPointId: "balance", toPointId: "electrolyte", relationType: "prerequisite", weight: 0.82 },
  { fromPointId: "thermo", toPointId: "balance", relationType: "integrated_application", weight: 0.68 },
  { fromPointId: "structure", toPointId: "organic_basics", relationType: "similar_practice", weight: 0.45 },
  { fromPointId: "integrated", toPointId: "experiment", relationType: "parent", weight: 0.7 },
  { fromPointId: "experiment", toPointId: "evidence_reasoning", relationType: "prerequisite", weight: 0.92 },
  { fromPointId: "integrated", toPointId: "industrial_process", relationType: "integrated_application", weight: 0.78 },
  { fromPointId: "industrial_process", toPointId: "equilibrium_calculation", relationType: "prerequisite", weight: 0.74 },
  { fromPointId: "organic_synthesis", toPointId: "evidence_reasoning", relationType: "integrated_application", weight: 0.62 }
];

const examPapers = [
  {
    id: "paper_seed_2024_changsha_zhongkao",
    title: "2024 长沙中考化学诊断样题",
    examType: "中考真题",
    year: 2024,
    region: "长沙",
    grade: "初三",
    copyrightStatus: "educational_demo",
    uploadUserId: "demo_admin",
    status: "reviewed"
  },
  {
    id: "paper_seed_2025_hunan_senior_one",
    title: "2025 湖南高一化学期末诊断样题",
    examType: "高一期末真题",
    year: 2025,
    region: "湖南",
    grade: "高一",
    copyrightStatus: "educational_demo",
    uploadUserId: "demo_admin",
    status: "reviewed"
  },
  {
    id: "paper_seed_2025_hunan_senior_two",
    title: "2025 湖南高二选择性必修诊断样题",
    examType: "高二联考真题",
    year: 2025,
    region: "湖南",
    grade: "高二",
    copyrightStatus: "educational_demo",
    uploadUserId: "demo_admin",
    status: "reviewed"
  },
  {
    id: "paper_seed_2026_national_senior_three",
    title: "2026 高三综合复习化学诊断样题",
    examType: "高考模拟真题",
    year: 2026,
    region: "全国卷样区",
    grade: "高三",
    copyrightStatus: "educational_demo",
    uploadUserId: "demo_admin",
    status: "reviewed"
  },
  {
    id: "paper_seed_ai_candidates",
    title: "AI 拆题候选审核样题包",
    examType: "AI 拆题候选",
    year: 2026,
    region: "本地演示",
    grade: "初三",
    copyrightStatus: "educational_demo",
    uploadUserId: "demo_admin",
    status: "pending_review"
  }
];

const questions = [
  {
    id: "q_indicator_1",
    grade: "初三",
    examPaperId: "paper_seed_2024_changsha_zhongkao",
    questionNumber: "3",
    examType: "中考真题",
    questionType: "single_choice",
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
    sourceMeta: { sourceName: "2024 长沙中考化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_indicator_2",
    grade: "初三",
    examPaperId: "paper_seed_2024_changsha_zhongkao",
    questionNumber: "4",
    examType: "中考真题",
    questionType: "single_choice",
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
    sourceMeta: { sourceName: "2024 长沙中考化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_acid_base_1",
    grade: "初三",
    examPaperId: "paper_seed_2024_changsha_zhongkao",
    questionNumber: "7",
    examType: "中考真题",
    questionType: "single_choice",
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
    sourceMeta: { sourceName: "2024 长沙中考化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_change_published_1",
    grade: "初三",
    examPaperId: "paper_seed_2024_changsha_zhongkao",
    questionNumber: "1",
    examType: "中考真题",
    questionType: "single_choice",
    stem: "下列变化中属于化学变化的是哪一项？",
    options: [
      { label: "A", text: "海水晒盐" },
      { label: "B", text: "铁丝生锈" },
      { label: "C", text: "干冰升华" },
      { label: "D", text: "水结成冰" }
    ],
    answer: "B",
    analysis: "铁丝生锈生成了新物质，属于化学变化。",
    difficulty: "basic",
    medianTimeSeconds: 20,
    auditStatus: "published",
    primaryKnowledgePointId: "change",
    prerequisiteKnowledgePointIds: [],
    coreLiteracy: ["change_balance"],
    abilityTarget: "能依据是否生成新物质判断变化类型。",
    sourceMeta: { sourceName: "2024 长沙中考化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_solution_1",
    grade: "初三",
    examPaperId: "paper_seed_2024_changsha_zhongkao",
    questionNumber: "2",
    examType: "中考真题",
    questionType: "single_choice",
    stem: "把少量蔗糖加入水中充分搅拌后形成蔗糖溶液。下列说法正确的是哪一项？",
    options: [
      { label: "A", text: "蔗糖是溶质，水是溶剂" },
      { label: "B", text: "水是溶质，蔗糖是溶剂" },
      { label: "C", text: "蔗糖溶液一定呈碱性" },
      { label: "D", text: "蔗糖不能形成溶液" }
    ],
    answer: "A",
    analysis: "蔗糖被水溶解，蔗糖是溶质，水是溶剂。",
    difficulty: "basic",
    medianTimeSeconds: 26,
    auditStatus: "published",
    primaryKnowledgePointId: "solution",
    prerequisiteKnowledgePointIds: ["change"],
    coreLiteracy: ["macro_micro"],
    abilityTarget: "能从宏观现象辨析溶质和溶剂。",
    sourceMeta: { sourceName: "2024 长沙中考化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_equation_1",
    grade: "初三",
    examPaperId: "paper_seed_2024_changsha_zhongkao",
    questionNumber: "13",
    examType: "中考真题",
    questionType: "calculation",
    stem: "2H2 + O2 点燃生成 2H2O。若有 4 g H2 完全反应，理论上消耗 O2 的质量是多少？",
    options: [
      { label: "A", text: "8 g" },
      { label: "B", text: "16 g" },
      { label: "C", text: "32 g" },
      { label: "D", text: "36 g" }
    ],
    answer: "C",
    analysis: "4 g H2 为 2 mol，按方程式需要 1 mol O2，即 32 g。",
    difficulty: "medium",
    medianTimeSeconds: 72,
    auditStatus: "published",
    primaryKnowledgePointId: "equation",
    prerequisiteKnowledgePointIds: ["acid_base"],
    coreLiteracy: ["change_balance"],
    abilityTarget: "能依据方程式中的计量关系完成质量计算。",
    sourceMeta: { sourceName: "2024 长沙中考化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_gas_preparation_1",
    grade: "初三",
    examPaperId: "paper_seed_2024_changsha_zhongkao",
    questionNumber: "15",
    examType: "中考真题",
    questionType: "experiment",
    stem: "实验室用石灰石和稀盐酸制取 CO2，下列收集方法较合适的是哪一项？",
    options: [
      { label: "A", text: "向上排空气法" },
      { label: "B", text: "向下排空气法" },
      { label: "C", text: "排水法且不考虑溶解性" },
      { label: "D", text: "只能用集气瓶倒置收集" }
    ],
    answer: "A",
    analysis: "CO2 密度比空气大且能溶于水，通常用向上排空气法收集。",
    difficulty: "medium",
    medianTimeSeconds: 48,
    auditStatus: "published",
    primaryKnowledgePointId: "gas_preparation",
    prerequisiteKnowledgePointIds: ["acid_base"],
    coreLiteracy: ["inquiry_innovation", "evidence_model"],
    abilityTarget: "能依据气体性质选择制取和收集方案。",
    sourceMeta: { sourceName: "2024 长沙中考化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_metal_activity_1",
    grade: "初三",
    examPaperId: "paper_seed_2024_changsha_zhongkao",
    questionNumber: "10",
    examType: "中考真题",
    questionType: "single_choice",
    stem: "将铁片放入硫酸铜溶液中，一段时间后铁片表面出现红色物质。该实验主要说明什么？",
    options: [
      { label: "A", text: "铁比铜活泼" },
      { label: "B", text: "铜比铁活泼" },
      { label: "C", text: "铁和铜都不活泼" },
      { label: "D", text: "硫酸铜不能反应" }
    ],
    answer: "A",
    analysis: "铁能把铜从硫酸铜溶液中置换出来，说明铁比铜活泼。",
    difficulty: "medium",
    medianTimeSeconds: 44,
    auditStatus: "published",
    primaryKnowledgePointId: "metal_activity",
    prerequisiteKnowledgePointIds: ["change"],
    coreLiteracy: ["evidence_model", "change_balance"],
    abilityTarget: "能用实验现象推断金属活动性顺序。",
    sourceMeta: { sourceName: "2024 长沙中考化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_amount_1",
    grade: "高一",
    examPaperId: "paper_seed_2025_hunan_senior_one",
    questionNumber: "5",
    examType: "高一期末真题",
    questionType: "single_choice",
    stem: "1 mol CO2 中含有的 CO2 分子数约为多少？",
    options: [
      { label: "A", text: "6.02 x 10^23" },
      { label: "B", text: "3.01 x 10^23" },
      { label: "C", text: "12.04 x 10^23" },
      { label: "D", text: "1.00 x 10^23" }
    ],
    answer: "A",
    analysis: "1 mol 任意微粒约含 6.02 x 10^23 个微粒。",
    difficulty: "basic",
    medianTimeSeconds: 28,
    auditStatus: "published",
    primaryKnowledgePointId: "amount",
    prerequisiteKnowledgePointIds: ["substance_classification"],
    coreLiteracy: ["macro_micro"],
    abilityTarget: "能把物质的量与微粒数建立联系。",
    sourceMeta: { sourceName: "2025 湖南高一化学期末诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_ion_1",
    grade: "高一",
    examPaperId: "paper_seed_2025_hunan_senior_one",
    questionNumber: "9",
    examType: "高一期末真题",
    questionType: "single_choice",
    stem: "稀硫酸与氢氧化钠溶液反应的离子方程式可表示为哪一项？",
    options: [
      { label: "A", text: "H+ + OH- = H2O" },
      { label: "B", text: "Na+ + SO4^2- = Na2SO4" },
      { label: "C", text: "H2 + O2 = H2O" },
      { label: "D", text: "NaOH = Na+ + OH-" }
    ],
    answer: "A",
    analysis: "强酸与强碱中和反应的本质是 H+ 与 OH- 结合生成水。",
    difficulty: "medium",
    medianTimeSeconds: 38,
    auditStatus: "published",
    primaryKnowledgePointId: "ion",
    prerequisiteKnowledgePointIds: ["amount"],
    coreLiteracy: ["macro_micro", "change_balance"],
    abilityTarget: "能从离子角度表达反应本质。",
    sourceMeta: { sourceName: "2025 湖南高一化学期末诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_redox_1",
    grade: "高一",
    examPaperId: "paper_seed_2025_hunan_senior_one",
    questionNumber: "11",
    examType: "高一期末真题",
    questionType: "single_choice",
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
    sourceMeta: { sourceName: "2025 湖南高一化学期末诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_sodium_chlorine_1",
    grade: "高一",
    examPaperId: "paper_seed_2025_hunan_senior_one",
    questionNumber: "14",
    examType: "高一期末真题",
    questionType: "single_choice",
    stem: "氯气通入 KI 溶液后溶液变成棕黄色，主要说明氯气具有什么性质？",
    options: [
      { label: "A", text: "还原性" },
      { label: "B", text: "氧化性" },
      { label: "C", text: "酸性" },
      { label: "D", text: "碱性" }
    ],
    answer: "B",
    analysis: "氯气把 I- 氧化为 I2，体现氯气的氧化性。",
    difficulty: "advanced",
    medianTimeSeconds: 55,
    auditStatus: "published",
    primaryKnowledgePointId: "sodium_chlorine",
    prerequisiteKnowledgePointIds: ["redox"],
    coreLiteracy: ["evidence_model", "change_balance"],
    abilityTarget: "能结合实验现象判断元素化合物氧化还原性质。",
    sourceMeta: { sourceName: "2025 湖南高一化学期末诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_experiment_basics_1",
    grade: "高一",
    examPaperId: "paper_seed_2025_hunan_senior_one",
    questionNumber: "18",
    examType: "高一期末真题",
    questionType: "experiment",
    stem: "用蒸馏法分离乙醇和水时，温度计水银球应放在什么位置较合适？",
    options: [
      { label: "A", text: "蒸馏烧瓶液面以下" },
      { label: "B", text: "蒸馏烧瓶支管口附近" },
      { label: "C", text: "冷凝管出口处" },
      { label: "D", text: "接收瓶液面以下" }
    ],
    answer: "B",
    analysis: "蒸馏时温度计测量馏分蒸气温度，水银球应位于支管口附近。",
    difficulty: "medium",
    medianTimeSeconds: 46,
    auditStatus: "published",
    primaryKnowledgePointId: "experiment_basics",
    prerequisiteKnowledgePointIds: ["substance_classification"],
    coreLiteracy: ["inquiry_innovation", "attitude_responsibility"],
    abilityTarget: "能根据实验目的选择规范操作位置。",
    sourceMeta: { sourceName: "2025 湖南高一化学期末诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_structure_1",
    grade: "高二",
    examPaperId: "paper_seed_2025_hunan_senior_two",
    questionNumber: "2",
    examType: "高二联考真题",
    questionType: "single_choice",
    stem: "同周期元素从左到右，原子半径总体如何变化？",
    options: [
      { label: "A", text: "逐渐增大" },
      { label: "B", text: "逐渐减小" },
      { label: "C", text: "先增大后减小" },
      { label: "D", text: "没有规律" }
    ],
    answer: "B",
    analysis: "同周期从左到右核电荷数增大，电子层数相同，原子半径总体减小。",
    difficulty: "basic",
    medianTimeSeconds: 32,
    auditStatus: "published",
    primaryKnowledgePointId: "structure",
    prerequisiteKnowledgePointIds: [],
    coreLiteracy: ["macro_micro"],
    abilityTarget: "能从结构角度解释周期律变化。",
    sourceMeta: { sourceName: "2025 湖南高二选择性必修诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_rate_1",
    grade: "高二",
    examPaperId: "paper_seed_2025_hunan_senior_two",
    questionNumber: "5",
    examType: "高二联考真题",
    questionType: "single_choice",
    stem: "其他条件不变时，升高温度通常会使化学反应速率如何变化？",
    options: [
      { label: "A", text: "增大" },
      { label: "B", text: "减小" },
      { label: "C", text: "不变" },
      { label: "D", text: "无法判断" }
    ],
    answer: "A",
    analysis: "升高温度会增加活化分子比例，反应速率通常增大。",
    difficulty: "basic",
    medianTimeSeconds: 28,
    auditStatus: "published",
    primaryKnowledgePointId: "rate",
    prerequisiteKnowledgePointIds: ["structure"],
    coreLiteracy: ["change_balance"],
    abilityTarget: "能解释条件变化对反应速率的影响。",
    sourceMeta: { sourceName: "2025 湖南高二选择性必修诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_balance_1",
    grade: "高二",
    examPaperId: "paper_seed_2025_hunan_senior_two",
    questionNumber: "8",
    examType: "高二联考真题",
    questionType: "single_choice",
    stem: "一定温度下，合成氨反应达到平衡后增大压强，平衡移动方向通常是哪里？",
    options: [
      { label: "A", text: "向气体体积减小的方向" },
      { label: "B", text: "向气体体积增大的方向" },
      { label: "C", text: "一定不移动" },
      { label: "D", text: "只与催化剂有关" }
    ],
    answer: "A",
    analysis: "增大压强时，平衡向气体分子数减少的方向移动。",
    difficulty: "medium",
    medianTimeSeconds: 50,
    auditStatus: "published",
    primaryKnowledgePointId: "balance",
    prerequisiteKnowledgePointIds: ["rate"],
    coreLiteracy: ["change_balance", "evidence_model"],
    abilityTarget: "能用勒夏特列原理判断平衡移动方向。",
    sourceMeta: { sourceName: "2025 湖南高二选择性必修诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_electrolyte_1",
    grade: "高二",
    examPaperId: "paper_seed_2025_hunan_senior_two",
    questionNumber: "12",
    examType: "高二联考真题",
    questionType: "single_choice",
    stem: "向醋酸溶液中加入少量醋酸钠固体，醋酸的电离程度会怎样变化？",
    options: [
      { label: "A", text: "增大" },
      { label: "B", text: "减小" },
      { label: "C", text: "不变" },
      { label: "D", text: "先增大后不变" }
    ],
    answer: "B",
    analysis: "加入醋酸钠增大 CH3COO- 浓度，同离子效应使醋酸电离平衡逆向移动。",
    difficulty: "advanced",
    medianTimeSeconds: 62,
    auditStatus: "published",
    primaryKnowledgePointId: "electrolyte",
    prerequisiteKnowledgePointIds: ["balance"],
    coreLiteracy: ["change_balance", "macro_micro"],
    abilityTarget: "能从离子平衡角度解释弱电解质电离变化。",
    sourceMeta: { sourceName: "2025 湖南高二选择性必修诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_thermo_1",
    grade: "高二",
    examPaperId: "paper_seed_2025_hunan_senior_two",
    questionNumber: "15",
    examType: "高二联考真题",
    questionType: "calculation",
    stem: "已知某反应的 ΔH < 0，下列说法较合理的是哪一项？",
    options: [
      { label: "A", text: "该反应为放热反应" },
      { label: "B", text: "该反应为吸热反应" },
      { label: "C", text: "反应一定不能发生" },
      { label: "D", text: "反应一定无能量变化" }
    ],
    answer: "A",
    analysis: "ΔH < 0 表示反应放出热量，为放热反应。",
    difficulty: "medium",
    medianTimeSeconds: 36,
    auditStatus: "published",
    primaryKnowledgePointId: "thermo",
    prerequisiteKnowledgePointIds: ["change"],
    coreLiteracy: ["change_balance"],
    abilityTarget: "能用焓变符号判断反应热效应。",
    sourceMeta: { sourceName: "2025 湖南高二选择性必修诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_organic_basics_1",
    grade: "高二",
    examPaperId: "paper_seed_2025_hunan_senior_two",
    questionNumber: "19",
    examType: "高二联考真题",
    questionType: "inference",
    stem: "乙醇能与金属钠反应产生氢气，主要与乙醇分子中的哪一结构有关？",
    options: [
      { label: "A", text: "羟基" },
      { label: "B", text: "碳碳双键" },
      { label: "C", text: "羧基" },
      { label: "D", text: "苯环" }
    ],
    answer: "A",
    analysis: "乙醇中的羟基氢可与钠反应生成氢气。",
    difficulty: "medium",
    medianTimeSeconds: 42,
    auditStatus: "published",
    primaryKnowledgePointId: "organic_basics",
    prerequisiteKnowledgePointIds: ["structure"],
    coreLiteracy: ["macro_micro", "evidence_model"],
    abilityTarget: "能根据官能团解释有机物性质。",
    sourceMeta: { sourceName: "2025 湖南高二选择性必修诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_integrated_1",
    grade: "高三",
    examPaperId: "paper_seed_2026_national_senior_three",
    questionNumber: "6",
    examType: "高考模拟真题",
    questionType: "single_choice",
    stem: "处理含铜废液时加入铁粉可回收铜。该过程体现的主要反应类型是什么？",
    options: [
      { label: "A", text: "置换反应" },
      { label: "B", text: "分解反应" },
      { label: "C", text: "化合反应" },
      { label: "D", text: "复分解反应" }
    ],
    answer: "A",
    analysis: "铁把铜离子还原为铜单质，本质上是置换反应和氧化还原过程。",
    difficulty: "medium",
    medianTimeSeconds: 46,
    auditStatus: "published",
    primaryKnowledgePointId: "integrated",
    prerequisiteKnowledgePointIds: ["evidence_reasoning"],
    coreLiteracy: ["change_balance", "attitude_responsibility"],
    abilityTarget: "能在真实治理情境中识别物质转化类型。",
    sourceMeta: { sourceName: "2026 高三综合复习化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_experiment_design_1",
    grade: "高三",
    examPaperId: "paper_seed_2026_national_senior_three",
    questionNumber: "22",
    examType: "高考模拟真题",
    questionType: "experiment",
    stem: "验证某气体中含有 SO2，可选用下列哪种试剂观察褪色现象？",
    options: [
      { label: "A", text: "品红溶液" },
      { label: "B", text: "澄清石灰水" },
      { label: "C", text: "氯化钠溶液" },
      { label: "D", text: "硫酸钠溶液" }
    ],
    answer: "A",
    analysis: "SO2 能使品红溶液褪色，可用于检验 SO2。",
    difficulty: "medium",
    medianTimeSeconds: 44,
    auditStatus: "published",
    primaryKnowledgePointId: "experiment",
    prerequisiteKnowledgePointIds: ["integrated"],
    coreLiteracy: ["inquiry_innovation", "evidence_model"],
    abilityTarget: "能根据实验目的选择检验试剂并解释现象。",
    sourceMeta: { sourceName: "2026 高三综合复习化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_industrial_process_1",
    grade: "高三",
    examPaperId: "paper_seed_2026_national_senior_three",
    questionNumber: "24",
    examType: "高考模拟真题",
    questionType: "inference",
    stem: "某工艺流程中调节 pH 使 Fe3+ 转化为 Fe(OH)3 沉淀，主要目的是什么？",
    options: [
      { label: "A", text: "除去铁杂质" },
      { label: "B", text: "增加铁离子浓度" },
      { label: "C", text: "降低溶液温度" },
      { label: "D", text: "生成氯气" }
    ],
    answer: "A",
    analysis: "调节 pH 使 Fe3+ 形成 Fe(OH)3 沉淀，可实现杂质分离。",
    difficulty: "advanced",
    medianTimeSeconds: 64,
    auditStatus: "published",
    primaryKnowledgePointId: "industrial_process",
    prerequisiteKnowledgePointIds: ["experiment"],
    coreLiteracy: ["evidence_model", "attitude_responsibility"],
    abilityTarget: "能分析工艺流程中分离除杂步骤的化学目的。",
    sourceMeta: { sourceName: "2026 高三综合复习化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_equilibrium_calc_1",
    grade: "高三",
    examPaperId: "paper_seed_2026_national_senior_three",
    questionNumber: "20",
    examType: "高考模拟真题",
    questionType: "calculation",
    stem: "某可逆反应达到平衡时，若生成物浓度增大，平衡常数 K 在温度不变时会怎样变化？",
    options: [
      { label: "A", text: "不变" },
      { label: "B", text: "一定增大" },
      { label: "C", text: "一定减小" },
      { label: "D", text: "先增大后减小" }
    ],
    answer: "A",
    analysis: "平衡常数只与温度有关，温度不变时 K 不变。",
    difficulty: "medium",
    medianTimeSeconds: 52,
    auditStatus: "published",
    primaryKnowledgePointId: "equilibrium_calculation",
    prerequisiteKnowledgePointIds: ["industrial_process"],
    coreLiteracy: ["change_balance"],
    abilityTarget: "能区分浓度改变和平衡常数之间的关系。",
    sourceMeta: { sourceName: "2026 高三综合复习化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_organic_synthesis_1",
    grade: "高三",
    examPaperId: "paper_seed_2026_national_senior_three",
    questionNumber: "26",
    examType: "高考模拟真题",
    questionType: "inference",
    stem: "某有机物能发生银镜反应，说明分子中可能含有什么官能团？",
    options: [
      { label: "A", text: "醛基" },
      { label: "B", text: "羟基" },
      { label: "C", text: "羧基" },
      { label: "D", text: "酯基" }
    ],
    answer: "A",
    analysis: "能发生银镜反应通常说明含有醛基或能转化出醛基的结构。",
    difficulty: "advanced",
    medianTimeSeconds: 58,
    auditStatus: "published",
    primaryKnowledgePointId: "organic_synthesis",
    prerequisiteKnowledgePointIds: ["evidence_reasoning"],
    coreLiteracy: ["macro_micro", "evidence_model"],
    abilityTarget: "能用特征反应推断有机物官能团。",
    sourceMeta: { sourceName: "2026 高三综合复习化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_evidence_reasoning_1",
    grade: "高三",
    examPaperId: "paper_seed_2026_national_senior_three",
    questionNumber: "27",
    examType: "高考模拟真题",
    questionType: "short_answer",
    stem: "某实验中先产生白色沉淀，加入稀硝酸后沉淀不溶，再加入 AgNO3 溶液无明显变化。对该现象的解释较合理的是哪一项？",
    options: [
      { label: "A", text: "原沉淀可能为 BaSO4" },
      { label: "B", text: "原沉淀一定为 AgCl" },
      { label: "C", text: "溶液中一定含有 CO3^2-" },
      { label: "D", text: "加入硝酸后发生中和反应" }
    ],
    answer: "A",
    analysis: "不溶于稀硝酸的白色沉淀可能是 BaSO4，需要结合后续证据排除氯离子干扰。",
    difficulty: "integrated",
    medianTimeSeconds: 78,
    auditStatus: "published",
    primaryKnowledgePointId: "evidence_reasoning",
    prerequisiteKnowledgePointIds: ["experiment"],
    coreLiteracy: ["evidence_model", "inquiry_innovation"],
    abilityTarget: "能综合多步现象形成证据链并排除干扰。",
    sourceMeta: { sourceName: "2026 高三综合复习化学诊断样题", sourceType: "reviewed_exam", reviewStatus: "human_published" }
  },
  {
    id: "q_ai_pending_1",
    grade: "初三",
    examPaperId: "paper_seed_ai_candidates",
    questionNumber: "AI-1",
    examType: "AI 拆题候选",
    questionType: "single_choice",
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
    aiConfidence: 0.86,
    sourceMeta: { sourceName: "AI 拆题候选审核样题包", sourceType: "ai_candidate", reviewStatus: "pending_review" }
  },
  {
    id: "q_ai_pending_2",
    grade: "高一",
    examPaperId: "paper_seed_ai_candidates",
    questionNumber: "AI-2",
    examType: "AI 拆题候选",
    questionType: "experiment",
    stem: "向某溶液中滴加硝酸银溶液产生白色沉淀，AI 初步判断该溶液一定含有氯离子。该判断是否需要人工核对？",
    options: [
      { label: "A", text: "需要，因为还要排除其他离子干扰" },
      { label: "B", text: "不需要，白色沉淀只能是氯化银" },
      { label: "C", text: "不需要，硝酸银不能检验离子" },
      { label: "D", text: "需要，因为白色沉淀一定是碳酸银" }
    ],
    answer: "A",
    analysis: "银离子产生白色沉淀后还需结合酸化等证据排除干扰。",
    difficulty: "medium",
    medianTimeSeconds: 50,
    auditStatus: "pending_review",
    primaryKnowledgePointId: "ion",
    prerequisiteKnowledgePointIds: ["experiment_basics"],
    coreLiteracy: ["evidence_model", "inquiry_innovation"],
    abilityTarget: "能识别离子检验中的证据链风险。",
    aiConfidence: 0.62,
    sourceMeta: { sourceName: "AI 拆题候选审核样题包", sourceType: "ai_candidate", reviewStatus: "pending_review", reviewRisk: "low_confidence" }
  },
  {
    id: "q_ai_pending_3",
    grade: "高二",
    examPaperId: "paper_seed_ai_candidates",
    questionNumber: "AI-3",
    examType: "AI 拆题候选",
    questionType: "calculation",
    stem: "某可逆反应达到平衡后升高温度，AI 初步解析认为平衡一定向正反应方向移动。该解析是否完整？",
    options: [
      { label: "A", text: "完整，升温一定正向移动" },
      { label: "B", text: "不完整，需要知道正反应是吸热还是放热" },
      { label: "C", text: "完整，温度不影响平衡" },
      { label: "D", text: "不完整，因为催化剂会改变平衡常数" }
    ],
    answer: "B",
    analysis: "升温时平衡向吸热方向移动，必须先判断反应热效应。",
    difficulty: "advanced",
    medianTimeSeconds: 65,
    auditStatus: "pending_review",
    primaryKnowledgePointId: "balance",
    prerequisiteKnowledgePointIds: ["thermo"],
    coreLiteracy: ["change_balance"],
    abilityTarget: "能判断平衡移动分析中缺失的条件。",
    aiConfidence: 0.58,
    sourceMeta: { sourceName: "AI 拆题候选审核样题包", sourceType: "ai_candidate", reviewStatus: "pending_review", reviewRisk: "needs_structure_check" }
  },
  {
    id: "q_ai_pending_4",
    grade: "高三",
    examPaperId: "paper_seed_ai_candidates",
    questionNumber: "AI-4",
    examType: "AI 拆题候选",
    questionType: "inference",
    stem: "某流程题中加入氧化剂把 Fe2+ 转化为 Fe3+ 后再调 pH 沉淀。AI 初步挂接为有机合成推断，是否合适？",
    options: [
      { label: "A", text: "合适，所有流程题都属于有机合成" },
      { label: "B", text: "不合适，更接近工艺流程分析和氧化还原" },
      { label: "C", text: "合适，因为出现了 pH" },
      { label: "D", text: "无法人工审核" }
    ],
    answer: "B",
    analysis: "题干涉及无机工艺流程、氧化还原和沉淀分离，应人工修正挂接。",
    difficulty: "integrated",
    medianTimeSeconds: 70,
    auditStatus: "pending_review",
    primaryKnowledgePointId: "industrial_process",
    prerequisiteKnowledgePointIds: ["evidence_reasoning"],
    coreLiteracy: ["evidence_model", "attitude_responsibility"],
    abilityTarget: "能核对 AI 知识点挂接是否符合题干证据。",
    aiConfidence: 0.54,
    sourceMeta: { sourceName: "AI 拆题候选审核样题包", sourceType: "ai_candidate", reviewStatus: "pending_review", reviewRisk: "low_confidence" }
  },
  {
    id: "q_ai_needs_edit_1",
    grade: "高三",
    examPaperId: "paper_seed_ai_candidates",
    questionNumber: "AI-5",
    examType: "AI 拆题候选",
    questionType: "short_answer",
    stem: "AI 拆分出的工艺流程题小问缺少流程图条件，需人工补充题干后再发布。",
    options: [
      { label: "A", text: "保留待修改" },
      { label: "B", text: "直接发布" },
      { label: "C", text: "作为学生练习" },
      { label: "D", text: "删除审核记录" }
    ],
    answer: "A",
    analysis: "该题缺少流程图条件，应停留在需修改状态，不能进入学生端。",
    difficulty: "integrated",
    medianTimeSeconds: 80,
    auditStatus: "needs_edit",
    primaryKnowledgePointId: "industrial_process",
    prerequisiteKnowledgePointIds: ["experiment"],
    coreLiteracy: ["evidence_model"],
    abilityTarget: "能识别题干结构缺失并进入人工修改。",
    aiConfidence: 0.41,
    sourceMeta: { sourceName: "AI 拆题候选审核样题包", sourceType: "ai_candidate", reviewStatus: "needs_edit", reviewRisk: "needs_structure_check" }
  },
  {
    id: "q_ai_needs_edit_2",
    grade: "高二",
    examPaperId: "paper_seed_ai_candidates",
    questionNumber: "AI-6",
    examType: "AI 拆题候选",
    questionType: "inference",
    stem: "AI 解析把乙醇氧化产物写为乙烷，需人工修正答案和解析。",
    options: [
      { label: "A", text: "保留需修改状态" },
      { label: "B", text: "发布到学生端" },
      { label: "C", text: "作为已审核题" },
      { label: "D", text: "跳过人工审核" }
    ],
    answer: "A",
    analysis: "答案和解析存在明显错误，应由审核员修改后再决定是否发布。",
    difficulty: "advanced",
    medianTimeSeconds: 68,
    auditStatus: "needs_edit",
    primaryKnowledgePointId: "organic_basics",
    prerequisiteKnowledgePointIds: ["structure"],
    coreLiteracy: ["macro_micro", "evidence_model"],
    abilityTarget: "能发现 AI 解析中的官能团转化错误。",
    aiConfidence: 0.37,
    sourceMeta: { sourceName: "AI 拆题候选审核样题包", sourceType: "ai_candidate", reviewStatus: "needs_edit", reviewRisk: "low_confidence" }
  }
];

async function main() {
  await seedSchools();
  await seedClassGroups();
  await seedDemoUsersAndAssignments();
  await seedKnowledgeGraph();
  await seedExamPapers();
  await seedQuestions();
  await seedReviewAuditRecords();
  await seedDemoLearningData();

  console.log(
    JSON.stringify(
      {
        ok: true,
        schools: schools.length,
        classes: classGroups.length,
        users: demoUsers.length,
        knowledgePoints: knowledgePoints.length,
        questions: questions.length,
        publishedQuestions: questions.filter((question) => question.auditStatus === "published").length,
        reviewQueueQuestions: questions.filter((question) => question.auditStatus !== "published").length
      },
      null,
      2
    )
  );
}

async function seedSchools() {
  for (const school of schools) {
    await prisma.school.upsert({
      where: { id: school.id },
      update: omitId(school),
      create: school
    });
  }
}

async function seedClassGroups() {
  for (const classGroup of classGroups) {
    const row = {
      ...classGroup,
      grade: gradeMap[classGroup.grade]
    };
    await prisma.classGroup.upsert({
      where: { id: classGroup.id },
      update: omitId(row),
      create: row
    });
  }
}

async function seedDemoUsersAndAssignments() {
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        schoolId: user.schoolId,
        classId: user.classId,
        status: "active",
        passwordHash: hashDemoPassword(demoPassword)
      },
      create: {
        ...user,
        status: "active",
        passwordHash: hashDemoPassword(demoPassword)
      }
    });
  }

  for (const assignment of teacherAssignments) {
    await prisma.teacherClassAssignment.upsert({
      where: {
        teacherId_classId: {
          teacherId: assignment.teacherId,
          classId: assignment.classId
        }
      },
      update: {
        schoolId: assignment.schoolId,
        role: assignment.role,
        status: "active",
        createdBy: assignment.createdBy
      },
      create: {
        ...assignment,
        status: "active"
      }
    });
  }
}

async function seedKnowledgeGraph() {
  for (const grade of Object.keys(gradeMap)) {
    await prisma.knowledgeGraphVersion.upsert({
      where: { id: `${grade}-seed-v1` },
      update: { status: "published", publishedAt: new Date() },
      create: {
        id: `${grade}-seed-v1`,
        grade: gradeMap[grade],
        name: `${grade} 种子知识图谱`,
        status: "published",
        publishedAt: new Date()
      }
    });
  }

  for (const point of knowledgePoints) {
    await prisma.knowledgePoint.upsert({
      where: { id: point.id },
      update: {
        grade: gradeMap[point.grade],
        name: point.name,
        description: point.description,
        x: point.x,
        y: point.y,
        status: "published",
        graphVersionId: `${point.grade}-seed-v1`
      },
      create: {
        id: point.id,
        grade: gradeMap[point.grade],
        name: point.name,
        description: point.description,
        x: point.x,
        y: point.y,
        status: "published",
        graphVersionId: `${point.grade}-seed-v1`
      }
    });
  }

  for (const relation of relations) {
    const fromPoint = knowledgePoints.find((point) => point.id === relation.fromPointId);
    if (!fromPoint) continue;
    await prisma.knowledgeRelation.upsert({
      where: { id: `${relation.fromPointId}-${relation.relationType}-${relation.toPointId}` },
      update: {
        fromPointId: relation.fromPointId,
        toPointId: relation.toPointId,
        relationType: relation.relationType,
        weight: relation.weight,
        graphVersionId: `${fromPoint.grade}-seed-v1`
      },
      create: {
        id: `${relation.fromPointId}-${relation.relationType}-${relation.toPointId}`,
        ...relation,
        graphVersionId: `${fromPoint.grade}-seed-v1`
      }
    });
  }
}

async function seedExamPapers() {
  for (const paper of examPapers) {
    const row = {
      ...paper,
      grade: gradeMap[paper.grade]
    };
    await prisma.examPaper.upsert({
      where: { id: paper.id },
      update: omitId(row),
      create: row
    });
  }
}

async function seedQuestions() {
  for (const question of questions) {
    const reviewSource = question.auditStatus === "published" ? "admin" : "ai";
    const questionData = {
      examPaperId: question.examPaperId,
      questionNumber: question.questionNumber,
      grade: gradeMap[question.grade],
      examType: question.examType,
      questionType: question.questionType,
      stem: question.stem,
      options: question.options,
      answer: question.answer,
      analysis: question.analysis,
      score: question.score ?? defaultScore(question.questionType),
      reviewedDifficulty: question.auditStatus === "published" ? difficultyMap[question.difficulty] : null,
      aiDifficulty: question.auditStatus !== "published" ? difficultyMap[question.difficulty] : null,
      dynamicDifficultyScore: dynamicDifficultyScore(question.difficulty),
      medianTimeSeconds: question.medianTimeSeconds,
      sourceMeta: {
        ...question.sourceMeta,
        grade: question.grade,
        year: examPapers.find((paper) => paper.id === question.examPaperId)?.year,
        region: examPapers.find((paper) => paper.id === question.examPaperId)?.region
      },
      auditStatus: question.auditStatus
    };

    await prisma.question.upsert({
      where: { id: question.id },
      update: questionData,
      create: {
        id: question.id,
        ...questionData
      }
    });

    await prisma.questionKnowledgeLink.deleteMany({ where: { questionId: question.id } });
    await prisma.questionLiteracyLink.deleteMany({ where: { questionId: question.id } });

    const linkRows = [
      {
        id: `${question.id}-primary-${question.primaryKnowledgePointId}`,
        questionId: question.id,
        knowledgePointId: question.primaryKnowledgePointId,
        linkType: "primary",
        source: reviewSource,
        confidence: question.aiConfidence ?? (question.auditStatus === "published" ? 0.98 : 0.72),
        reason:
          question.auditStatus === "published"
            ? "人工审核确认的主知识点。"
            : "AI 初步挂接，等待人工审核确认。"
      },
      ...question.prerequisiteKnowledgePointIds.map((knowledgePointId) => ({
        id: `${question.id}-prerequisite-${knowledgePointId}`,
        questionId: question.id,
        knowledgePointId,
        linkType: "prerequisite",
        source: reviewSource,
        confidence: question.auditStatus === "published" ? 0.94 : Math.max((question.aiConfidence ?? 0.7) - 0.08, 0.3),
        reason:
          question.auditStatus === "published"
            ? "人工审核确认的前置知识。"
            : "AI 初步识别的前置知识，等待审核。"
      }))
    ];
    if (linkRows.length) {
      await prisma.questionKnowledgeLink.createMany({ data: linkRows });
    }

    const literacyRows = question.coreLiteracy.map((tag) => ({
      id: `${question.id}-${tag}`,
      questionId: question.id,
      literacyTag: tag,
      abilityTarget: question.abilityTarget,
      evaluationFocus: literacyEvaluationFocus(tag),
      confidence: question.auditStatus === "published" ? 0.96 : question.aiConfidence ?? 0.7,
      source: reviewSource
    }));
    if (literacyRows.length) {
      await prisma.questionLiteracyLink.createMany({ data: literacyRows });
    }
  }
}

async function seedReviewAuditRecords() {
  const now = new Date();
  const reviewQuestions = questions.filter((question) => question.auditStatus !== "published");
  for (const [index, question] of reviewQuestions.entries()) {
    const createdAt = new Date(now.getTime() - (reviewQuestions.length - index) * 12 * 60_000);
    await prisma.auditRecord.upsert({
      where: { id: `audit_seed_${question.id}` },
      update: {
        targetType: "question",
        targetId: question.id,
        reviewerId: "demo_admin",
        action: question.auditStatus === "needs_edit" ? "seed_request_edit" : "seed_ai_candidate_created",
        afterSnapshot: {
          id: question.id,
          auditStatus: question.auditStatus,
          primaryKnowledgePointId: question.primaryKnowledgePointId,
          questionType: question.questionType,
          sourceMeta: question.sourceMeta
        },
        diffSummary: [
          question.auditStatus === "needs_edit" ? "AI 候选题已标记为需修改。" : "AI 候选题进入人工审核队列。",
          "学生端不会读取该题，需人工审核后才能发布。"
        ],
        comment: "演示种子数据：用于审核端和管理端核对 AI 候选题。",
        createdAt
      },
      create: {
        id: `audit_seed_${question.id}`,
        targetType: "question",
        targetId: question.id,
        reviewerId: "demo_admin",
        action: question.auditStatus === "needs_edit" ? "seed_request_edit" : "seed_ai_candidate_created",
        afterSnapshot: {
          id: question.id,
          auditStatus: question.auditStatus,
          primaryKnowledgePointId: question.primaryKnowledgePointId,
          questionType: question.questionType,
          sourceMeta: question.sourceMeta
        },
        diffSummary: [
          question.auditStatus === "needs_edit" ? "AI 候选题已标记为需修改。" : "AI 候选题进入人工审核队列。",
          "学生端不会读取该题，需人工审核后才能发布。"
        ],
        comment: "演示种子数据：用于审核端和管理端核对 AI 候选题。",
        createdAt
      }
    });
  }
}

async function seedDemoLearningData() {
  const now = new Date();
  const answerRecords = [
    answer("demo_answer_student01_acid_wrong", "demo_student_01", "q_acid_base_1", "acid_base", "A", false, 42, "hard", "normal", "thoughtful", true, minutesAgo(now, 170)),
    answer("demo_answer_student01_indicator_correct", "demo_student_01", "q_indicator_1", "indicator", "A", true, 24, "medium", "normal", "fluent", false, minutesAgo(now, 158)),
    answer("demo_answer_student01_indicator_retest", "demo_student_01", "q_indicator_2", "indicator", "B", true, 28, "medium", "normal", "thoughtful", false, minutesAgo(now, 132)),
    answer("demo_answer_student01_equation_wrong", "demo_student_01", "q_equation_1", "equation", "B", false, 96, "hard", "slow", "review_needed", true, minutesAgo(now, 58)),
    answer("demo_answer_student01_gas_correct", "demo_student_01", "q_gas_preparation_1", "gas_preparation", "A", true, 46, "medium", "normal", "thoughtful", false, minutesAgo(now, 36)),
    answer("demo_answer_student02_indicator_wrong", "demo_student_02", "q_indicator_1", "indicator", "B", false, 6, "hard", "too_fast", "possible_guessing", true, minutesAgo(now, 150)),
    answer("demo_answer_student02_acid_correct", "demo_student_02", "q_acid_base_1", "acid_base", "B", true, 25, "medium", "normal", "fluent", false, minutesAgo(now, 142)),
    answer("demo_answer_student02_metal_wrong", "demo_student_02", "q_metal_activity_1", "metal_activity", "B", false, 52, "hard", "normal", "review_needed", true, minutesAgo(now, 72)),
    answer("demo_answer_student02_metal_retest", "demo_student_02", "q_metal_activity_1", "metal_activity", "A", true, 48, "medium", "normal", "thoughtful", false, minutesAgo(now, 49)),
    answer("demo_answer_student02_solution_correct", "demo_student_02", "q_solution_1", "solution", "A", true, 23, "easy", "normal", "fluent", false, minutesAgo(now, 44)),
    answer("demo_answer_student03_amount_correct", "demo_student_03", "q_amount_1", "amount", "A", true, 27, "easy", "normal", "fluent", false, minutesAgo(now, 260)),
    answer("demo_answer_student03_ion_wrong", "demo_student_03", "q_ion_1", "ion", "B", false, 48, "hard", "normal", "review_needed", true, minutesAgo(now, 230)),
    answer("demo_answer_student03_redox_wrong", "demo_student_03", "q_redox_1", "redox", "A", false, 38, "hard", "normal", "review_needed", true, minutesAgo(now, 210)),
    answer("demo_answer_student03_sodium_correct", "demo_student_03", "q_sodium_chlorine_1", "sodium_chlorine", "B", true, 60, "hard", "normal", "thoughtful", false, minutesAgo(now, 120)),
    answer("demo_answer_student04_amount_wrong", "demo_student_04", "q_amount_1", "amount", "C", false, 18, "medium", "fast", "review_needed", true, minutesAgo(now, 250)),
    answer("demo_answer_student04_experiment_correct", "demo_student_04", "q_experiment_basics_1", "experiment_basics", "B", true, 50, "medium", "normal", "thoughtful", false, minutesAgo(now, 215)),
    answer("demo_answer_student04_redox_correct", "demo_student_04", "q_redox_1", "redox", "B", true, 29, "medium", "normal", "fluent", false, minutesAgo(now, 90)),
    answer("demo_answer_student05_structure_correct", "demo_student_05", "q_structure_1", "structure", "B", true, 34, "easy", "normal", "fluent", false, minutesAgo(now, 330)),
    answer("demo_answer_student05_balance_wrong", "demo_student_05", "q_balance_1", "balance", "B", false, 62, "hard", "normal", "review_needed", true, minutesAgo(now, 300)),
    answer("demo_answer_student05_electrolyte_wrong", "demo_student_05", "q_electrolyte_1", "electrolyte", "A", false, 74, "hard", "normal", "thoughtful", true, minutesAgo(now, 235)),
    answer("demo_answer_student05_balance_retest", "demo_student_05", "q_balance_1", "balance", "A", true, 56, "medium", "normal", "thoughtful", false, minutesAgo(now, 238)),
    answer("demo_answer_student05_organic_correct", "demo_student_05", "q_organic_basics_1", "organic_basics", "A", true, 48, "medium", "normal", "fluent", false, minutesAgo(now, 180)),
    answer("demo_answer_student06_rate_correct", "demo_student_06", "q_rate_1", "rate", "A", true, 27, "easy", "normal", "fluent", false, minutesAgo(now, 320)),
    answer("demo_answer_student06_balance_correct", "demo_student_06", "q_balance_1", "balance", "A", true, 54, "medium", "normal", "thoughtful", false, minutesAgo(now, 250)),
    answer("demo_answer_student06_thermo_wrong", "demo_student_06", "q_thermo_1", "thermo", "B", false, 40, "hard", "normal", "review_needed", true, minutesAgo(now, 190)),
    answer("demo_answer_student06_organic_wrong", "demo_student_06", "q_organic_basics_1", "organic_basics", "C", false, 55, "hard", "normal", "review_needed", true, minutesAgo(now, 136)),
    answer("demo_answer_student07_integrated_wrong", "demo_student_07", "q_integrated_1", "integrated", "B", false, 58, "hard", "normal", "review_needed", true, minutesAgo(now, 420)),
    answer("demo_answer_student07_experiment_correct", "demo_student_07", "q_experiment_design_1", "experiment", "A", true, 46, "medium", "normal", "thoughtful", false, minutesAgo(now, 390)),
    answer("demo_answer_student07_industrial_wrong", "demo_student_07", "q_industrial_process_1", "industrial_process", "B", false, 82, "hard", "slow", "thoughtful", true, minutesAgo(now, 310)),
    answer("demo_answer_student07_equilibrium_correct", "demo_student_07", "q_equilibrium_calc_1", "equilibrium_calculation", "A", true, 56, "medium", "normal", "thoughtful", false, minutesAgo(now, 190)),
    answer("demo_answer_student08_integrated_correct", "demo_student_08", "q_integrated_1", "integrated", "A", true, 44, "medium", "normal", "fluent", false, minutesAgo(now, 405)),
    answer("demo_answer_student08_organic_wrong", "demo_student_08", "q_organic_synthesis_1", "organic_synthesis", "B", false, 70, "hard", "normal", "review_needed", true, minutesAgo(now, 295)),
    answer("demo_answer_student08_evidence_correct", "demo_student_08", "q_evidence_reasoning_1", "evidence_reasoning", "A", true, 82, "hard", "normal", "thoughtful", false, minutesAgo(now, 160)),
    answer("demo_answer_student09_process_wrong", "demo_student_09", "q_industrial_process_1", "industrial_process", "C", false, 75, "hard", "normal", "review_needed", true, minutesAgo(now, 355)),
    answer("demo_answer_student09_experiment_correct", "demo_student_09", "q_experiment_design_1", "experiment", "A", true, 48, "medium", "normal", "thoughtful", false, minutesAgo(now, 260))
  ];

  for (const record of answerRecords) {
    await prisma.answerRecord.upsert({
      where: { id: record.id },
      update: omitId(record),
      create: record
    });
  }

  const remediationPaths = [
    reviewPath("demo_review_task_student01_completed", "demo_student_01", "q_acid_base_1", "acid_base", "indicator", "错题复盘任务：先补酸碱指示剂，再用同类题确认迁移。", "completed_review:demo_teacher", minutesAgo(now, 166), {
      studentReviewNote: "我把石蕊和酚酞的变色条件重新整理了一遍，下次先看溶液酸碱性证据。",
      completedAt: minutesAgo(now, 134),
      retestQuestionId: "q_indicator_2",
      retestAnswerRecordId: "demo_answer_student01_indicator_retest",
      retestIsCorrect: true,
      retestCompletedAt: minutesAgo(now, 132),
      reviewReminderCount: 1,
      lastReviewReminderAt: minutesAgo(now, 150),
      teacherFeedbackNote: "复测迁移成功，讲评时可以请学生先说证据再说结论。",
      teacherFeedbackAt: minutesAgo(now, 92),
      teacherFeedbackBy: "demo_teacher"
    }),
    reviewPath("demo_review_task_student01_equation_assigned", "demo_student_01", "q_equation_1", "equation", "acid_base", "老师布置错题复盘任务：方程式计算先回到守恒关系，再列物质的量。", "assigned_review:demo_teacher", minutesAgo(now, 54), {
      reviewReminderCount: 1,
      lastReviewReminderAt: minutesAgo(now, 32)
    }),
    reviewPath("demo_review_task_student02_assigned", "demo_student_02", "q_indicator_1", "indicator", "solution", "错题复盘任务：回到水与溶液基础，先分清酸性、碱性和中性。", "assigned_review:demo_teacher", minutesAgo(now, 145), {
      reviewReminderCount: 1,
      lastReviewReminderAt: minutesAgo(now, 110)
    }),
    reviewPath("demo_review_task_student02_metal_completed", "demo_student_02", "q_metal_activity_1", "metal_activity", "change", "老师布置前置知识巩固任务：先用新物质生成判断反应证据，再回到金属活动性。", "completed_review:demo_teacher", minutesAgo(now, 68), {
      studentReviewNote: "我会先看有没有生成铜，再判断铁和铜谁更活泼。",
      completedAt: minutesAgo(now, 50),
      retestQuestionId: "q_metal_activity_1",
      retestAnswerRecordId: "demo_answer_student02_metal_retest",
      retestIsCorrect: true,
      retestCompletedAt: minutesAgo(now, 49),
      teacherFeedbackNote: "复测已能抓住置换反应证据，后续可挑战气体制取关联题。",
      teacherFeedbackAt: minutesAgo(now, 30),
      teacherFeedbackBy: "demo_teacher"
    }),
    reviewPath("demo_review_task_student03_ion_completed", "demo_student_03", "q_ion_1", "ion", "amount", "老师布置错题复盘任务：离子方程式先找实际参加反应的微粒。", "completed_review:demo_teacher", minutesAgo(now, 226), {
      studentReviewNote: "我把旁观离子划掉后，能看出 H+ 和 OH- 才是关键。",
      completedAt: minutesAgo(now, 200),
      retestQuestionId: "q_ion_1",
      retestAnswerRecordId: "demo_answer_student03_sodium_correct",
      retestIsCorrect: true,
      retestCompletedAt: minutesAgo(now, 120),
      teacherFeedbackNote: "可以进入含氯元素化合物的变式讲评。",
      teacherFeedbackAt: minutesAgo(now, 82),
      teacherFeedbackBy: "demo_teacher"
    }),
    reviewPath("demo_review_task_student03_variant_assigned", "demo_student_03", "q_redox_1", "redox", "sodium_chlorine", "老师布置变式题挑战任务：把电子转移方法迁移到氯气氧化性判断。", "assigned_review:demo_teacher", minutesAgo(now, 76)),
    reviewPath("demo_review_task_student04_amount_assigned", "demo_student_04", "q_amount_1", "amount", "substance_classification", "老师布置错题复盘任务：先分清微粒对象，再用物质的量连接数目。", "assigned_review:demo_teacher", minutesAgo(now, 246)),
    reviewPath("demo_review_task_student05_balance_completed", "demo_student_05", "q_balance_1", "balance", "rate", "老师布置错题复盘任务：先判断压强变化，再看气体分子数。", "completed_review:demo_teacher", minutesAgo(now, 296), {
      studentReviewNote: "我会先数方程式两边气体分子数，再判断移动方向。",
      completedAt: minutesAgo(now, 240),
      retestQuestionId: "q_balance_1",
      retestAnswerRecordId: "demo_answer_student05_balance_retest",
      retestIsCorrect: true,
      retestCompletedAt: minutesAgo(now, 238),
      teacherFeedbackNote: "这类题适合让学生板书气体分子数变化。",
      teacherFeedbackAt: minutesAgo(now, 190),
      teacherFeedbackBy: "demo_teacher_senior"
    }),
    reviewPath("demo_review_task_student05_electrolyte_assigned", "demo_student_05", "q_electrolyte_1", "electrolyte", "balance", "老师布置前置知识巩固任务：先回到平衡移动，再看同离子效应。", "assigned_review:demo_teacher_senior", minutesAgo(now, 228), {
      reviewReminderCount: 2,
      lastReviewReminderAt: minutesAgo(now, 48)
    }),
    reviewPath("demo_review_task_student06_organic_assigned", "demo_student_06", "q_organic_basics_1", "organic_basics", "structure", "老师布置错题复盘任务：从官能团入手解释乙醇的性质。", "assigned_review:demo_teacher_senior", minutesAgo(now, 126)),
    reviewPath("demo_review_task_student07_industrial_completed", "demo_student_07", "q_industrial_process_1", "industrial_process", "experiment", "老师布置错题复盘任务：流程题先标出每一步的除杂目的。", "completed_review:demo_teacher", minutesAgo(now, 306), {
      studentReviewNote: "我会把氧化、调 pH、过滤分别写成目的和证据。",
      completedAt: minutesAgo(now, 250),
      retestQuestionId: "q_equilibrium_calc_1",
      retestAnswerRecordId: "demo_answer_student07_equilibrium_correct",
      retestIsCorrect: true,
      retestCompletedAt: minutesAgo(now, 190),
      teacherFeedbackNote: "可作为高三流程题讲评的代表样本。",
      teacherFeedbackAt: minutesAgo(now, 150),
      teacherFeedbackBy: "demo_teacher"
    }),
    reviewPath("demo_review_task_student07_variant_completed", "demo_student_07", "q_industrial_process_1", "industrial_process", "equilibrium_calculation", "老师布置变式题挑战任务：把流程分析迁移到平衡常数判断。", "completed_review:demo_teacher", minutesAgo(now, 148), {
      studentReviewNote: "我能区分条件变化和平衡常数是否改变。",
      completedAt: minutesAgo(now, 118),
      retestQuestionId: "q_equilibrium_calc_1",
      retestAnswerRecordId: "demo_answer_student07_equilibrium_correct",
      retestIsCorrect: true,
      retestCompletedAt: minutesAgo(now, 118),
      teacherFeedbackNote: "变式挑战已完成，适合展示迁移路径。",
      teacherFeedbackAt: minutesAgo(now, 96),
      teacherFeedbackBy: "demo_teacher"
    }),
    reviewPath("demo_review_task_student08_organic_assigned", "demo_student_08", "q_organic_synthesis_1", "organic_synthesis", "evidence_reasoning", "老师布置错题复盘任务：先用特征反应确定官能团，再推断路线。", "assigned_review:demo_teacher", minutesAgo(now, 286)),
    reviewPath("demo_review_task_student09_process_assigned", "demo_student_09", "q_industrial_process_1", "industrial_process", "experiment", "老师布置错题复盘任务：联合教研样本先整理流程证据链。", "assigned_review:demo_teacher_joint", minutesAgo(now, 348), {
      reviewReminderCount: 1,
      lastReviewReminderAt: minutesAgo(now, 300)
    })
  ];

  for (const path of remediationPaths) {
    await prisma.remediationPath.upsert({
      where: { id: path.id },
      update: omitId(path),
      create: path
    });
  }

  const rewardEvents = [
    reward("demo_reward_student01_correct", "demo_student_01", "question_correct", 5, 1, "答对真题，证据提取更稳。", minutesAgo(now, 158)),
    reward("demo_reward_student01_review", "demo_student_01", "review_completed", 18, 4, "完成错题复盘，补清前置知识。", minutesAgo(now, 134)),
    reward("demo_reward_student01_breakthrough", "demo_student_01", "breakthrough", 26, 6, "从难到会：复盘后同类题复测成功。", minutesAgo(now, 132)),
    reward("demo_reward_student01_streak", "demo_student_01", "streak", 10, 1, "连续完成诊断和复盘，学习节奏稳定。", minutesAgo(now, 34)),
    reward("demo_reward_student02_correct", "demo_student_02", "question_correct", 5, 1, "答对基础题，继续保持节奏。", minutesAgo(now, 142)),
    reward("demo_reward_student02_remediation", "demo_student_02", "remediation_completed", 20, 3, "完成前置知识巩固，把关键条件补得更稳", minutesAgo(now, 50)),
    reward("demo_reward_student03_review", "demo_student_03", "review_completed", 18, 4, "完成离子方程式复盘，把反应本质说清楚。", minutesAgo(now, 200)),
    reward("demo_reward_student03_breakthrough", "demo_student_03", "breakthrough", 30, 5, "完成变式题挑战，把方法迁移到新情境", minutesAgo(now, 120)),
    reward("demo_reward_student03_literacy", "demo_student_03", "literacy_progress", 25, 4, "完成核心素养目标：宏观辨识与微观探析", minutesAgo(now, 90)),
    reward("demo_reward_student04_correct", "demo_student_04", "question_correct", 4, 1, "实验操作题作答稳定。", minutesAgo(now, 215)),
    reward("demo_reward_student05_review", "demo_student_05", "review_completed", 18, 4, "完成平衡移动复盘，能先数气体分子数。", minutesAgo(now, 240)),
    reward("demo_reward_student05_breakthrough", "demo_student_05", "breakthrough", 30, 5, "完成变式题挑战，把方法迁移到新情境", minutesAgo(now, 238)),
    reward("demo_reward_student06_correct", "demo_student_06", "question_correct", 5, 1, "反应速率条件判断更稳。", minutesAgo(now, 320)),
    reward("demo_reward_student07_review", "demo_student_07", "review_completed", 18, 4, "完成流程题复盘，能分步骤写出目的。", minutesAgo(now, 250)),
    reward("demo_reward_student07_breakthrough", "demo_student_07", "breakthrough", 30, 5, "完成变式题挑战，把方法迁移到新情境", minutesAgo(now, 118)),
    reward("demo_reward_student07_literacy", "demo_student_07", "literacy_progress", 25, 4, "完成核心素养目标：科学态度与社会责任", minutesAgo(now, 110)),
    reward("demo_reward_student08_correct", "demo_student_08", "question_correct", 5, 1, "综合判断中能抓住题干证据。", minutesAgo(now, 160)),
    reward("demo_reward_student09_streak", "demo_student_09", "streak", 10, 1, "联合教研样本班保持跟进节奏。", minutesAgo(now, 260))
  ];

  for (const event of rewardEvents) {
    await prisma.rewardEvent.upsert({
      where: { id: event.id },
      update: omitId(event),
      create: event
    });
  }

  const currentWeek = getCurrentWeekKey();
  const previousWeek = getWeekKey(-1);
  const learningGoals = [
    learningGoal("demo_student_01", "evidence_model", "active", currentWeek, minutesAgo(now, 190), daysFrom(now, 5)),
    learningGoal("demo_student_02", "change_balance", "active", currentWeek, minutesAgo(now, 160), daysFrom(now, 5)),
    learningGoal("demo_student_03", "macro_micro", "completed", previousWeek, daysFrom(now, -8), daysFrom(now, -2), {
      completedAt: minutesAgo(now, 90),
      rewardEventId: "demo_reward_student03_literacy",
      completionSnapshot: {
        evidenceQuestionIds: ["q_amount_1", "q_ion_1"],
        answerCount: 3,
        correctCount: 2,
        stableAnswerCount: 3,
        distinctQuestionCount: 2
      }
    }),
    learningGoal("demo_student_05", "change_balance", "active", currentWeek, minutesAgo(now, 260), daysFrom(now, 5)),
    learningGoal("demo_student_07", "inquiry_innovation", "paused", previousWeek, daysFrom(now, -9), daysFrom(now, -3)),
    learningGoal("demo_student_07", "attitude_responsibility", "completed", currentWeek, minutesAgo(now, 410), daysFrom(now, 5), {
      completedAt: minutesAgo(now, 110),
      rewardEventId: "demo_reward_student07_literacy",
      completionSnapshot: {
        evidenceQuestionIds: ["q_integrated_1", "q_industrial_process_1"],
        answerCount: 2,
        correctCount: 1,
        stableAnswerCount: 2,
        distinctQuestionCount: 2
      }
    }),
    learningGoal("demo_student_08", "evidence_model", "active", currentWeek, minutesAgo(now, 300), daysFrom(now, 5)),
    learningGoal("demo_student_09", "inquiry_innovation", "active", currentWeek, minutesAgo(now, 360), daysFrom(now, 5))
  ];

  for (const goal of learningGoals) {
    await prisma.studentLearningGoal.upsert({
      where: {
        studentId_goalType_targetKey_periodType_periodKey: {
          studentId: goal.studentId,
          goalType: goal.goalType,
          targetKey: goal.targetKey,
          periodType: goal.periodType,
          periodKey: goal.periodKey
        }
      },
      update: goal,
      create: goal
    });
  }
}

const demoUsers = [
  { id: "demo_student_01", username: "demo_student_01", displayName: "演示学生小林", role: "student", schoolId: "school_seed_demo", classId: "class_seed_junior_three" },
  { id: "demo_student_02", username: "demo_student_02", displayName: "演示学生小周", role: "student", schoolId: "school_seed_demo", classId: "class_seed_junior_three" },
  { id: "demo_student_03", username: "demo_student_03", displayName: "高一学生小岑", role: "student", schoolId: "school_seed_demo", classId: "class_seed_senior_one" },
  { id: "demo_student_04", username: "demo_student_04", displayName: "高一学生小程", role: "student", schoolId: "school_seed_demo", classId: "class_seed_senior_one" },
  { id: "demo_student_05", username: "demo_student_05", displayName: "高二学生小韩", role: "student", schoolId: "school_seed_demo", classId: "class_seed_senior_two" },
  { id: "demo_student_06", username: "demo_student_06", displayName: "高二学生小许", role: "student", schoolId: "school_seed_demo", classId: "class_seed_senior_two" },
  { id: "demo_student_07", username: "demo_student_07", displayName: "高三学生小温", role: "student", schoolId: "school_seed_demo", classId: "class_seed_senior_three" },
  { id: "demo_student_08", username: "demo_student_08", displayName: "高三学生小沈", role: "student", schoolId: "school_seed_demo", classId: "class_seed_senior_three" },
  { id: "demo_student_09", username: "demo_student_09", displayName: "联合样本学生小黎", role: "student", schoolId: "school_seed_joint", classId: "class_seed_joint_senior_three" },
  { id: "demo_teacher", username: "demo_teacher", displayName: "演示老师", role: "teacher", schoolId: "school_seed_demo", classId: null },
  { id: "demo_teacher_senior", username: "demo_teacher_senior", displayName: "高二高三备课组老师", role: "teacher", schoolId: "school_seed_demo", classId: null },
  { id: "demo_reviewer", username: "demo_reviewer", displayName: "演示审核老师", role: "teacher", schoolId: "school_seed_demo", classId: null },
  { id: "demo_teacher_joint", username: "demo_teacher_joint", displayName: "联合教研老师", role: "teacher", schoolId: "school_seed_joint", classId: null },
  { id: "demo_admin", username: "demo_admin", displayName: "演示管理员", role: "admin", schoolId: "school_seed_demo", classId: null }
];

const teacherAssignments = [
  { id: "demo_teacher_assignment_junior_three", teacherId: "demo_teacher", schoolId: "school_seed_demo", classId: "class_seed_junior_three", role: "head_teacher", createdBy: "demo_admin" },
  { id: "demo_teacher_assignment_senior_one", teacherId: "demo_teacher", schoolId: "school_seed_demo", classId: "class_seed_senior_one", role: "teacher", createdBy: "demo_admin" },
  { id: "demo_teacher_assignment_senior_two", teacherId: "demo_teacher", schoolId: "school_seed_demo", classId: "class_seed_senior_two", role: "teacher", createdBy: "demo_admin" },
  { id: "demo_teacher_assignment_senior_three", teacherId: "demo_teacher", schoolId: "school_seed_demo", classId: "class_seed_senior_three", role: "teacher", createdBy: "demo_admin" },
  { id: "demo_teacher_senior_assignment_senior_two", teacherId: "demo_teacher_senior", schoolId: "school_seed_demo", classId: "class_seed_senior_two", role: "head_teacher", createdBy: "demo_admin" },
  { id: "demo_teacher_senior_assignment_senior_three", teacherId: "demo_teacher_senior", schoolId: "school_seed_demo", classId: "class_seed_senior_three", role: "teacher", createdBy: "demo_admin" },
  { id: "demo_reviewer_assignment_junior_three", teacherId: "demo_reviewer", schoolId: "school_seed_demo", classId: "class_seed_junior_three", role: "teacher", createdBy: "demo_admin" },
  { id: "demo_teacher_joint_assignment_senior_three", teacherId: "demo_teacher_joint", schoolId: "school_seed_joint", classId: "class_seed_joint_senior_three", role: "head_teacher", createdBy: "demo_admin" }
];

function answer(
  id,
  studentId,
  questionId,
  knowledgePointId,
  selectedAnswer,
  isCorrect,
  durationSeconds,
  difficultyFeedback,
  timeAssessment,
  behaviorSignal,
  triggeredRemediation,
  submittedAt
) {
  return {
    id,
    studentId,
    questionId,
    knowledgePointId,
    startedAt: new Date(submittedAt.getTime() - durationSeconds * 1000),
    submittedAt,
    durationSeconds,
    selectedAnswer,
    isCorrect,
    difficultyFeedback,
    timeAssessment,
    behaviorSignal,
    triggeredRemediation,
    createdAt: submittedAt
  };
}

function reviewPath(id, studentId, sourceQuestionId, sourceKnowledgePointId, targetKnowledgePointId, reason, status, createdAt, extra = {}) {
  return {
    id,
    studentId,
    sourceQuestionId,
    sourceKnowledgePointId,
    targetKnowledgePointId,
    reason,
    status,
    createdAt,
    ...extra
  };
}

function reward(id, studentId, eventType, xp, gems, reason, createdAt) {
  return {
    id,
    studentId,
    eventType,
    xp,
    gems,
    reason,
    createdAt
  };
}

function learningGoal(studentId, targetKey, status, periodKey, startedAt, dueAt, extra = {}) {
  return {
    studentId,
    goalType: "core_literacy",
    targetKey,
    periodType: "weekly",
    periodKey,
    status,
    startedAt,
    dueAt,
    ...extra
  };
}

function defaultScore(questionType) {
  if (questionType === "calculation" || questionType === "experiment" || questionType === "inference") return 6;
  if (questionType === "short_answer") return 5;
  return 3;
}

function dynamicDifficultyScore(difficulty) {
  const map = {
    basic: 0.25,
    medium: 0.5,
    advanced: 0.75,
    integrated: 0.88
  };
  return map[difficulty] ?? 0.5;
}

function literacyEvaluationFocus(tag) {
  const map = {
    macro_micro: "能把宏观现象和微观粒子变化对应起来。",
    change_balance: "能围绕变化、守恒和平衡解释反应。",
    evidence_model: "能基于题干证据建立解释模型。",
    inquiry_innovation: "能按目的、变量、现象和结论设计或评价实验。",
    attitude_responsibility: "能在安全、环保和资源利用情境中作出合理判断。"
  };
  return map[tag] ?? "能运用化学核心素养解决问题。";
}

function omitId(record) {
  const { id: _id, ...rest } = record;
  return rest;
}

function minutesAgo(base, minutes) {
  return new Date(base.getTime() - minutes * 60_000);
}

function daysFrom(base, days) {
  return new Date(base.getTime() + days * 24 * 60 * 60_000);
}

function hashDemoPassword(password) {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function getCurrentWeekKey() {
  return getWeekKey(0);
}

function getWeekKey(offsetWeeks = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetWeeks * 7);
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
