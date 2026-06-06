const STORAGE_KEY = "chemgraph_users_v1";
const MAX_HEARTS = 5;
const XP_PER_LEVEL = 100;
const BADGES = [
  { id: "first_correct", name: "首题命中", condition: (profile) => profile.rewards.correctAnswers >= 1 },
  { id: "first_mastery", name: "点亮节点", condition: (profile) => profile.rewards.masteredTopics >= 1 },
  { id: "streak_3", name: "三日连学", condition: (profile) => profile.rewards.streak >= 3 },
  { id: "gem_50", name: "宝石收藏家", condition: (profile) => profile.rewards.gems >= 50 }
];

const graphs = {
  初三: [
    { id: "change", name: "物质的变化", parent: null, x: 50, y: 10 },
    { id: "air", name: "空气与氧气", parent: "change", x: 28, y: 28 },
    { id: "water", name: "水与溶液", parent: "change", x: 72, y: 28 },
    { id: "carbon", name: "碳和碳的氧化物", parent: "air", x: 22, y: 50 },
    { id: "metal", name: "金属活动性", parent: "water", x: 58, y: 52 },
    { id: "acid", name: "酸碱盐基础", parent: "water", x: 82, y: 52 },
    { id: "calc", name: "化学式与方程式计算", parent: "acid", x: 52, y: 78 }
  ],
  高一: [
    { id: "amount", name: "物质的量", parent: null, x: 50, y: 10 },
    { id: "ion", name: "离子反应", parent: "amount", x: 28, y: 32 },
    { id: "redox", name: "氧化还原反应", parent: "amount", x: 72, y: 32 },
    { id: "metalNa", name: "钠及其化合物", parent: "ion", x: 22, y: 56 },
    { id: "metalAl", name: "铝及其化合物", parent: "ion", x: 50, y: 58 },
    { id: "nonmetal", name: "氯硫氮及其化合物", parent: "redox", x: 78, y: 58 },
    { id: "lab", name: "实验与定量分析", parent: "redox", x: 50, y: 82 }
  ],
  高二: [
    { id: "structure", name: "原子结构与周期律", parent: null, x: 50, y: 10 },
    { id: "bond", name: "化学键与晶体", parent: "structure", x: 28, y: 32 },
    { id: "rate", name: "化学反应速率", parent: "structure", x: 72, y: 32 },
    { id: "balance", name: "化学平衡", parent: "rate", x: 70, y: 54 },
    { id: "electrolyte", name: "水溶液中的离子平衡", parent: "balance", x: 42, y: 68 },
    { id: "electrochem", name: "原电池与电解池", parent: "balance", x: 82, y: 74 },
    { id: "organicBase", name: "有机化学基础", parent: "bond", x: 20, y: 66 }
  ],
  高三: [
    { id: "integrated", name: "综合化学思维", parent: null, x: 50, y: 10 },
    { id: "inference", name: "物质推断", parent: "integrated", x: 24, y: 32 },
    { id: "process", name: "工艺流程", parent: "integrated", x: 52, y: 36 },
    { id: "experiment", name: "实验探究", parent: "integrated", x: 80, y: 32 },
    { id: "equilibriumUse", name: "平衡图像应用", parent: "process", x: 36, y: 62 },
    { id: "organicSynthesis", name: "有机合成路线", parent: "inference", x: 66, y: 66 },
    { id: "finalCalc", name: "综合计算", parent: "experiment", x: 50, y: 84 }
  ]
};

