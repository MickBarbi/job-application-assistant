/**
 * Pure helpers for editing repeatable master-resume form sections.
 *
 * The Settings UI keeps its state in the Zod-inferred MasterResumeData shape;
 * these helpers make add/remove/update behavior reusable and easy to test.
 */
import type {
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
} from "@/lib/validation";

export function replaceAt<T>(items: T[], index: number, next: T): T[] {
  return items.map((item, currentIndex) => (currentIndex === index ? next : item));
}

export function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_item, currentIndex) => currentIndex !== index);
}

export function appendItem<T>(items: T[], item: T): T[] {
  return [...items, item];
}

export function multilineToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function listToMultiline(items: string[]): string {
  return items.join("\n");
}

export function emptyExperience(): ResumeExperience {
  return {
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    highlights: [],
  };
}

export function emptyEducation(): ResumeEducation {
  return {
    institution: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    details: "",
  };
}

export function emptyProject(): ResumeProject {
  return {
    name: "",
    description: "",
    techStack: "",
    startDate: "",
    endDate: "",
    url: "",
    highlights: [],
  };
}
