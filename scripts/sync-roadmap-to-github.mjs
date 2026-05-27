#!/usr/bin/env node
/**
 * Sync context/foundation/roadmap.md (Foundations + Slices) to GitHub Issues.
 *
 * Usage:
 *   node scripts/sync-roadmap-to-github.mjs [--dry-run]
 *
 * Env (optional):
 *   GITHUB_REPO  — owner/repo (default: git remote origin)
 *   GH_PROJECT   — project title (default: 10xSprinter Roadmap)
 */

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROADMAP_PATH = resolve(__dirname, "../context/foundation/roadmap.md");
const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ONLY = process.argv.includes("--project-only");

function loadDotEnv() {
  const envPath = resolve(__dirname, "../.env");
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq);
      if (process.env[key]) continue;
      let val = trimmed.slice(eq + 1);
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}
const PROJECT_TITLE = process.env.GH_PROJECT ?? "10xSprinter Roadmap";

const LABELS = [
  { name: "foundation", color: "0E8A16", description: "Roadmap foundation (horizontal enabler)" },
  { name: "slice", color: "1D76DB", description: "Roadmap vertical slice (user-visible milestone)" },
  { name: "north-star", color: "FBCA04", description: "North-star validation slice (S-01)" },
  { name: "roadmap", color: "5319E7", description: "Item from context/foundation/roadmap.md" },
  { name: "blocked", color: "B60205", description: "Blocked on open roadmap questions" },
];

const STREAMS = {
  "F-01": "A — Core poker & sync",
  "F-02": "A — Core poker & sync",
  "S-01": "A — Core poker & sync",
  "F-03": "B — AI scaffold",
  "S-02": "B — AI scaffold",
  "S-03": "C — Coach loop",
  "S-04": "D — Analyst & repo",
};

const READY_FOR_PLAN = {
  "F-01": "yes",
  "F-02": "no",
  "F-03": "yes",
  "S-01": "no",
  "S-02": "no",
  "S-03": "no",
  "S-04": "no",
};

/** @typedef {{ id: string, changeId: string, outcome: string, prdRefs: string, prerequisites: string, risk: string, unlocks: string, unknowns: string, status: string, labels: string[], blockedBy: string[] }} RoadmapItem */

function runGh(args, { json = false, input } = {}) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    input,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `gh ${args.join(" ")} failed`);
  }
  if (!json) return result.stdout?.trim() ?? "";
  return JSON.parse(result.stdout || "null");
}

function getAuthToken() {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
}

function graphqlRequest(query, variables = {}) {
  const token = getAuthToken();
  if (!token) {
    return Promise.resolve(ghGraphql(query, variables));
  }

  return fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  }).then(async (response) => {
    const json = await response.json();
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }
    return json.data;
  });
}

function ghGraphql(query, variables = {}) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    args.push("-f", `${key}=${value}`);
  }
  const result = spawnSync("gh", args, { encoding: "utf8", env: process.env, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || "GraphQL failed");
  }
  const json = JSON.parse(result.stdout);
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

async function gql(query, variables = {}) {
  const token = getAuthToken();
  if (!token) return ghGraphql(query, variables);

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

function getRepo() {
  if (process.env.GITHUB_REPO) return process.env.GITHUB_REPO;
  const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!m) throw new Error("Could not parse GitHub repo from git remote");
  return m[1];
}

