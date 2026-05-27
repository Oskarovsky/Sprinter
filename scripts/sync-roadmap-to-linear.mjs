#!/usr/bin/env node
/**
 * Sync context/foundation/roadmap.md (Foundations + Slices) to Linear.
 *
 * Env:
 *   LINEAR_API_KEY  — Personal API key (Settings → Security & access)
 *   LINEAR_TEAM     — Team key or name (optional; uses first team if unset)
 *
 * Usage:
 *   node scripts/sync-roadmap-to-linear.mjs [--dry-run]
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROADMAP_PATH = resolve(__dirname, "../context/foundation/roadmap.md");
const API_URL = "https://api.linear.app/graphql";
const DRY_RUN = process.argv.includes("--dry-run");

const LABELS = ["foundation", "slice", "north-star"];

/** @typedef {{ id: string, changeId: string, outcome: string, prdRefs: string, prerequisites: string, risk: string, labels: string[], blockedBy: string[] }} RoadmapItem */

async function gql(query, variables = {}) {
  const key = process.env.LINEAR_API_KEY;
  if (!key) {
    throw new Error(
      "Missing LINEAR_API_KEY. Create one at Linear → Settings → Security & access.",
    );
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

function parseRoadmap(content) {
  /** @type {RoadmapItem[]} */
  const items = [];
  const sections = content.split(/^## /m).slice(1);

  for (const section of sections) {
    const heading = section.split("\n")[0].trim();
    if (heading !== "Foundations" && heading !== "Slices") continue;

    const blocks = section.split(/^### /m).slice(1);
    for (const block of blocks) {
      const titleLine = block.split("\n")[0].trim();
      const idMatch = titleLine.match(/^(F|S)-\d+/);
      if (!idMatch) continue;

      const id = idMatch[0];
      const field = (name) => {
        const re = new RegExp(`- \\*\\*${name}:\\*\\*\\s*(.+?)(?=\\n- \\*\\*|\\n### |\\n## |$)`, "s");
        const m = block.match(re);
        return m ? m[1].trim() : "";
      };

      const changeId = field("Change ID");
      const outcome = field("Outcome");
      const prdRefs = field("PRD refs");
      const prerequisites = field("Prerequisites");
      const risk = field("Risk");

      const labels = id.startsWith("F-") ? ["foundation"] : ["slice"];
      if (id === "S-01") labels.push("north-star");

      const blockedBy = [];
      for (const prereq of prerequisites.split(",")) {
        const trimmed = prereq.trim();
        const prereqId = trimmed.match(/^(F|S)-\d+/)?.[0];
        if (prereqId) blockedBy.push(prereqId);
      }

      items.push({ id, changeId, outcome, prdRefs, prerequisites, risk, labels, blockedBy });
    }
  }

  return items;
}

function buildDescription(item) {
  return [
    `**Roadmap ID:** ${item.id}`,
    `**Change ID:** \`${item.changeId}\``,
    "",
    "## PRD refs",
    item.prdRefs,
    "",
    "## Prerequisites",
    item.prerequisites || "—",
    "",
    "## Risk",
    item.risk,
    "",
    "---",
    "_Source: `context/foundation/roadmap.md`_",
  ].join("\n");
}

async function getTeamId() {
  const data = await gql(`query { teams { nodes { id key name } } }`);
  const teams = data.teams.nodes;
  if (!teams.length) throw new Error("No teams found in Linear workspace");

  const hint = process.env.LINEAR_TEAM?.trim();
  if (hint) {
    const team = teams.find(
      (t) =>
        t.id === hint ||
        t.key.toLowerCase() === hint.toLowerCase() ||
        t.name.toLowerCase() === hint.toLowerCase(),
    );
    if (!team) {
      throw new Error(
        `LINEAR_TEAM "${hint}" not found. Available: ${teams.map((t) => t.key).join(", ")}`,
      );
    }
    return team;
  }

  if (teams.length === 1) return teams[0];
  console.warn(
    `Multiple teams (${teams.map((t) => t.key).join(", ")}); using ${teams[0].key}. Set LINEAR_TEAM to override.`,
  );
  return teams[0];
}

async function ensureLabels(teamId) {
  const data = await gql(
    `query($teamId: String!) {
      team(id: $teamId) {
        labels { nodes { id name } }
      }
    }`,
    { teamId },
  );

  const existing = new Map(data.team.labels.nodes.map((l) => [l.name, l.id]));
  /** @type {Record<string, string>} */
  const labelIds = {};

  for (const name of LABELS) {
    if (existing.has(name)) {
      labelIds[name] = existing.get(name);
      continue;
    }

    if (DRY_RUN) {
      labelIds[name] = `dry-run-${name}`;
      console.log(`[dry-run] Would create label: ${name}`);
      continue;
    }

    const created = await gql(
      `mutation($teamId: String!, $name: String!) {
        issueLabelCreate(input: { teamId: $teamId, name: $name }) {
          success
          issueLabel { id name }
        }
      }`,
      { teamId, name },
    );
    labelIds[name] = created.issueLabelCreate.issueLabel.id;
    console.log(`Created label: ${name}`);
  }

  return labelIds;
}

async function findExistingIssues(teamId, roadmapIds) {
  const data = await gql(
    `query($teamId: String!) {
      team(id: $teamId) {
        issues(first: 250, filter: { description: { contains: "Roadmap ID:" } }) {
          nodes { id identifier title description }
        }
      }
    }`,
    { teamId },
  );

  /** @type {Record<string, { id: string, identifier: string }>} */
  const map = {};
  for (const issue of data.team.issues.nodes) {
    const m = issue.description?.match(/\*\*Roadmap ID:\*\* ((?:F|S)-\d+)/);
    if (m && roadmapIds.includes(m[1])) {
      map[m[1]] = { id: issue.id, identifier: issue.identifier };
    }
  }
  return map;
}

async function createIssue(teamId, item, labelIds) {
  const labelIdList = item.labels.map((n) => labelIds[n]).filter(Boolean);

  if (DRY_RUN) {
    console.log(`[dry-run] Would create ${item.id}: ${item.outcome}`);
    return { id: `dry-${item.id}`, identifier: item.id };
  }

  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url }
      }
    }`,
    {
      input: {
        teamId,
        title: item.outcome,
        description: buildDescription(item),
        labelIds: labelIdList,
      },
    },
  );

  const issue = data.issueCreate.issue;
  console.log(`Created ${item.id} → ${issue.identifier}: ${issue.url}`);
  return issue;
}

async function linkBlockedBy(issueId, blockerId) {
  if (DRY_RUN) {
    console.log(`[dry-run] Would link blockedBy: ${blockerId} → issue`);
    return;
  }

  await gql(
    `mutation($input: IssueRelationCreateInput!) {
      issueRelationCreate(input: $input) { success }
    }`,
    {
      input: {
        issueId: blockerId,
        relatedIssueId: issueId,
        type: "blocks",
      },
    },
  );
}

async function main() {
  const content = readFileSync(ROADMAP_PATH, "utf8");
  const items = parseRoadmap(content);

  if (!items.length) {
    throw new Error("No roadmap items parsed from Foundations/Slices sections");
  }

  console.log(`Parsed ${items.length} items: ${items.map((i) => i.id).join(", ")}`);

  const team = await getTeamId();
  console.log(`Team: ${team.key} (${team.name})`);

  const labelIds = await ensureLabels(team.id);
  const existing = await findExistingIssues(
    team.id,
    items.map((i) => i.id),
  );

  /** @type {Record<string, { id: string, identifier: string }>} */
  const created = { ...existing };

  for (const item of items) {
    if (created[item.id]) {
      console.log(`Skip ${item.id} — already exists as ${created[item.id].identifier}`);
      continue;
    }
    created[item.id] = await createIssue(team.id, item, labelIds);
  }

  for (const item of items) {
    const issue = created[item.id];
    if (!issue) continue;

    for (const blockerRoadmapId of item.blockedBy) {
      const blocker = created[blockerRoadmapId];
      if (!blocker) {
        console.warn(`Warning: ${item.id} blockedBy ${blockerRoadmapId} — blocker issue missing`);
        continue;
      }
      console.log(`Link: ${item.id} blockedBy ${blockerRoadmapId} (${blocker.identifier})`);
      await linkBlockedBy(issue.id, blocker.id);
    }
  }

  console.log("\nDone. Created/linked issues:");
  for (const item of items) {
    const issue = created[item.id];
    if (issue) console.log(`  ${item.id} → ${issue.identifier}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