const questionBank = {
  change: [
    q("下列变化属于化学变化的是？", ["冰融化", "酒精挥发", "铁生锈", "蔗糖溶解"], 2, "生成了新物质氧化铁，属于化学变化。"),
    q("判断化学变化的核心依据是？", ["颜色改变", "有气泡", "生成新物质", "温度变化"], 2, "现象只能提示，是否生成新物质才是核心。")
  ],
  air: [
    q("空气中体积分数约为 21% 的气体是？", ["氮气", "氧气", "二氧化碳", "稀有气体"], 1, "氧气约占空气体积的 21%。"),
    q("实验室用高锰酸钾制氧气时，试管口应略向下倾斜，主要为了防止？", ["氧气逸出", "水倒流炸裂试管", "药品飞出", "反应太慢"], 1, "冷凝水回流到热试管可能造成炸裂。")
  ],
  water: [
    q("溶液的基本特征是？", ["无色透明", "均一稳定", "密度较大", "一定导电"], 1, "溶液不一定无色，但一定是均一、稳定的混合物。"),
    q("电解水实验说明水由什么组成？", ["氢气和氧气", "氢元素和氧元素", "氢分子和氧分子", "两个氢一个氧"], 1, "水是由氢元素和氧元素组成。")
  ],
  carbon: [
    q("一氧化碳具有毒性，是因为它容易与血红蛋白结合，导致人体缺少？", ["氮气", "水", "氧气", "二氧化碳"], 2, "血红蛋白不能正常运输氧气。"),
    q("检验二氧化碳通常使用？", ["带火星木条", "澄清石灰水", "酚酞溶液", "紫色石蕊"], 1, "二氧化碳能使澄清石灰水变浑浊。")
  ],
  metal: [
    q("金属活动性顺序中，排在氢前面的金属通常能与稀酸反应生成？", ["氧气", "氢气", "氮气", "氯气"], 1, "活泼金属与稀酸反应生成盐和氢气。"),
    q("铁钉放入硫酸铜溶液中，表面出现红色物质，说明铁比铜？", ["稳定", "活泼", "轻", "硬"], 1, "铁能置换出铜，说明铁比铜活泼。")
  ],
  acid: [
    q("能使紫色石蕊试液变红的是？", ["酸性溶液", "碱性溶液", "中性溶液", "食盐水"], 0, "酸性溶液能使紫色石蕊变红。"),
    q("酸和碱反应生成盐和水的反应叫？", ["置换反应", "分解反应", "中和反应", "化合反应"], 2, "酸与碱生成盐和水是中和反应。")
  ],
  calc: [
    q("配平化学方程式的依据是？", ["质量守恒定律", "溶解度", "密度大小", "颜色变化"], 0, "反应前后原子种类和数目守恒。"),
    q("计算相对分子质量时，应把化学式中各原子的相对原子质量如何处理？", ["相乘", "相加", "只取最大值", "只取最小值"], 1, "按原子个数加和。")
  ],
  amount: [
    q("1 mol 任何微粒所含微粒数约为？", ["6.02×10^23", "3.01×10^23", "22.4", "1.00×10^3"], 0, "阿伏伽德罗常数约为 6.02×10^23。"),
    q("气体摩尔体积 22.4 L/mol 通常适用于？", ["任意温度压强", "标准状况", "高温高压", "液态物质"], 1, "标准状况下理想气体近似为 22.4 L/mol。")
  ],
  ion: [
    q("离子方程式要删去的是？", ["沉淀", "气体", "弱电解质", "不参加反应的离子"], 3, "旁观离子应删去。"),
    q("BaCl2 溶液与 Na2SO4 溶液反应的本质离子是？", ["Ba2+ 与 SO4 2-", "Na+ 与 Cl-", "Ba2+ 与 Cl-", "Na+ 与 SO4 2-"], 0, "生成 BaSO4 沉淀。")
  ],
  redox: [
    q("氧化还原反应的本质是？", ["有氧参加", "电子转移", "产生沉淀", "吸放热"], 1, "本质是电子得失或偏移。"),
    q("元素化合价升高，说明该元素被？", ["还原", "氧化", "中和", "沉淀"], 1, "化合价升高对应失电子，被氧化。")
  ],
  metalNa: [
    q("钠与水反应生成氢氧化钠和？", ["氧气", "氢气", "氯气", "氨气"], 1, "钠与水反应会放出氢气。"),
    q("保存金属钠通常需要放在？", ["水中", "煤油中", "空气中", "稀盐酸中"], 1, "钠活泼，常保存在煤油中隔绝空气和水。")
  ],
  metalAl: [
    q("铝表面不易继续被氧化，是因为形成了？", ["疏松铁锈", "致密氧化膜", "氯化铝", "氢氧化铝沉淀"], 1, "氧化铝薄膜致密，能保护内部金属。"),
    q("Al(OH)3 的典型性质是？", ["只显酸性", "只显碱性", "两性", "强氧化性"], 2, "氢氧化铝是两性氢氧化物。")
  ],
  nonmetal: [
    q("氯气通入水中，具有漂白性的主要成分是？", ["HCl", "HClO", "Cl-", "O2"], 1, "次氯酸有强氧化性，能漂白。"),
    q("浓硫酸作干燥剂体现的是？", ["脱水性", "吸水性", "酸性", "氧化性"], 1, "作干燥剂主要利用吸水性。")
  ],
  lab: [
    q("容量瓶定容时，液面最低点应与刻度线？", ["相切", "高于刻度线", "低于刻度线", "无关"], 0, "视线水平，凹液面最低点与刻度线相切。"),
    q("滴定终点判断通常依赖？", ["颜色突变并半分钟不褪", "液体沸腾", "出现大量气体", "溶液变浑浊"], 0, "指示剂颜色稳定变化可判断终点。")
  ],
  structure: [
    q("同周期元素从左到右，原子半径总体如何变化？", ["增大", "减小", "不变", "先增后减"], 1, "核电荷数增大，电子层数相同，半径总体减小。"),
    q("元素周期律的实质与什么周期性变化有关？", ["原子核质量", "核外电子排布", "物质颜色", "元素名称"], 1, "元素性质周期性源于核外电子排布周期性。")
  ],
  bond: [
    q("NaCl 晶体中主要存在的作用是？", ["共价键", "离子键", "氢键", "金属键"], 1, "钠离子和氯离子之间是离子键。"),
    q("金刚石熔点高，主要因为它属于？", ["分子晶体", "原子晶体", "离子晶体", "金属晶体"], 1, "金刚石为共价网络结构。")
  ],
  rate: [
    q("升高温度通常会使反应速率？", ["减小", "增大", "不变", "无法判断"], 1, "升温增加有效碰撞频率。"),
    q("催化剂改变反应速率，主要通过改变？", ["反应热", "活化能", "反应物质量", "生成物颜色"], 1, "催化剂提供新路径，降低活化能。")
  ],
  balance: [
    q("可逆反应达到平衡时，正逆反应速率关系是？", ["正反应更快", "逆反应更快", "相等且不为零", "都为零"], 2, "化学平衡是动态平衡。"),
    q("增大压强对气体分子数减少的反应平衡会？", ["向分子数减少方向移动", "向分子数增多方向移动", "不移动", "停止反应"], 0, "勒夏特列原理：平衡向减压方向移动。")
  ],
  electrolyte: [
    q("弱电解质电离平衡中，加水稀释通常会使电离程度？", ["减小", "增大", "不变", "变为零"], 1, "稀释促进弱电解质电离。"),
    q("25℃ 时，中性水溶液中 c(H+) 与 c(OH-) 的关系是？", ["大于", "小于", "相等", "无关系"], 2, "中性溶液中氢离子和氢氧根离子浓度相等。")
  ],
  electrochem: [
    q("原电池中电子流出的一极通常是？", ["正极", "负极", "盐桥", "电解质溶液"], 1, "负极失电子，电子从负极流出。"),
    q("电解池把电能转化为？", ["热能", "化学能", "光能", "机械能"], 1, "电解是电能驱动非自发化学反应。")
  ],
  organicBase: [
    q("烷烃的通式是？", ["CnH2n+2", "CnH2n", "CnH2n-2", "CnH2nO"], 0, "链状饱和烷烃通式为 CnH2n+2。"),
    q("乙烯能使溴水褪色，说明它含有？", ["单键", "碳碳双键", "羟基", "羧基"], 1, "碳碳双键能发生加成反应。")
  ],
  integrated: [
    q("高三综合题首先要做的是？", ["直接套公式", "梳理信息与反应关系", "只看最后一问", "忽略条件"], 1, "先建模和整理条件，才能减少误判。"),
    q("解决综合题时，守恒思想不包括？", ["质量守恒", "电荷守恒", "元素守恒", "字体守恒"], 3, "常用守恒包括质量、电荷、元素、电子等。")
  ],
  inference: [
    q("物质推断题中，特征颜色、沉淀和气体信息通常用于？", ["锁定物质线索", "删除方程式", "改变题意", "跳过计算"], 0, "特征现象是推断链的关键线索。"),
    q("白色沉淀遇稀硝酸不溶，可能指向？", ["AgCl 或 BaSO4", "NaCl", "HCl", "CO2"], 0, "AgCl 和 BaSO4 都是不溶于稀硝酸的白色沉淀。")
  ],
  process: [
    q("工艺流程题中，加入试剂的目的通常优先从什么角度分析？", ["美观", "除杂或转化目标物", "增加文字", "降低题量"], 1, "流程题的试剂多服务于除杂、沉淀、氧化还原或转化。"),
    q("过滤操作主要用于分离？", ["互溶液体", "固体和液体", "气体混合物", "同位素"], 1, "过滤用于不溶性固体与液体分离。")
  ],
  experiment: [
    q("实验探究题中，对照实验应保证什么？", ["变量尽可能多", "只改变研究变量", "不记录现象", "随意改变条件"], 1, "控制变量是实验探究的核心。"),
    q("检验装置气密性通常应在什么时候进行？", ["装药品之后", "实验结束后", "装药品之前", "任何时候都不用"], 2, "装药品前先检查气密性。")
  ],
  equilibriumUse: [
    q("平衡图像题中，曲线先拐先平通常说明？", ["速率更快", "反应停止", "产物更多", "浓度为零"], 0, "先达到平衡说明反应速率更快。"),
    q("温度升高平衡向吸热方向移动，这是依据？", ["阿伏伽德罗定律", "勒夏特列原理", "盖斯定律", "质量守恒"], 1, "升温后平衡向减弱升温影响的吸热方向移动。")
  ],
  organicSynthesis: [
    q("有机合成路线设计常用的逆推方法是从哪里开始？", ["原料", "目标产物", "试剂瓶", "题号"], 1, "逆合成分析通常从目标产物反推。"),
    q("醇氧化生成醛或酮，说明反应类型属于？", ["取代", "加成", "氧化", "酯化"], 2, "有机物加氧或脱氢常视为氧化。")
  ],
  finalCalc: [
    q("综合计算题中，建立关系式常基于？", ["元素守恒和方程式计量数", "字体大小", "选项长度", "题目页码"], 0, "守恒和计量关系是计算主线。"),
    q("滴定计算的核心等量关系通常来自？", ["颜色相同", "反应方程式计量关系", "溶液体积都相等", "烧杯质量"], 1, "终点时按方程式计量关系建立等量。")
  ]
};

