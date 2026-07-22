import { describe, it, expect } from "vitest";
import {
  escapeLatex,
  renderTemplate,
  renderResumeLatex,
} from "@/lib/resume/latex";
import type { TailoredResumeData } from "@/lib/validation";

describe("escapeLatex", () => {
  it("escapes LaTeX special characters", () => {
    expect(escapeLatex("50% & rising")).toBe("50\\% \\& rising");
    expect(escapeLatex("a_b#c")).toBe("a\\_b\\#c");
    expect(escapeLatex("$100")).toBe("\\$100");
    expect(escapeLatex("{braces}")).toBe("\\{braces\\}");
  });

  it("handles backslashes without double-escaping the replacement", () => {
    expect(escapeLatex("a\\b")).toBe("a\\textbackslash{}b");
  });

  it("normalises smart punctuation", () => {
    expect(escapeLatex("“quoted”")).toBe('"quoted"');
    expect(escapeLatex("dash–dash")).toBe("dash--dash");
    expect(escapeLatex("em—dash")).toBe("em---dash");
  });

  it("does not turn ordinary spaces into ties", () => {
    expect(escapeLatex("a b c")).toBe("a b c");
  });

  it("returns empty string for empty input", () => {
    expect(escapeLatex("")).toBe("");
  });
});

describe("renderTemplate", () => {
  it("interpolates and escapes variables", () => {
    expect(renderTemplate("Hi {{name}}", { name: "A&B" })).toBe("Hi A\\&B");
  });

  it("supports raw (triple-brace) interpolation", () => {
    expect(renderTemplate("{{{raw}}}", { raw: "\\bf" })).toBe("\\bf");
  });

  it("renders array sections and {{.}}", () => {
    const out = renderTemplate("{{#items}}[{{.}}]{{/items}}", {
      items: ["a", "b"],
    });
    expect(out).toBe("[a][b]");
  });

  it("renders object arrays with field access", () => {
    const out = renderTemplate("{{#rows}}{{k}};{{/rows}}", {
      rows: [{ k: "x" }, { k: "y" }],
    });
    expect(out).toBe("x;y;");
  });

  it("handles truthy conditional sections", () => {
    expect(renderTemplate("{{#on}}yes{{/on}}", { on: true })).toBe("yes");
    expect(renderTemplate("{{#on}}yes{{/on}}", { on: false })).toBe("");
    expect(renderTemplate("{{#on}}yes{{/on}}", { on: [] })).toBe("");
  });

  it("handles inverted sections", () => {
    expect(renderTemplate("{{^empty}}none{{/empty}}", { empty: [] })).toBe(
      "none"
    );
    expect(renderTemplate("{{^empty}}none{{/empty}}", { empty: [1] })).toBe("");
  });

  it("renders unknown variables as empty strings (total)", () => {
    expect(renderTemplate("[{{missing}}]", {})).toBe("[]");
  });

  it("supports nested sections", () => {
    const out = renderTemplate(
      "{{#groups}}{{name}}:{{#tags}}{{.}},{{/tags}} {{/groups}}",
      { groups: [{ name: "g1", tags: ["a", "b"] }] }
    );
    expect(out).toBe("g1:a,b, ");
  });
});

describe("renderResumeLatex", () => {
  const data: TailoredResumeData = {
    contact: {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555",
      location: "NYC",
      website: "",
      linkedin: "",
      github: "",
    },
    summary: "A summary with 100% effort.",
    skills: ["TypeScript", "React"],
    experience: [
      {
        company: "Acme",
        title: "Engineer",
        location: "NYC",
        startDate: "2020",
        endDate: "2023",
        highlights: ["Did a thing", "Did another"],
      },
    ],
    education: [],
    projects: [],
    rationale: "test",
  };

  it("produces LaTeX containing escaped, tailored content", () => {
    const tex = renderResumeLatex(
      "{{name}}|{{summary}}|{{skillsCsv}}|{{#experience}}{{title}}@{{company}}{{/experience}}",
      data
    );
    expect(tex).toContain("Jane Doe");
    expect(tex).toContain("100\\% effort");
    expect(tex).toContain("TypeScript, React");
    expect(tex).toContain("Engineer@Acme");
  });

  it("omits sections that are empty via has-flags", () => {
    const tex = renderResumeLatex(
      "{{#hasProjects}}PROJECTS{{/hasProjects}}{{#hasSkills}}SKILLS{{/hasSkills}}",
      data
    );
    expect(tex).not.toContain("PROJECTS");
    expect(tex).toContain("SKILLS");
  });
});
