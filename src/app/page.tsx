import Link from "next/link";
import { BeakerIcon, ChemBuddy, KnowledgePathIllustration, MoleculePath, RewardBadge } from "@/components/visuals";

const routeCards = [
  {
    href: "/student",
    eyebrow: "学生端",
    title: "学生诊断",
    summary: "年级选择、知识图谱测评、错后补救、复盘任务和成长奖励。",
    action: "开始诊断",
    metric: "大题面做题",
    featured: true
  },
  {
    href: "/teacher",
    eyebrow: "老师端",
    title: "老师报告",
    summary: "班级薄弱点、学生错题、复盘跟进、课堂讲评素材。",
    action: "查看班级",
    metric: "授权班级"
  },
  {
    href: "/review",
    eyebrow: "审核端",
    title: "审核工作台",
    summary: "AI 候选题一审、答案解析修正、知识点挂接确认。",
    action: "进入一审",
    metric: "人工发布"
  },
  {
    href: "/admin",
    eyebrow: "管理端",
    title: "管理后台",
    summary: "学校工作台、题库知识图谱、AI 模型配置和审计记录。",
    action: "进入管理",
    metric: "安全配置"
  }
];

const metrics = [
  ["已发布题目", "只进学生端"],
  ["待审核题目", "人工一审"],
  ["今日作答", "记录用时"],
  ["复盘任务", "闭环跟进"],
  ["班级报告", "授权查看"],
  ["核心素养", "成长评价"]
];

const graphNodes = ["前置知识", "当前题目", "错因定位", "补救练习", "复测通过"];

const productFacts = [
  { label: "初高中图谱", value: "4 个年级" },
  { label: "真题入口", value: "先审后发" },
  { label: "成长奖励", value: "重过程" }
];

export default function HomePage() {
  return (
    <main className="page-shell portal-page">
      <header className="portal-header">
        <div>
          <p className="eyebrow">Chem2Exam</p>
          <h1>化学个性化学习诊断系统</h1>
        </div>
        <nav aria-label="首页快捷入口">
          <Link href="/student">学生</Link>
          <Link href="/teacher">老师</Link>
          <Link href="/review">审核</Link>
          <Link href="/admin">管理</Link>
        </nav>
      </header>

      <section className="portal-hero" aria-label="系统首页">
        <div className="portal-hero-copy">
          <p className="eyebrow">中高考真题 · 知识图谱 · 核心素养评价</p>
          <h2>先诊断知识断点，再给出能执行的补救路径。</h2>
          <p>
            学生做题只接触已发布真题；AI 在后台拆题、挂接知识点和生成建议，所有结果都要经过人工一审。
          </p>
          <div className="portal-hero-actions">
            <Link className="portal-alert-action" href="/student">学生开始诊断</Link>
            <Link className="portal-secondary-action" href="/review?status=pending_review&source=exam_paper">查看整卷审核</Link>
          </div>
          <p className="portal-demo-note">各端登录页均提供演示账号，可直接体验学生诊断、老师报告、人工审核和管理工作台。</p>
          <div className="portal-fact-row">
            {productFacts.map((fact) => (
              <span key={fact.label}>
                <strong>{fact.value}</strong>
                {fact.label}
              </span>
            ))}
          </div>
        </div>
        <div className="portal-product-shot" aria-hidden="true">
          <div className="portal-product-main">
            <ChemBuddy state="goal" size="md" />
            <div>
              <span>今日诊断</span>
              <strong>补清前置知识 +20 XP</strong>
              <p>错后路径已生成，回到原题型复测。</p>
            </div>
          </div>
          <KnowledgePathIllustration activeStep={2} size="md" />
          <div className="portal-product-badges">
            <RewardBadge variant="review" size="sm" unlocked />
            <RewardBadge variant="streak" size="sm" unlocked />
            <BeakerIcon level={0.72} size="sm" />
          </div>
        </div>
      </section>

      <section className="portal-layout">
        <div className="portal-routes" aria-label="四端入口">
          {routeCards.map((card) => (
            <Link className={card.featured ? "portal-route-card featured" : "portal-route-card"} href={card.href} key={card.href}>
              <div className="portal-route-topline">
                <span className="eyebrow">{card.eyebrow}</span>
                <em>{card.metric}</em>
              </div>
              <strong>{card.title}</strong>
              <p>{card.summary}</p>
              <span className="portal-card-action">{card.action}</span>
            </Link>
          ))}
        </div>

        <aside className="card portal-summary" aria-label="试点汇总">
          <div className="portal-summary-head">
            <div>
              <p className="eyebrow">试点汇总</p>
              <h2>今天该看什么</h2>
            </div>
            <span>本地演示数据</span>
          </div>
          <div className="portal-metric-grid">
            {metrics.map(([label, value]) => (
              <div className="portal-metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="portal-insight-grid">
        <article className="card portal-preview">
          <div className="portal-summary-head">
            <div>
              <p className="eyebrow">诊断闭环</p>
              <h2>从做错到补清</h2>
            </div>
            <span>学生端只展示已发布题</span>
          </div>
          <div className="portal-graph-preview" aria-label="知识图谱补救路径预览">
            {graphNodes.map((node, index) => (
              <div className="portal-graph-node" key={node}>
                <span>{index + 1}</span>
                <strong>{node}</strong>
              </div>
            ))}
          </div>
          <MoleculePath activeIndex={3} size="sm" />
        </article>

        <article className="card portal-preview">
          <div className="portal-summary-head">
            <div>
              <p className="eyebrow">安全边界</p>
              <h2>AI 不直接发布</h2>
            </div>
            <span>API Key 后端加密保存</span>
          </div>
          <div className="portal-rule-list">
            <span>AI 拆题进入审核队列</span>
            <span>人工一审通过后发布</span>
            <span>老师只看授权班级</span>
            <span>学生端只给激励性表达</span>
          </div>
        </article>
      </section>
    </main>
  );
}