let state = {
  mode: "login",
  currentUser: null,
  grade: "初三",
  currentTopic: "change",
  testQueue: [],
  queueIndex: 0,
  score: 0,
  answered: false,
  retryTarget: null
};

const authView = document.querySelector("#authView");
const dashboardView = document.querySelector("#dashboardView");
const authForm = document.querySelector("#authForm");
const authSubmit = document.querySelector("#authSubmit");
const authMessage = document.querySelector("#authMessage");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const welcomeTitle = document.querySelector("#welcomeTitle");
const graphCanvas = document.querySelector("#graphCanvas");
const gradeLabel = document.querySelector("#gradeLabel");
const topicTitle = document.querySelector("#topicTitle");
const scorePill = document.querySelector("#scorePill");
const traceText = document.querySelector("#traceText");
const questionKicker = document.querySelector("#questionKicker");
const questionText = document.querySelector("#questionText");
const optionList = document.querySelector("#optionList");
const feedbackText = document.querySelector("#feedbackText");
const startButton = document.querySelector("#startButton");
const nextButton = document.querySelector("#nextButton");
const masteredCount = document.querySelector("#masteredCount");
const weakCount = document.querySelector("#weakCount");
const reviewCount = document.querySelector("#reviewCount");
const levelText = document.querySelector("#levelText");
const xpFill = document.querySelector("#xpFill");
const xpText = document.querySelector("#xpText");
const gemText = document.querySelector("#gemText");
const streakText = document.querySelector("#streakText");
const heartText = document.querySelector("#heartText");
const badgeList = document.querySelector("#badgeList");

