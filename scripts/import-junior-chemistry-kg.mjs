import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultGraphPath =
  "/Users/keikei/Documents/Codex/2026-05-19/where-codex/junior-chemistry-kg/junior_chemistry_knowledge_graph.json";
const graphPath = process.argv[2] ?? defaultGraphPath;
const graphVersionId = "kg_junior_chemistry_2022_prereq_v1";

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
  evidence: 0.8
};

try {
  const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
  validateGraph(graph);

  const domains = Array.from(new Set(graph.nodes.map((node) => node.domain ?? "未分组")));
  const domainCounts = new Map();

  await prisma.knowledgeGraphVersion.upsert({
    where: { id: graphVersionId },
    update: {
      grade: "junior_three",
      name: graph.metadata?.title ?? "初中化学知识图谱：前置依赖版",
      status: "published",
      publishedAt: new Date()
    },
    create: {
      id: graphVersionId,
      grade: "junior_three",
      name: graph.metadata?.title ?? "初中化学知识图谱：前置依赖版",
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
        grade: "junior_three",
        name: node.label,
        description: buildDescription(node),
        chapter: domain,
        difficulty: stageDifficultyMap[node.stage] ?? "medium",
        x: toGraphX(domainIndex, domains.length),
        y: toGraphY(indexInDomain),
        graphVersionId,
        status: "published"
      },
      create: {
        id: node.id,
        grade: "junior_three",
        name: node.label,
        description: buildDescription(node),
        chapter: domain,
        difficulty: stageDifficultyMap[node.stage] ?? "medium",
        x: toGraphX(domainIndex, domains.length),
        y: toGraphY(indexInDomain),
        graphVersionId,
        status: "published"
      }
    });
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const importedRelationIds = [];
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`边 ${edge.id} 引用了不存在的知识点：${edge.source} -> ${edge.target}`);
    }

    const relationId = `junior_${edge.id}`;
    importedRelationIds.push(relationId);
    await prisma.knowledgeRelation.upsert({
      where: { id: relationId },
      update: {
        fromPointId: edge.source,
        toPointId: edge.target,
        relationType: "prerequisite",
        weight: relationWeightMap[edge.relation] ?? 0.7,
        graphVersionId
      },
      create: {
        id: relationId,
        fromPointId: edge.source,
        toPointId: edge.target,
        relationType: "prerequisite",
        weight: relationWeightMap[edge.relation] ?? 0.7,
        graphVersionId
      }
    });
  }

  await prisma.knowledgeRelation.deleteMany({
    where: {
      graphVersionId,
      id: { notIn: importedRelationIds }
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        graphVersionId,
        sourceFile: path.basename(graphPath),
        grade: "junior_three",
        importedNodes: graph.nodes.length,
        importedEdges: graph.edges.length,
        domains: domains.length,
        relationMapping: {
          prerequisite: "prerequisite",
          supports: "prerequisite",
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

function validateGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("知识图谱 JSON 必须包含 nodes 和 edges 数组。");
  }

  for (const node of graph.nodes) {
    if (!node.id || !node.label) {
      throw new Error("每个知识点必须包含 id 和 label。");
    }
  }

  for (const edge of graph.edges) {
    if (!edge.id || !edge.source || !edge.target) {
      throw new Error("每条关系必须包含 id、source 和 target。");
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
