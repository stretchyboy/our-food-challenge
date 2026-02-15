const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "..", "src", "_data", "issueFoods.json");
const DEFAULT_REPO = "stretchyboy/our-food-challenge";
const SYSTEM_COMMENT_LABEL = "comments";
const SUGGESTION_LABELS = new Set(["recipe-suggestion", "recipe suggestion"]);
const DIETARY_LABELS = ["vegetarian", "vegan", "fish", "shellfish", "gluten-free", "onion-free"];

function hasSuggestionLabel(labelNames) {
  return labelNames.some((label) => SUGGESTION_LABELS.has(label));
}

function parseIssueSection(body, heading) {
  const source = `${body || ""}`;
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`###\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n###\\s|$)`, "i");
  const match = source.match(regex);
  if (!match || !match[1]) {
    return "";
  }
  return match[1].trim();
}

function isCheckedOption(sectionText, value) {
  const source = `${sectionText || ""}`.toLowerCase();
  const needle = value.toLowerCase();
  return source.includes(`[x] ${needle}`) || source.includes(`- ${needle}`) || source === needle;
}

function parseBodyCourse(body) {
  const section = parseIssueSection(body, "Course").toLowerCase();
  if (section.includes("dessert")) return "dessert";
  if (section.includes("starter")) return "starter";
  if (section.includes("main")) return "main";
  return null;
}

function parseBodyDietaryTags(body) {
  const section = parseIssueSection(body, "Dietary tags");
  return DIETARY_LABELS.filter((label) => isCheckedOption(section, label));
}

function parseBodyRequiresAdaptation(body) {
  const section = parseIssueSection(body, "Adaptation");
  return isCheckedOption(section, "requires-adaptation");
}

function hasSuggestionBody(issue) {
  const body = issue.body || "";
  const hasCountryPath = Boolean(parseIssueSection(body, "Country page path"));
  const hasRecipeName = Boolean(parseIssueSection(body, "Recipe name"));
  return hasCountryPath && hasRecipeName;
}

function normalizePathname(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();
  const match = cleaned.match(/\/posts\/[\w\-\u00C0-\u024F\u1E00-\u1EFF%]+\/?/i);
  if (!match) {
    return null;
  }

  let pathname = match[0];
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }
  if (!pathname.endsWith("/")) {
    pathname = `${pathname}/`;
  }

  return pathname.toLowerCase();
}

function extractPathnameFromIssue(issue) {
  const countryLabel = issue.labels
    .map((label) => label.name || "")
    .find((label) => label.toLowerCase().startsWith("country:"));

  if (countryLabel) {
    const fromLabel = normalizePathname(countryLabel.slice("country:".length));
    if (fromLabel) {
      return fromLabel;
    }
  }

  const body = issue.body || "";
  const pathFromBody = normalizePathname(body);
  if (pathFromBody) {
    return pathFromBody;
  }

  return null;
}