function q(text, options, answer, explain) {
  return { text, options, answer, explain };
}

function loadUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getProfile() {
  const users = loadUsers();
  const profile = users[state.currentUser];
  return profile ? normalizeProfile(profile) : profile;
}

function saveProfile(profile) {
  const users = loadUsers();
  users[state.currentUser] = normalizeProfile(profile);
  saveUsers(users);
}

function newProfile(password) {
  return {
    password,
    progress: {},
    stats: { reviews: 0 },
    rewards: {
      xp: 0,
      gems: 0,
      hearts: MAX_HEARTS,
      streak: 0,
      lastStudyDate: "",
      correctAnswers: 0,
      masteredTopics: 0,
      badges: []
    }
  };
}

function normalizeProfile(profile) {
  profile.progress ||= {};
  profile.stats ||= {};
  profile.stats.reviews ||= 0;
  profile.rewards ||= {};
  profile.rewards.xp ||= 0;
  profile.rewards.gems ||= 0;
  profile.rewards.hearts ??= MAX_HEARTS;
  profile.rewards.streak ||= 0;
  profile.rewards.lastStudyDate ||= "";
  profile.rewards.correctAnswers ||= 0;
  profile.rewards.masteredTopics ||= 0;
  profile.rewards.badges ||= [];
  return profile;
}

