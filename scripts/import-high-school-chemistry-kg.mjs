import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultRootPath =
  "/Users/keikei/Documents/Codex/2026-05-19/where-codex/high-school-chemistry-kg";
const rootPath = process.argv[2] ?? defaultRootPath;

const graphConfigs = [
  {
    folder: "grade10",
    file: "grade10_chemistry_knowledge_graph.json",
    dbGrade: "senior_one",
    displayGrade: "高一",
    graphVersionId: "kg_senior_one_chemistry_2022_prereq_v1"
  },
  {
    folder: "grade11",
    file: "grade11_chemistry_knowledge_graph.json",
    dbGrade: "senior_two",
    displayGrade: "高二",
    graphVersionId: "kg_senior_two_chemistry_2022_prereq_v1"
  },
  {
    folder: "grade12",
    file: "grade12_chemistry_knowledge_graph.json",
    dbGrade: "senior_three",
    displayGrade: "高三",
    graphVersionId: "kg_senior_three_chemistry_2022_prereq_v1"
  }
];

const stageDifficultyMap = {
  入门: "basic",
  基础: "basic",
  拓展: "medium",
  关键: "medium",
  核心: "advanced",
  应用: "advanced",
  综合: "integrated"
};

const relationWeightMap = {
  prerequisite: 0.95,
  supports: 0.75,
  diagnose: 0.7,
  evidence: 0.8
};

const results = [];

try {
  for (const config of graphConfigs) {
    const graphPath = path.join(rootPath, config.folder, config.file);
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    validateGraph(graph, config.displayGrade);

    const domains = Array.from(new Set(graph.nodes.map((node) => node.domain ?? "未分组")));
    const domainCounts = new Map();

    await prisma.knowledgeGraphVersion.upsert({
      where: { id: config.graphVersionId },
      update: {
        grade: config.dbGrade,
        name: graph.metadata?.title ?? `${config.displayGrade}化学知识图谱：前置依赖版`,
        status: "published",
        publishedAt: new Date()
      },
      create: {
        id: config.graphVersionId,
        grade: config.dbGrade,
        name: graph.metadata?.title ?? `${config.displayGrade}化学知识图谱：前置依赖版`,
        status: "published",
        publishedAt: new Date()
      }
    });

    for (const node of graph.nodes) {
      const domain = node.domain ?? "未分组";
      const domainIndex = domains.indexOf(domain);
      const indexInDomain = domainCounts.get(domain) ?? 0;
      domainCounts.set(domain, indexInDomain + 1);

      await prisma.knowledgePoint.upsert({
        where: { id: node.id },
        update: {
          grade: config.dbGrade,
          name: node.label,
          description: buildDescription(node),
          chapter: domain,
          difficulty: stageDifficultyMap[node.stage] ?? "medium",
          x: toGraphX(domainIndex, domains.length),
          y: toGraphY(indexInDomain),
          graphVersionId: config.graphVersionId,
          status: "published"
        },
        create: {
          id: node.id,
          grade: config.dbGrade,
          name: node.label,
          description: buildDescription(node),
          chapter: domain,
          difficulty: stageDifficultyMap[node.stage] ?? "medium",
          x: toGraphX(domainIndex, domains.length),
          y: toGraphY(indexInDomain),
          graphVersionId: config.graphVersionId,
          status: "published"
        }
      });
    }

    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const importedRelationIds = [];
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        throw new Error(`${config.displayGrade}边 ${edge.id} 引用了不存在的知识点：${edge.source} -> ${edge.target}`);
      }

      const relationId = `high_${config.folder}_${edge.id}`;
      importedRelationIds.push(relationId);
      await prisma.knowledgeRelation.upsert({
        where: { id: relationId },
        update: {
          fromPointId: edge.source,
          toPointId: edge.target,
          relationType: "prerequisite",
          weight: relationWeightMap[edge.relation] ?? 0.7,
          graphVersionId: config.graphVersionId
        },
        create: {
          id: relationId,
          fromPointId: edge.source,
          toPointId: edge.target,
          relationType: "prerequisite",
          weight: relationWeightMap[edge.relation] ?? 0.7,
          graphVersionId: config.graphVersionId
        }
      });
    }

    await prisma.knowledgeRelation.deleteMany({
      where: {
        graphVersionId: config.graphVersionId,
        id: { notIn: importedRelationIds }
      }
    });

    results.push({
      grade: config.displayGrade,
      dbGrade: config.dbGrade,
      graphVersionId: config.graphVersionId,
      sourceFile: path.join(config.folder, config.file),
      importedNodes: graph.nodes.length,
      importedEdges: graph.edges.length,
      domains: domains.length
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        rootPath,
        importedGraphs: results,
        relationMapping: {
          prerequisite: "prerequisite",
          supports: "prerequisite",
          diagnose: "prerequisite",
          evidence: "prerequisite"
        }
      },
      null,
      2
    )
  );
} finally {
  await prisma.$disconnect();
}

function validateGraph(graph, displayGrade) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error(`${displayGrade}知识图谱 JSON 必须包含 nodes 和 edges 数组。`);
  }

  for (const node of graph.nodes) {
    if (!node.id || !node.label) {
      throw new Error(`${displayGrade}每个知识点必须包含 id 和 label。`);
    }
  }

  for (const edge of graph.edges) {
    if (!edge.id || !edge.source || !edge.target) {
      throw new Error(`${displayGrade}每条关系必须包含 id、source 和 target。`);
    }
  }
}

function buildDescription(node) {
  const parts = [
    node.summary,
    node.stage ? `学习阶段：${node.stage}` : "",
    Array.isArray(node.checks) && node.checks.length ? `诊断检查：${node.checks.join("；")}` : ""
  ].filter(Boolean);
  return parts.join("\n");
}

function toGraphX(domainIndex, domainCount) {
  if (domainCount <= 1) return 50;
  return Math.round(8 + (domainIndex / (domainCount - 1)) * 84);
}

function toGraphY(indexInDomain) {
  return Math.round(12 + (indexInDomain % 8) * 10.5);
}
