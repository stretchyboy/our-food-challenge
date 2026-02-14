const DEFAULT_REPO = "stretchyboy/our-food-challenge";

const REQUIRED_LABELS = [
  { name: "recipe-suggestion", color: "0e8a16", description: "Structured recipe suggestion issues" },
  { name: "accepted", color: "1d76db", description: "Recipe suggestion accepted" },
  { name: "rejected", color: "b60205", description: "Recipe suggestion rejected" },
  { name: "starter", color: "5319e7", description: "Starter course" },
  { name: "main", color: "0052cc", description: "Main course" },
  { name: "dessert", color: "c2e0c6", description: "Dessert course" },
  { name: "vegetarian", color: "bfdadc", description: "Suitable for vegetarian diets" },
  { name: "vegan", color: "a2eeef", description: "Suitable for vegan diets" },
  { name: "fish", color: "d4c5f9", description: "Contains fish" },
  { name: "shellfish", color: "f9d0c4", description: "Contains shellfish" },
  { name: "gluten-free", color: "fef2c0", description: "Suitable for gluten-free diets" },
  { name: "onion-free", color: "fbca04", description: "Suitable for onion-free diets" },
  { name: "requires-adaptation", color: "e99695", description: "Needs adaptation to meet requirements" },
  { name: "comments", color: "cfd3d7", description: "Reserved for Utterances discussion threads" },
];

async function githubRequest(path, { method = "GET", body, token }) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "our-food-challenge-label-sync",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload && payload.message ? payload.message : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function run() {
  const repo = process.env.ISSUE_SYNC_REPO || process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

  if (!token) {
    console.warn("[label-sync] No GitHub token found (GITHUB_TOKEN or GH_TOKEN). Skipping label sync.");
    return;
  }

  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid repo value: ${repo}`);
  }

  const existing = await githubRequest(`/repos/${owner}/${name}/labels?per_page=100`, { token });
  const existingByName = new Map(existing.map((label) => [String(label.name).toLowerCase(), label]));

  let created = 0;
  let updated = 0;

  for (const target of REQUIRED_LABELS) {
    const found = existingByName.get(target.name.toLowerCase());

    if (!found) {
      await githubRequest(`/repos/${owner}/${name}/labels`, {
        method: "POST",
        body: target,
        token,
      });
      created += 1;
      continue;
    }

    const needsUpdate =
      String(found.color || "").toLowerCase() !== String(target.color || "").toLowerCase() ||
      String(found.description || "") !== String(target.description || "");

    if (needsUpdate) {
      await githubRequest(`/repos/${owner}/${name}/labels/${encodeURIComponent(found.name)}`, {
        method: "PATCH",
        body: {
          new_name: target.name,
          color: target.color,
          description: target.description,
        },
        token,
      });
      updated += 1;
    }
  }

  console.log(`[label-sync] Labels ready. created=${created}, updated=${updated}, required=${REQUIRED_LABELS.length}`);
}

run().catch((error) => {
  console.error("[label-sync] Failed:", error.message);
  process.exit(1);
});