function topicStatus(topicId) {
  const profile = getProfile();
  const gradeProgress = profile?.progress?.[state.grade] || {};
  return gradeProgress[topicId] || "untested";
}

function setTopicStatus(topicId, status) {
  const profile = getProfile();
  profile.progress[state.grade] ||= {};
  profile.progress[state.grade][topicId] = status;
  saveProfile(profile);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB) {
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(`${dateA}T00:00:00`);
  const end = new Date(`${dateB}T00:00:00`);
  return Math.round((end - start) / oneDay);
}

function recordStudyDay(profile) {
  const today = todayKey();
  if (profile.rewards.lastStudyDate === today) return false;

  const gap = profile.rewards.lastStudyDate ? daysBetween(profile.rewards.lastStudyDate, today) : 0;
  profile.rewards.streak = gap === 1 ? profile.rewards.streak + 1 : 1;
  profile.rewards.lastStudyDate = today;
  profile.rewards.hearts = MAX_HEARTS;
  return true;
}

function awardReward({ xp = 0, gems = 0, correct = false, mastered = false } = {}) {
  const profile = getProfile();
  recordStudyDay(profile);
  profile.rewards.xp += xp;
  profile.rewards.gems += gems;
  if (correct) profile.rewards.correctAnswers += 1;
  if (mastered) profile.rewards.masteredTopics += 1;
  const newBadges = unlockBadges(profile);
  saveProfile(profile);
  renderRewards();
  return { newBadges };
}

function loseHeart() {
  const profile = getProfile();
  recordStudyDay(profile);
  profile.rewards.hearts = Math.max(0, profile.rewards.hearts - 1);
  saveProfile(profile);
  renderRewards();
  return profile.rewards.hearts;
}

function unlockBadges(profile) {
  const newBadges = [];
  BADGES.forEach((badge) => {
    if (!profile.rewards.badges.includes(badge.id) && badge.condition(profile)) {
      profile.rewards.badges.push(badge.id);
      newBadges.push(badge.name);
    }
  });
  return newBadges;
}

function rewardLine(xp, gems, badges = []) {
  const base = `奖励 +${xp} XP、+${gems} 宝石`;
  return badges.length ? `${base}，解锁徽章：${badges.join("、")}` : base;
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  authSubmit.textContent = mode === "login" ? "登录进入" : "创建账号";
  authMessage.textContent = "";
}

function handleAuth(event) {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const users = loadUsers();

  if (state.mode === "register") {
    if (users[username]) {
      authMessage.textContent = "这个用户名已经存在，请换一个。";
      return;
    }
    users[username] = newProfile(password);
    saveUsers(users);
  } else if (!users[username] || users[username].password !== password) {
    authMessage.textContent = "用户名或密码不正确。";
    return;
  }

  state.currentUser = username;
  localStorage.setItem("chemgraph_current_user", username);
  showDashboard();
}

function showDashboard() {
  saveProfile(getProfile());
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  welcomeTitle.textContent = `${state.currentUser}，继续补齐知识链`;
  selectGrade(state.grade);
}

function selectGrade(grade) {
  state.grade = grade;
  state.currentTopic = graphs[grade][0].id;
  state.testQueue = [];
  state.queueIndex = 0;
  state.score = 0;
  state.answered = false;
  state.retryTarget = null;
  document.querySelectorAll(".grade-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.grade === grade);
  });
  gradeLabel.textContent = grade;
  traceText.textContent = "从当前知识点开始测试。";
  renderGraph();
  renderTopic();
  renderStats();
}

