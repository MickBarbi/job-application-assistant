/**
 * LaTeX rendering.
 *
 * Two responsibilities:
 *   1. `escapeLatex` — make arbitrary user/AI text safe to embed in LaTeX.
 *   2. `renderTemplate` — a small, dependency-free Mustache-style engine that
 *      fills a template body with resume data, escaping every interpolated
 *      value by default.
 *
 * Supported template syntax:
 *   {{var}}            interpolate an (escaped) string
 *   {{{var}}}          interpolate raw/pre-escaped content (use sparingly)
 *   {{#list}}...{{/list}}   repeat the block for each item in an array;
 *                            inside the block, {{.}} is the item and {{field}}
 *                            resolves against the item when it is an object
 *   {{#flag}}...{{/flag}}   render the block once if a value is truthy
 *   {{^flag}}...{{/flag}}   render the block if a value is falsy/empty
 *
 * The engine is intentionally minimal and total: unknown variables render as
 * empty strings rather than throwing, so a slightly-off template never crashes
 * PDF generation.
 */
import type { TailoredResumeData } from "@/lib/validation";

// Private-use-area sentinels. Characters that map to LaTeX *commands* (which
// themselves contain braces/backslashes) are swapped for these first, so the
// brace/backslash escaping cannot corrupt them, then restored last.
const S_BACKSLASH = String.fromCharCode(0xe000);
const S_TILDE = String.fromCharCode(0xe001);
const S_CIRCUM = String.fromCharCode(0xe002);

/**
 * Escapes characters that carry special meaning in LaTeX so arbitrary text can
 * be embedded safely. Ordering is handled via sentinels (see above).
 */
export function escapeLatex(input: string): string {
  if (!input) return "";
  return input
    .replace(/\\/g, S_BACKSLASH)
    .replace(/~/g, S_TILDE)
    .replace(/\^/g, S_CIRCUM)
    // Characters that only need a leading backslash.
    .replace(/([&%$#_{}])/g, "\\$1")
    // Normalise Unicode punctuation that a stock pdflatex chokes on.   is
    // a non-breaking space, mapped to a LaTeX tie (~); ordinary ASCII spaces
    // are deliberately left untouched.
    .replace(/ /g, "~")
    .replace(/–/g, "--") // en dash
    .replace(/—/g, "---") // em dash
    .replace(/[‘’]/g, "'") // curly single quotes
    .replace(/[“”]/g, '"') // curly double quotes
    // Restore command sentinels.
    .replace(new RegExp(S_BACKSLASH, "g"), "\\textbackslash{}")
    .replace(new RegExp(S_TILDE, "g"), "\\textasciitilde{}")
    .replace(new RegExp(S_CIRCUM, "g"), "\\textasciicircum{}");
}

type Ctx = Record<string, unknown>;

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  return true;
}

function lookup(ctx: Ctx, path: string): unknown {
  if (path === ".") return ctx["."];
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, ctx);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/**
 * Renders `template` against `context`. All `{{var}}` interpolations are
 * LaTeX-escaped; `{{{var}}}` interpolations are inserted verbatim.
 */
export function renderTemplate(template: string, context: Ctx): string {
  // Match a section and its matching close tag (same name), non-greedily.
  const sectionRe = /\{\{([#^])([\w.]+)\}\}([\s\S]*?)\{\{\/\2\}\}/;

  let output = template;

  // Resolve sections repeatedly until none remain. Nested sections are handled
  // by the recursive renderTemplate call on each block body.
  let guard = 0;
  while (sectionRe.test(output) && guard < 10_000) {
    guard += 1;
    output = output.replace(
      sectionRe,
      (_match, kind: string, name: string, body: string) => {
        const value = lookup(context, name);
        if (kind === "^") {
          return isTruthy(value) ? "" : renderTemplate(body, context);
        }
        // kind === "#"
        if (Array.isArray(value)) {
          return value
            .map((item) =>
              renderTemplate(body, {
                ...context,
                ".": item,
                ...(item && typeof item === "object" ? (item as Ctx) : {}),
              })
            )
            .join("");
        }
        if (isTruthy(value)) {
          return renderTemplate(body, context);
        }
        return "";
      }
    );
  }

  // Raw (unescaped) interpolation.
  output = output.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, name: string) =>
    stringify(lookup(context, name))
  );

  // Escaped interpolation.
  output = output.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, name: string) =>
    escapeLatex(stringify(lookup(context, name)))
  );

  return output;
}

/**
 * Builds the template context from tailored resume data. Arrays are passed
 * through as-is so `{{#experience}}...{{/experience}}` loops work, and a few
 * convenience flags/derived fields are added.
 */
export function buildResumeContext(data: TailoredResumeData): Ctx {
  return {
    ...data.contact,
    summary: data.summary,
    hasSummary: isTruthy(data.summary),
    skills: data.skills,
    skillsCsv: data.skills.join(", "),
    hasSkills: data.skills.length > 0,
    experience: data.experience,
    hasExperience: data.experience.length > 0,
    education: data.education,
    hasEducation: data.education.length > 0,
    projects: data.projects,
    hasProjects: data.projects.length > 0,
  };
}

/** Convenience: render a full resume from tailored data + a template body. */
export function renderResumeLatex(
  templateBody: string,
  data: TailoredResumeData
): string {
  return renderTemplate(templateBody, buildResumeContext(data));
}
