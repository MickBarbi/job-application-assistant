/**
 * Built-in defaults: a clean single-column LaTeX resume template and a sample
 * master resume. Used by the database seed and as a fallback in the UI.
 */
import type { MasterResumeData } from "@/lib/validation";

/**
 * A dependency-light LaTeX resume template using only `article` + built-in
 * packages, so it compiles with a stock pdflatex/tectonic install. Uses the
 * Mustache-style placeholders understood by `renderTemplate`.
 */
export const DEFAULT_TEMPLATE_BODY = String.raw`\documentclass[11pt]{article}
\usepackage[margin=0.9in]{geometry}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage[hidelinks]{hyperref}
\usepackage{parskip}

\titleformat{\section}{\large\bfseries}{}{0em}{}[\titlerule]
\titlespacing{\section}{0pt}{10pt}{4pt}
\setlist[itemize]{leftmargin=1.3em,itemsep=1pt,topsep=2pt}
\pagestyle{empty}

\begin{document}

\begin{center}
  {\LARGE \textbf{ {{name}} }}\\[2pt]
  {{#hasSummary}}{{/hasSummary}}
  {{email}}{{#phone}} \textbullet{} {{phone}}{{/phone}}{{#location}} \textbullet{} {{location}}{{/location}}\\
  {{#website}}\href{ {{website}} }{ {{website}} }{{/website}}{{#github}} \textbullet{} {{github}}{{/github}}{{#linkedin}} \textbullet{} {{linkedin}}{{/linkedin}}
\end{center}

{{#hasSummary}}
\section*{Summary}
{{summary}}
{{/hasSummary}}

{{#hasSkills}}
\section*{Skills}
{{skillsCsv}}
{{/hasSkills}}

{{#hasExperience}}
\section*{Experience}
{{#experience}}
\textbf{ {{title}} } \hfill {{startDate}}{{#endDate}} -- {{endDate}}{{/endDate}}\\
\textit{ {{company}} }{{#location}}, {{location}}{{/location}}
\begin{itemize}
{{#highlights}}\item {{.}}
{{/highlights}}\end{itemize}
{{/experience}}
{{/hasExperience}}

{{#hasProjects}}
\section*{Projects}
{{#projects}}
\textbf{ {{name}} }{{#url}} \textbullet{} \href{ {{url}} }{ {{url}} }{{/url}}\\
{{description}}
{{#highlights}}\begin{itemize}\item {{.}}\end{itemize}{{/highlights}}
{{/projects}}
{{/hasProjects}}

{{#hasEducation}}
\section*{Education}
{{#education}}
\textbf{ {{institution}} } \hfill {{startDate}}{{#endDate}} -- {{endDate}}{{/endDate}}\\
{{degree}}{{#field}}, {{field}}{{/field}}{{#details}}\\ {{details}}{{/details}}
{{/education}}
{{/hasEducation}}

\end{document}
`;

export const SAMPLE_MASTER_RESUME: MasterResumeData = {
  contact: {
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 010-2048",
    location: "San Francisco, CA",
    website: "https://alexrivera.dev",
    linkedin: "linkedin.com/in/alexrivera",
    github: "github.com/alexrivera",
  },
  summary:
    "Full-stack software engineer with 6 years building reliable web platforms. Comfortable across TypeScript, Node.js, and cloud infrastructure, with a track record of shipping features that move product metrics.",
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "AWS",
    "Docker",
    "GraphQL",
    "CI/CD",
  ],
  experience: [
    {
      company: "Northwind Labs",
      title: "Senior Software Engineer",
      location: "San Francisco, CA",
      startDate: "2021",
      endDate: "Present",
      highlights: [
        "Led the migration of a monolith to a modular service architecture, cutting p95 latency by 38%.",
        "Mentored four engineers and introduced a review checklist that reduced production incidents by 25%.",
        "Shipped a self-serve analytics dashboard used by 12,000 monthly active users.",
      ],
    },
    {
      company: "Cobalt Systems",
      title: "Software Engineer",
      location: "Remote",
      startDate: "2018",
      endDate: "2021",
      highlights: [
        "Built the billing service processing $4M/year with zero reconciliation errors.",
        "Automated deployment pipelines, reducing release time from hours to minutes.",
      ],
    },
  ],
  education: [
    {
      institution: "University of California, Berkeley",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2014",
      endDate: "2018",
      details: "",
    },
  ],
  projects: [
    {
      name: "OpenSchedule",
      description: "An open-source scheduling library for React.",
      techStack: "React, TypeScript",
      startDate: "2021",
      endDate: "Present",
      url: "github.com/alexrivera/openschedule",
      highlights: ["1.2k GitHub stars", "Used in production by several startups"],
    },
  ],
  leadership: [],
};