function renderGraph() {
  graphCanvas.innerHTML = "";
  const nodes = graphs[state.grade];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("edge-layer");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");

  nodes.filter((node) => node.parent).forEach((node) => {
    const parent = nodes.find((item) => item.id === node.parent);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", parent.x);
    line.setAttribute("y1", parent.y);
    line.setAttribute("x2", node.x);
    line.setAttribute("y2", node.y);
    svg.appendChild(line);
  });
  graphCanvas.appendChild(svg);

  nodes.forEach((node) => {
    const button = document.createElement("button");
    const status = topicStatus(node.id);
    button.className = `topic-node ${status}`;
    button.classList.toggle("current", node.id === state.currentTopic);
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    button.type = "button";
    button.innerHTML = `<h3>${node.name}</h3><p>${statusLabel(status)}</p>`;
    button.addEventListener("click", () => {
      state.currentTopic = node.id;
      state.retryTarget = null;
      state.testQueue = [];
      renderGraph();
      renderTopic();
    });
    graphCanvas.appendChild(button);
  });
}

function statusLabel(status) {
  if (status === "mastered") return "已掌握";
  if (status === "weak") return "待巩固";
  return "未测试";
}

function renderTopic() {
  const topic = getTopic(state.currentTopic);
  topicTitle.textContent = topic.name;
  scorePill.textContent = `${state.score} / ${state.testQueue.length}`;

  if (!state.testQueue.length) {
    questionKicker.textContent = "准备开始";
    questionText.textContent = "点击开始后，系统会根据当前知识点出题。答错会自动追溯到上一级前置知识点。";
    optionList.innerHTML = "";
    feedbackText.textContent = "";
    feedbackText.className = "feedback";
    nextButton.textContent = "下一题";
    nextButton.disabled = true;
    return;
  }

  const question = state.testQueue[state.queueIndex];
  questionKicker.textContent = `第 ${state.queueIndex + 1} 题`;
  questionText.textContent = question.text;
  optionList.innerHTML = "";
  feedbackText.textContent = "";
  feedbackText.className = "feedback";
  nextButton.textContent = "下一题";
  nextButton.disabled = true;
  state.answered = false;

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "option-button";
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => answerQuestion(index));
    optionList.appendChild(button);
  });
}

function startTest() {
  const profile = getProfile();
  const streakStarted = recordStudyDay(profile);
  saveProfile(profile);
  state.testQueue = [...questionBank[state.currentTopic]];
  state.queueIndex = 0;
  state.score = 0;
  state.answered = false;
  scorePill.textContent = `0 / ${state.testQueue.length}`;
  traceText.textContent = state.retryTarget
    ? `正在补测「${getTopic(state.currentTopic).name}」，完成后回到「${getTopic(state.retryTarget).name}」。`
    : `正在测试「${getTopic(state.currentTopic).name}」。${streakStarted ? "今天的连续学习已记录，生命值已恢复。" : ""}`;
  renderRewards();
  renderTopic();
  renderGraph();
}

function answerQuestion(index) {
  if (state.answered) return;
  state.answered = true;
  const question = state.testQueue[state.queueIndex];
  const buttons = [...optionList.querySelectorAll(".option-button")];

  buttons.forEach((button, buttonIndex) => {
    button.disabled = true;
    if (buttonIndex === question.answer) button.classList.add("correct");
  });

  if (index === question.answer) {
    state.score += 1;
    const rewards = awardReward({ xp: 10, gems: 1, correct: true });
    feedbackText.textContent = `答对了。${question.explain} ${rewardLine(10, 1, rewards.newBadges)}`;
    feedbackText.classList.add("success");
  } else {
    const heartsLeft = loseHeart();
    buttons[index].classList.add("wrong");
    feedbackText.textContent = `这里卡住了：${question.explain} 生命值 -1，剩余 ${heartsLeft}。`;
    setTopicStatus(state.currentTopic, "weak");
    nextButton.textContent = "追溯前置知识点";
    nextButton.disabled = false;
    return;
  }

  scorePill.textContent = `${state.score} / ${state.testQueue.length}`;
  nextButton.textContent = state.queueIndex === state.testQueue.length - 1 ? "完成本节点" : "下一题";
  nextButton.disabled = false;
}

function nextStep() {
  const currentQuestion = state.testQueue[state.queueIndex];
  const selectedWrong = [...optionList.querySelectorAll(".option-button")].some((button, index) => {
    return button.classList.contains("wrong") && index !== currentQuestion.answer;
  });

  if (selectedWrong) {
    traceToParent();
    return;
  }

  if (state.queueIndex < state.testQueue.length - 1) {
    state.queueIndex += 1;
    renderTopic();
    return;
  }

  finishTopic();
}