function extractRecipeName(issue) {
  const body = issue.body || "";
  const headingMatch = body.match(/###\s*Recipe name\s*\n+([^\n]+)/i);
  if (headingMatch && headingMatch[1]) {
    return headingMatch[1].trim();
  }

  const titleMatch = issue.title.match(/Recipe suggestion:\s*(.+)$/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  return issue.title.trim();
}

function extractSourceUrl(issue) {
  const sanitizeSourceUrl = (value) => {
    if (!value || !/^https?:\/\//i.test(value)) {
      return null;
    }
    return value.toLowerCase().includes("glitch.me") ? null : value;
  };

  const body = issue.body || "";
  const sourceFieldMatch = body.match(/###\s*Source URL\s*\n+([^\n]+)/i);
  if (sourceFieldMatch && sourceFieldMatch[1]) {
    const possible = sanitizeSourceUrl(sourceFieldMatch[1].trim());
    if (possible) {
      return possible;
    }
  }

  const urlMatch = body.match(/https?:\/\/[^\s)]+/i);
  return sanitizeSourceUrl(urlMatch ? urlMatch[0] : null);
}

function classifyIssue(issue) {
  const labels = new Set(issue.labels.map((label) => (label.name || "").toLowerCase()));
  const isClosedNotPlanned = issue.state === "closed" && issue.state_reason === "not_planned";

  const isAccepted = labels.has("accepted");
  const isRejected = labels.has("rejected");

  if (isRejected || isClosedNotPlanned) {
    return null;
  }

  if (isAccepted) {
    return "accepted";
  }
  return "suggestions";
}

function buildEntry(issue) {
  const labels = issue.labels.map((label) => (label.name || "").toLowerCase());
  const bodyCourse = parseBodyCourse(issue.body);
  const bodyDietary = parseBodyDietaryTags(issue.body);
  const bodyRequiresAdaptation = parseBodyRequiresAdaptation(issue.body);

  const course = labels.includes("dessert")
    ? "dessert"
    : labels.includes("starter")
      ? "starter"
      : labels.includes("main")
        ? "main"
        : bodyCourse || "main";

  const dietaryTagsFromLabels = labels.filter((label) => DIETARY_LABELS.includes(label));
  const dietaryTags = Array.from(new Set([...dietaryTagsFromLabels, ...bodyDietary]));
  const requiresAdaptation = labels.includes("requires-adaptation") || bodyRequiresAdaptation;
  const displayLabels = labels.filter((label) => !["recipe-suggestion", "accepted"].includes(label));

  return {
    name: extractRecipeName(issue),
    url: extractSourceUrl(issue),
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    labels,
    displayLabels,
    course,
    dietaryTags,
    requiresAdaptation,
    updatedAt: issue.updated_at,
  };
}

async function fetchIssues(repo, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "our-food-challenge-sync",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const allIssues = [];
  let page = 1;
  while (true) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&page=${page}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API request failed (${response.status})`);
    }

    const issues = await response.json();
    if (!issues.length) {
      break;
    }

    const onlyIssues = issues.filter((item) => !item.pull_request);
    allIssues.push(...onlyIssues);

    if (issues.length < 100) {
      break;
    }

    page += 1;
  }

  return allIssues;
}

async function run() {
  const repo = process.env.ISSUE_SYNC_REPO || process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

  if (!token) {
    console.warn("[issue-sync] No GitHub token found (GITHUB_TOKEN or GH_TOKEN). Keeping existing issueFoods snapshot.");
    return;
  }

  const issues = await fetchIssues(repo, token);

  const grouped = {};
  const diagnostics = {
    totalIssues: issues.length,
    usedIssues: 0,
    skippedNoPath: 0,
    skippedWrongLabel: 0,
    skippedRejected: 0,
    skippedNotPlanned: 0,
    wrongLabelSamples: [],
  };

  for (const issue of issues) {
    const labelNames = issue.labels.map((label) => (label.name || "").toLowerCase());

    if (labelNames.includes(SYSTEM_COMMENT_LABEL)) {
      diagnostics.skippedWrongLabel += 1;
      continue;
    }

    if (!hasSuggestionLabel(labelNames) && !hasSuggestionBody(issue)) {
      diagnostics.skippedWrongLabel += 1;
      if (diagnostics.wrongLabelSamples.length < 5) {
        diagnostics.wrongLabelSamples.push({
          number: issue.number,
          labels: labelNames,
        });
      }
      continue;
    }

    const pathname = extractPathnameFromIssue(issue);
    if (!pathname) {
      diagnostics.skippedNoPath += 1;
      continue;
    }

    const bucket = classifyIssue(issue);
    if (!bucket) {
      if (issue.state === "closed" && issue.state_reason === "not_planned") {
        diagnostics.skippedNotPlanned += 1;
      } else {
        diagnostics.skippedRejected += 1;
      }
      continue;
    }

    if (!grouped[pathname]) {
      grouped[pathname] = {
        accepted: [],
        suggestions: [],
      };
    }

    grouped[pathname][bucket].push(buildEntry(issue));
    diagnostics.usedIssues += 1;
  }

  for (const pathname of Object.keys(grouped)) {
    for (const key of ["accepted", "suggestions"]) {
      grouped[pathname][key].sort((a, b) =>
        Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "")
      );
    }
  }

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(grouped, null, 2)}\n`, "utf8");

  console.log(
    `[issue-sync] Wrote ${Object.keys(grouped).length} paths to src/_data/issueFoods.json (used ${diagnostics.usedIssues}/${diagnostics.totalIssues} issues).`
  );
  console.log(
    `[issue-sync] skipped: no-path=${diagnostics.skippedNoPath}, wrong-label=${diagnostics.skippedWrongLabel}, rejected=${diagnostics.skippedRejected}, not-planned=${diagnostics.skippedNotPlanned}`
  );
  if (diagnostics.wrongLabelSamples.length) {
    console.log("[issue-sync] wrong-label examples:");
    for (const sample of diagnostics.wrongLabelSamples) {
      console.log(`  #${sample.number}: [${sample.labels.join(", ")}]`);
    }
  }
}

run().catch((error) => {
  console.error("[issue-sync] Failed:", error.message);
  process.exit(1);
});
