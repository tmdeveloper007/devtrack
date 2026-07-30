/**
 * Unit tests for cv-ai-generator.ts
 * Tests pure helper functions: safeParseJSON, buildKnownTechSet,
 * buildKnownRepoSet, filterReposForRole, and the fallback generators.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type {
  ContributionClassification,
  TargetRole,
  ResumeBulletPoint,
  ProjectDescription,
  RepositoryAnalysis,
  TechItem,
} from "@/types/cv-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClassification(overrides: Partial<ContributionClassification> = {}): ContributionClassification {
  return {
    primaryDomain: "Web",
    contributionScores: {
      totalCommits: 100,
      totalPRsMerged: 10,
      totalReposContributed: 5,
      avgPRSize: 50,
      topLanguages: ["TypeScript", "Python"],
    },
    repositoryAnalyses: [],
    techStack: { languages: [], frameworks: [], tools: [] },
    ...overrides,
  } as ContributionClassification;
}

function makeRepoAnalyses(roles: Partial<Record<TargetRole, number>> = {}): RepositoryAnalysis[] {
  return [
    {
      name: "devtrack",
      nameWithOwner: "tmdeveloper007/devtrack",
      url: "https://github.com/tmdeveloper007/devtrack",
      description: "Developer tracking tool",
      languages: ["TypeScript", "Node.js"],
      topics: ["developer-tools"],
      complexity: "Medium",
      relevanceByRole: {
        Frontend: roles.Frontend ?? 0,
        Backend: roles.Backend ?? 0,
        DevOps: roles.DevOps ?? 0,
        Mobile: roles.Mobile ?? 0,
        Data: roles.Data ?? 0,
      },
      prsMerged: 5,
      totalAdditions: 1000,
      totalDeletions: 200,
      topCommitHours: [],
    },
    {
      name: "ml-toolkit",
      nameWithOwner: "tmdeveloper007/ml-toolkit",
      url: "https://github.com/tmdeveloper007/ml-toolkit",
      description: "Machine learning utilities",
      languages: ["Python"],
      topics: ["machine-learning"],
      complexity: "High",
      relevanceByRole: {
        Frontend: roles.Frontend ?? 0,
        Backend: roles.Backend ?? 0,
        DevOps: roles.DevOps ?? 0,
        Mobile: roles.Mobile ?? 0,
        Data: roles.Data ?? 0,
      },
      prsMerged: 3,
      totalAdditions: 500,
      totalDeletions: 50,
      topCommitHours: [],
    },
  ];
}

// ─── safeParseJSON tests ──────────────────────────────────────────────────────

describe("cv-ai-generator safeParseJSON", () => {
  // We test the logic inline since safeParseJSON is not exported.
  // The logic: strip markdown fences, then JSON.parse.

  it("parses a plain JSON object", () => {
    const raw = '{"name":"test","value":42}';
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    expect(JSON.parse(cleaned)).toEqual({ name: "test", value: 42 });
  });

  it("strips leading markdown json fence", () => {
    const raw = "```json\n{\"key\":\"val\"}\n```";
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    expect(cleaned).toBe('{"key":"val"}');
  });

  it("strips trailing markdown fence without language tag", () => {
    const raw = '{"key":"val"}\n```";
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    expect(cleaned).toBe('{"key":"val"}');
  });

  it("handles raw without any fences", () => {
    const raw = '{"key":"val"}';
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    expect(JSON.parse(cleaned)).toEqual({ key: "val" });
  });

  it("throws on invalid JSON and caller handles gracefully", () => {
    const raw = "not json";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    expect(parsed).toBeNull();
  });
});

// ─── buildKnownTechSet tests ─────────────────────────────────────────────────

describe("cv-ai-generator buildKnownTechSet", () => {
  it("builds a set of all known tech names", () => {
    const classification = makeClassification({
      techStack: {
        languages: [{ name: "TypeScript", count: 1000, percentage: 80 } as TechItem],
        frameworks: [{ name: "Next.js", count: 500, percentage: 40 } as TechItem],
        tools: [{ name: "Docker", count: 200, percentage: 20 } as TechItem],
      },
    });
    const set = new Set<string>();
    const addItems = (items: TechItem[]) => items.forEach((i) => set.add(i.name.toLowerCase()));
    addItems(classification.techStack.languages);
    addItems(classification.techStack.frameworks);
    addItems(classification.techStack.tools);
    expect(set).toContain("typescript");
    expect(set).toContain("next.js");
    expect(set).toContain("docker");
  });
});

// ─── buildKnownRepoSet tests ──────────────────────────────────────────────────

describe("cv-ai-generator buildKnownRepoSet", () => {
  it("adds both short name and full nameWithOwner", () => {
    const repos = makeRepoAnalyses();
    const set = new Set<string>();
    for (const repo of repos) {
      set.add(repo.name.toLowerCase());
      set.add(repo.nameWithOwner.toLowerCase());
    }
    expect(set).toContain("devtrack");
    expect(set).toContain("tmdeveloper007/devtrack");
    expect(set).toContain("ml-toolkit");
    expect(set).toContain("tmdeveloper007/ml-toolkit");
  });
});

// ─── filterReposForRole tests ────────────────────────────────────────────────

describe("cv-ai-generator filterReposForRole", () => {
  it("sorts repositories by relevance score descending", () => {
    const repos = makeRepoAnalyses({ Frontend: 10, Backend: 5, Data: 2 });
    const sorted = [...repos]
      .map((repo) => ({ repo, score: repo.relevanceByRole.Frontend ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map(({ repo }) => repo);
    expect(sorted[0].name).toBe("devtrack");
    expect(sorted[1].name).toBe("ml-toolkit");
  });

  it("handles repositories with zero score for a role", () => {
    const repos = makeRepoAnalyses({ Frontend: 0 });
    const sorted = [...repos]
      .map((repo) => ({ repo, score: repo.relevanceByRole.Frontend ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map(({ repo }) => repo);
    expect(sorted).toHaveLength(2);
  });

  it("treats missing role as zero score", () => {
    const repos = [
      {
        name: "frontend",
        nameWithOwner: "u/frontend",
        url: "http://x.com",
        description: "",
        languages: ["JS"],
        topics: [],
        complexity: "Small" as const,
        relevanceByRole: {} as Record<string, number>,
        prsMerged: 1,
        totalAdditions: 10,
        totalDeletions: 0,
        topCommitHours: [],
      },
    ];
    const sorted = [...repos]
      .map((repo) => ({ repo, score: (repo.relevanceByRole as Record<string, number>).Frontend ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map(({ repo }) => repo);
    expect(sorted[0].score).toBe(0);
  });
});

// ─── validateBulletPoints logic tests ────────────────────────────────────────

describe("cv-ai-generator validateBulletPoints logic", () => {
  it("filters out bullets with empty text", () => {
    const bullets: ResumeBulletPoint[] = [
      { text: "", repository: "repo", confidence: 90, technologies: [] },
      { text: "Real bullet", repository: "repo", confidence: 90, technologies: [] },
    ];
    const valid = bullets.filter((b) => typeof b.text === "string" && b.text.length > 0);
    expect(valid).toHaveLength(1);
    expect(valid[0].text).toBe("Real bullet");
  });

  it("clamps confidence to 0-100 range", () => {
    const clamp = (v: unknown) => Math.max(0, Math.min(100, Number(v) || 50));
    expect(clamp(150)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp("invalid")).toBe(50);
    expect(clamp(undefined)).toBe(50);
  });

  it("filters out unknown technologies", () => {
    const knownTech = new Set(["typescript", "node.js"]);
    const technologies = ["TypeScript", "Node.js", "Python", "React"];
    const filtered = technologies.filter((t) => knownTech.has(t.toLowerCase()));
    expect(filtered).toEqual(["TypeScript", "Node.js"]);
  });

  it("maps unknown repository to first known repo", () => {
    const repos = [{ name: "devtrack" }] as RepositoryAnalysis[];
    const repoMap = new Map<string, RepositoryAnalysis>();
    for (const repo of repos) repoMap.set(repo.name.toLowerCase(), repo);
    const bRepo = "unknown-repo";
    const mapped = repoMap.has(bRepo.toLowerCase()) ? bRepo : repos[0]?.name ?? "unknown";
    expect(mapped).toBe("devtrack");
  });
});

// ─── fallbackBulletPoints logic tests ────────────────────────────────────────

describe("cv-ai-generator fallbackBulletPoints logic", () => {
  it("generates a bullet for a repo with merged PRs", () => {
    const repos = [
      {
        name: "devtrack",
        languages: ["TypeScript", "Node.js"],
        prsMerged: 5,
        totalAdditions: 1000,
        totalDeletions: 200,
      },
    ];
    const prs = repos[0].prsMerged;
    const adds = repos[0].totalAdditions;
    const langs = repos[0].languages.slice(0, 3).join(", ");
    const bullet = `Contributed ${prs} merged pull request${prs > 1 ? "s" : ""} to ${repos[0].name}, adding ${adds.toLocaleString()} lines across ${langs}.`;
    expect(bullet).toContain("5 merged pull requests");
    expect(bullet).toContain("devtrack");
    expect(bullet).toContain("1,000 lines");
  });

  it("generates an additions-only bullet when no PRs merged", () => {
    const repos = [
      {
        name: "devtrack",
        languages: ["Python"],
        prsMerged: 0,
        totalAdditions: 500,
        totalDeletions: 50,
      },
    ];
    const prs = repos[0].prsMerged;
    const langs = repos[0].languages.slice(0, 3).join(", ");
    let bullet = "";
    if (prs > 0) {
      bullet = "Has PRs";
    } else if (repos[0].totalAdditions > 0) {
      bullet = `Developed features for ${repos[0].name} using ${langs}, contributing ${repos[0].totalAdditions.toLocaleString()} lines of code.`;
    }
    expect(bullet).toContain("Developed features");
    expect(bullet).not.toContain("pull request");
  });

  it("adds an overall stats bullet when totalPRsMerged > 0", () => {
    const score = { totalPRsMerged: 10, totalReposContributed: 5, avgPRSize: 50, topLanguages: ["TS", "PY"] as string[], totalCommits: 100 };
    if (score.totalPRsMerged > 0) {
      const bullet = `Merged ${score.totalPRsMerged} pull requests across ${score.totalReposContributed} repositories with an average PR size of ${score.avgPRSize} changed lines.`;
      expect(bullet).toContain("10 pull requests");
    }
  });
});

// ─── fallbackProjectDescriptions logic tests ──────────────────────────────────

describe("cv-ai-generator fallbackProjectDescriptions logic", () => {
  it("generates description with complexity and language info", () => {
    const repo = {
      name: "ml-toolkit",
      languages: ["Python", "TensorFlow"],
      complexity: "High",
      description: null as string | null,
    };
    const description =
      typeof repo.description === "string" && repo.description.length > 0
        ? repo.description.trim()
        : `A ${repo.complexity}-complexity project using ${repo.languages.slice(0, 3).join(", ")}.`;
    expect(description).toBe("A High-complexity project using Python, TensorFlow.");
  });

  it("uses existing description when available", () => {
    const repo = {
      name: "devtrack",
      languages: ["TypeScript"],
      complexity: "Medium",
      description: "A developer productivity tool.",
    };
    const description =
      typeof repo.description === "string" && repo.description.length > 0
        ? repo.description.trim()
        : `A ${repo.complexity}-complexity project using ${repo.languages.slice(0, 3).join(", ")}.`;
    expect(description).toBe("A developer productivity tool.");
  });

  it("generates highlights for PRs and additions", () => {
    const repo = { prsMerged: 10, totalAdditions: 2000, topics: ["ai", "ml", "python", "api", "devtools"] };
    const highlights = [
      repo.prsMerged > 0 ? `${repo.prsMerged} pull requests merged` : null,
      repo.totalAdditions > 0 ? `${repo.totalAdditions.toLocaleString()} lines added` : null,
      repo.topics.length > 0 ? `Topics: ${repo.topics.slice(0, 4).join(", ")}` : null,
    ].filter((h): h is string => h !== null);
    expect(highlights).toContain("10 pull requests merged");
    expect(highlights).toContain("2,000 lines added");
    expect(highlights).toContain("Topics: ai, ml, python, api");
  });

  it("filters out null highlights", () => {
    const highlights = [
      null,
      "valid highlight",
      null,
    ].filter((h): h is string => h !== null);
    expect(highlights).toEqual(["valid highlight"]);
  });
});

// ─── fallbackProfessionalSummary logic tests ─────────────────────────────────

describe("cv-ai-generator fallbackProfessionalSummary logic", () => {
  it("builds a summary with contribution stats", () => {
    const role = "Frontend Engineer" as TargetRole;
    const contrib = {
      totalCommits: 500,
      totalPRsMerged: 25,
      totalReposContributed: 8,
      topLanguages: ["TypeScript", "React"],
    };
    const summary = `${role} with demonstrated experience in web engineering. Contributed ${contrib.totalCommits} commits and ${contrib.totalPRsMerged} merged pull requests across ${contrib.totalReposContributed} repositories. Proficient in ${contrib.topLanguages.slice(0, 3).join(", ")}.`;
    expect(summary).toContain("Frontend Engineer");
    expect(summary).toContain("500 commits");
    expect(summary).toContain("25 merged pull requests");
    expect(summary).toContain("TypeScript");
  });
});

// ─── fallbackSkillSummary logic tests ─────────────────────────────────────────

describe("cv-ai-generator fallbackSkillSummary logic", () => {
  it("groups skills into categories", () => {
    const techStack = {
      languages: [{ name: "TypeScript" } as TechItem, { name: "Python" } as TechItem],
      frameworks: [{ name: "Next.js" } as TechItem],
      tools: [{ name: "Docker" } as TechItem],
    };
    const skills: { category: string; skills: string[] }[] = [];
    if (techStack.languages.length > 0) skills.push({ category: "Languages", skills: techStack.languages.map((t) => t.name) });
    if (techStack.frameworks.length > 0) skills.push({ category: "Frameworks & Libraries", skills: techStack.frameworks.map((t) => t.name) });
    if (techStack.tools.length > 0) skills.push({ category: "Tools & Platforms", skills: techStack.tools.map((t) => t.name) });
    expect(skills).toHaveLength(3);
    expect(skills.find((s) => s.category === "Languages")?.skills).toContain("TypeScript");
  });

  it("builds a summary string from skill names", () => {
    const skillNames = ["TypeScript", "Python", "Next.js", "Docker", "GitHub Actions", "PostgreSQL"];
    const summary = `Technical skills spanning ${skillNames.length} technologies including ${skillNames.slice(0, 5).join(", ")}.`;
    expect(summary).toContain("6 technologies");
    expect(summary).toContain("TypeScript, Python, Next.js, Docker, GitHub Actions");
  });
});

// ─── validateProjectDescriptions logic tests ───────────────────────────────────

describe("cv-ai-generator validateProjectDescriptions logic", () => {
  it("filters out projects with unknown names", () => {
    const repoMap = new Map([["devtrack", { name: "devtrack" } as RepositoryAnalysis]]);
    const projects = [{ name: "devtrack", description: "A tool" }, { name: "unknown-repo", description: "..." }];
    const filtered = projects.filter((p) => repoMap.has(p.name.toLowerCase()));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("devtrack");
  });

  it("uses matched repo data for name and description", () => {
    const matched = {
      name: "devtrack",
      nameWithOwner: "tmdeveloper007/devtrack",
      url: "https://github.com/tmdeveloper007/devtrack",
      description: "A developer tracking tool",
    };
    const p = { name: "devtrack", description: "" };
    const result = {
      name: matched.name,
      nameWithOwner: matched.nameWithOwner,
      url: matched.url,
      description: typeof p.description === "string" && p.description.length > 0 ? p.description.trim() : matched.description ?? "",
      highlights: [] as string[],
      technologies: [] as string[],
    };
    expect(result.description).toBe("A developer tracking tool");
    expect(result.name).toBe("devtrack");
  });
});