function traceToParent() {
  const topic = getTopic(state.currentTopic);
  const profile = getProfile();
  profile.stats.reviews += 1;
  saveProfile(profile);

  if (!topic.parent) {
    traceText.textContent = `「${topic.name}」已经是本年级图谱的根节点，先巩固这个基础节点。`;
    state.testQueue = [];
    renderStats();
    renderTopic();
    renderGraph();
    return;
  }

  const original = state.currentTopic;
  state.currentTopic = topic.parent;
  state.retryTarget = original;
  traceText.textContent = `从「${getTopic(original).name}」追溯到上一级「${getTopic(topic.parent).name}」。`;
  state.testQueue = [];
  renderStats();
  renderTopic();
  renderGraph();
}

function finishTopic() {
  const passed = state.score === state.testQueue.length;
  const previousStatus = topicStatus(state.currentTopic);
  let masteryReward = "";
  if (passed && previousStatus !== "mastered") {
    const rewards = awardReward({ xp: 25, gems: 5, mastered: true });
    masteryReward = ` ${rewardLine(25, 5, rewards.newBadges)}`;
  }
  setTopicStatus(state.currentTopic, passed ? "mastered" : "weak");
  const finishedTopic = state.currentTopic;

  if (passed && state.retryTarget) {
    const retryName = getTopic(state.retryTarget).name;
    traceText.textContent = `前置知识点「${getTopic(finishedTopic).name}」已补清，现在回到「${retryName}」复测。${masteryReward}`;
    state.currentTopic = state.retryTarget;
    state.retryTarget = null;
  } else {
    traceText.textContent = passed
      ? `「${getTopic(finishedTopic).name}」已掌握，可以继续选择下一个节点。${masteryReward}`
      : `「${getTopic(finishedTopic).name}」建议继续练习。`;
  }

  state.testQueue = [];
  state.queueIndex = 0;
  state.score = 0;
  renderGraph();
  renderStats();
  renderTopic();
}

function renderStats() {
  const profile = getProfile();
  const progress = profile.progress[state.grade] || {};
  masteredCount.textContent = Object.values(progress).filter((status) => status === "mastered").length;
  weakCount.textContent = Object.values(progress).filter((status) => status === "weak").length;
  reviewCount.textContent = profile.stats.reviews;
  renderRewards();
}

function renderRewards() {
  const profile = getProfile();
  if (!profile) return;
  const rewards = profile.rewards;
  const level = Math.floor(rewards.xp / XP_PER_LEVEL) + 1;
  const currentLevelXp = rewards.xp % XP_PER_LEVEL;
  const badgeNames = new Set(rewards.badges);

  levelText.textContent = `Lv.${level} ${levelName(level)}`;
  xpFill.style.width = `${currentLevelXp}%`;
  xpText.textContent = `${currentLevelXp} / ${XP_PER_LEVEL} XP（累计 ${rewards.xp}）`;
  gemText.textContent = rewards.gems;
  streakText.textContent = rewards.streak;
  heartText.textContent = `${rewards.hearts} / ${MAX_HEARTS}`;
  badgeList.innerHTML = "";

  BADGES.forEach((badge) => {
    const item = document.createElement("span");
    const unlocked = badgeNames.has(badge.id);
    item.className = `badge ${unlocked ? "" : "locked"}`;
    item.textContent = `${unlocked ? "★" : "☆"} ${badge.name}`;
    badgeList.appendChild(item);
  });
}

function levelName(level) {
  if (level >= 8) return "元素大师";
  if (level >= 5) return "反应高手";
  if (level >= 3) return "方程式达人";
  return "化学新手";
}

function getTopic(id) {
  return graphs[state.grade].find((topic) => topic.id === id);
}

function logout() {
  localStorage.removeItem("chemgraph_current_user");
  state.currentUser = null;
  dashboardView.classList.add("hidden");
  authView.classList.remove("hidden");
}

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

document.querySelectorAll(".grade-button").forEach((button) => {
  button.addEventListener("click", () => selectGrade(button.dataset.grade));
});

authForm.addEventListener("submit", handleAuth);
startButton.addEventListener("click", startTest);
nextButton.addEventListener("click", nextStep);
document.querySelector("#logoutButton").addEventListener("click", logout);

const savedUser = localStorage.getItem("chemgraph_current_user");
if (savedUser && loadUsers()[savedUser]) {
  state.currentUser = savedUser;
  showDashboard();
}