function parseRoadmap(content) {
  /** @type {RoadmapItem[]} */
  const items = [];
  const sections = content.split(/^## /m).slice(1);

  for (const section of sections) {
    const heading = section.split("\n")[0].trim();
    if (heading !== "Foundations" && heading !== "Slices") continue;

    for (const block of section.split(/^### /m).slice(1)) {
      const id = block.split("\n")[0].trim().match(/^(F|S)-\d+/)?.[0];
      if (!id) continue;

      const field = (name) => {
        const re = new RegExp(`- \\*\\*${name}:\\*\\*\\s*(.+?)(?=\\n- \\*\\*|\\n### |\\n## |$)`, "s");
        return block.match(re)?.[1]?.trim() ?? "";
      };

      const changeId = field("Change ID");
      const outcome = field("Outcome");
      const prdRefs = field("PRD refs");
      const prerequisites = field("Prerequisites");
      const risk = field("Risk");
      const unlocks = field("Unlocks");
      const unknowns = field("Unknowns");
      const status = field("Status") || "proposed";

      const labels = ["roadmap", ...(id.startsWith("F-") ? ["foundation"] : ["slice"])];
      if (id === "S-01") labels.push("north-star");
      if (status === "blocked") labels.push("blocked");

      const blockedBy = [];
      for (const part of prerequisites.split(",")) {
        const prereqId = part.trim().match(/^(F|S)-\d+/)?.[0];
        if (prereqId) blockedBy.push(prereqId);
      }

      items.push({
        id,
        changeId,
        outcome,
        prdRefs,
        prerequisites,
        risk,
        unlocks,
        unknowns,
        status,
        labels,
        blockedBy,
      });
    }
  }

  return items;
}

function buildDescription(item) {
  const lines = [
    "## Roadmap metadata",
    "",
    "| Field | Value |",
    "|---|---|",
    `| **Roadmap ID** | ${item.id} |`,
    `| **Change ID** | \`${item.changeId}\` |`,
    `| **Status** | ${item.status} |`,
    `| **Stream** | ${STREAMS[item.id] ?? "—"} |`,
    `| **Ready for \`/10x-plan\`** | ${READY_FOR_PLAN[item.id] ?? "no"} |`,
    "",
    "## PRD refs",
    "",
    item.prdRefs,
    "",
    "## Prerequisites",
    "",
    item.prerequisites || "—",
    "",
    "## Risk",
    "",
    item.risk,
  ];

  if (item.unlocks) {
    lines.push("", "## Unlocks", "", item.unlocks);
  }

  if (item.unknowns && item.unknowns !== "—") {
    lines.push("", "## Unknowns", "", item.unknowns);
  }

  lines.push(
    "",
    "---",
    "",
    "_Source: `context/foundation/roadmap.md` (v1, PRD v3)_  ",
    `_Plan with: \`/10x-plan ${item.changeId}\`_`,
  );

  return lines.join("\n");
}

function listExistingIssues(repo) {
  const issues = runGh(["issue", "list", "-R", repo, "-L", "100", "--state", "all", "--json", "id,number,title,url,body"], {
    json: true,
  });
  /** @type {Record<string, { id: string, number: number, url: string }>} */
  const map = {};
  for (const issue of issues) {
    const m = issue.body?.match(/\| \*\*Roadmap ID\*\* \| ((?:F|S)-\d+) \|/);
    if (m) map[m[1]] = { id: issue.id, number: issue.number, url: issue.url };
  }
  return map;
}

function ensureLabels(repo) {
  const existing = runGh(["label", "list", "-R", repo, "-L", "100", "--json", "name"], { json: true });
  const names = new Set(existing.map((l) => l.name));

  for (const label of LABELS) {
    if (names.has(label.name)) continue;
    if (DRY_RUN) {
      console.log(`[dry-run] Would create label: ${label.name}`);
      continue;
    }
    runGh([
      "label",
      "create",
      label.name,
      "-R",
      repo,
      "--color",
      label.color,
      "--description",
      label.description,
      "--force",
    ]);
    console.log(`Created label: ${label.name}`);
  }
}

function createIssue(repo, item) {
  if (DRY_RUN) {
    console.log(`[dry-run] Would create ${item.id}: ${item.outcome.slice(0, 60)}…`);
    return { id: `dry-${item.id}`, number: 0, url: "" };
  }

  const bodyFile = join(tmpdir(), `gh-issue-${item.id}.md`);
  writeFileSync(bodyFile, buildDescription(item));

  try {
    runGh([
      "issue",
      "create",
      "-R",
      repo,
      "--title",
      item.outcome,
      "--body-file",
      bodyFile,
      ...item.labels.flatMap((l) => ["--label", l]),
    ]);
    const issue = runGh(["issue", "list", "-R", repo, "-L", "1", "--json", "id,number,url,body"], { json: true })[0];
    const marker = `| **Roadmap ID** | ${item.id} |`;
    if (!issue?.body?.includes(marker)) {
      throw new Error(`Created issue #${issue?.number} but Roadmap ID marker missing — verify manually`);
    }
    console.log(`Created ${item.id} → #${issue.number}: ${issue.url}`);
    return issue;
  } finally {
    try {
      unlinkSync(bodyFile);
    } catch {
      /* ignore */
    }
  }
}

function addBlockedBy(issueNodeId, blockerNodeId) {
  if (DRY_RUN) {
    console.log("[dry-run] Would link blocked-by");
    return;
  }
  const result = spawnSync(
    "gh",
    [
      "api",
      "graphql",
      "-f",
      `query=mutation($issueId: ID!, $blockingIssueId: ID!) {
        addBlockedBy(input: { issueId: $issueId, blockingIssueId: $blockingIssueId }) {
          clientMutationId
        }
      }`,
      "-f",
      `issueId=${issueNodeId}`,
      "-f",
      `blockingIssueId=${blockerNodeId}`,
    ],
    { encoding: "utf8" },
  );
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    if (out.includes("already been taken") || out.includes("already exists")) {
      console.log("  (dependency already exists, skip)");
      return;
    }
    throw new Error(out.trim() || "GraphQL addBlockedBy failed");
  }
}

async function ensureProject(repo, issueNodeIds) {
  const [, repoName] = repo.split("/");

  if (DRY_RUN) {
    console.log(`[dry-run] Would create/link project "${PROJECT_TITLE}" with ${issueNodeIds.length} items`);
    return null;
  }

  const viewerData = await gql(`query {
    viewer {
      id
      projectsV2(first: 50) { nodes { id title number url } }
    }
    repository(owner: "${repo.split("/")[0]}", name: "${repoName}") { id }
  }`);

  const viewerId = viewerData.viewer.id;
  const repoId = viewerData.repository.id;
  let project = viewerData.viewer.projectsV2.nodes.find((p) => p.title === PROJECT_TITLE);

  if (!project) {
    const created = await gql(
      `mutation($ownerId: ID!, $title: String!) {
        createProjectV2(input: { ownerId: $ownerId, title: $title }) {
          projectV2 { id title number url }
        }
      }`,
      { ownerId: viewerId, title: PROJECT_TITLE },
    );
    project = created.createProjectV2.projectV2;
    console.log(`Created project: ${project.title} (#${project.number})`);
  } else {
    console.log(`Using existing project: ${project.title} (#${project.number})`);
  }

  try {
    await gql(
      `mutation($projectId: ID!, $repositoryId: ID!) {
        linkProjectV2ToRepository(input: { projectId: $projectId, repositoryId: $repositoryId }) {
          clientMutationId
        }
      }`,
      { projectId: project.id, repositoryId: repoId },
    );
  } catch (err) {
    if (!String(err.message).includes("already")) {
      console.warn(`Repo link: ${err.message}`);
    }
  }

  let added = 0;
  for (const nodeId of issueNodeIds) {
    try {
      await gql(
        `mutation($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
            item { id }
          }
        }`,
        { projectId: project.id, contentId: nodeId },
      );
      added++;
    } catch (err) {
      if (String(err.message).includes("already") || String(err.message).includes("taken")) {
        continue;
      }
      throw err;
    }
  }

  console.log(`Added ${added} issues to project "${PROJECT_TITLE}"`);
  console.log(`Project: ${project.url}`);
  return project;
}

async function main() {
  loadDotEnv();
  const repo = getRepo();
  const content = readFileSync(ROADMAP_PATH, "utf8");
  const items = parseRoadmap(content);

  if (!items.length) throw new Error("No roadmap items parsed");

  console.log(`Repo: ${repo}`);
  console.log(`Parsed ${items.length} items: ${items.map((i) => i.id).join(", ")}`);

  ensureLabels(repo);
  const existing = listExistingIssues(repo);

  /** @type {Record<string, { id: string, number: number, url: string }>} */
  const created = { ...existing };

  for (const item of items) {
    if (created[item.id]) {
      console.log(`Skip ${item.id} — already #${created[item.id].number}`);
      continue;
    }
    created[item.id] = createIssue(repo, item);
  }

  if (!PROJECT_ONLY) {
    for (const item of items) {
      const issue = created[item.id];
      if (!issue?.id) continue;

      for (const blockerRoadmapId of item.blockedBy) {
        const blocker = created[blockerRoadmapId];
        if (!blocker?.id) {
          console.warn(`Warning: ${item.id} blockedBy ${blockerRoadmapId} — blocker missing`);
          continue;
        }
        console.log(`Link: ${item.id} (#${issue.number}) blocked by ${blockerRoadmapId} (#${blocker.number})`);
        addBlockedBy(issue.id, blocker.id);
      }
    }
  } else {
    console.log("Skipping dependency links (--project-only)");
  }

  try {
    await ensureProject(
      repo,
      items.map((i) => created[i.id]?.id).filter(Boolean),
    );
  } catch (err) {
    console.warn(`Project step skipped: ${err.message}`);
  }

  console.log("\nDone:");
  for (const item of items) {
    const issue = created[item.id];
    if (issue) console.log(`  ${item.id} → #${issue.number} ${issue.url ?? ""}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
