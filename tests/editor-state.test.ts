import { describe, expect, it } from "vitest";
import {
  appendItem,
  emptyExperience,
  listToMultiline,
  multilineToList,
  removeAt,
  replaceAt,
} from "@/lib/resume/editor-state";

describe("resume editor state helpers", () => {
  it("replaces, appends, and removes immutable list items", () => {
    const original = ["a", "b", "c"];

    expect(replaceAt(original, 1, "B")).toEqual(["a", "B", "c"]);
    expect(appendItem(original, "d")).toEqual(["a", "b", "c", "d"]);
    expect(removeAt(original, 0)).toEqual(["b", "c"]);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("normalizes multiline text into non-empty trimmed list entries", () => {
    expect(multilineToList(" TypeScript  \n\n React\n ")).toEqual([
      "TypeScript",
      "React",
    ]);
    expect(listToMultiline(["TypeScript", "React"])).toBe("TypeScript\nReact");
  });

  it("creates empty experience objects in the schema shape", () => {
    expect(emptyExperience()).toEqual({
      company: "",
      title: "",
      location: "",
      startDate: "",
      endDate: "",
      highlights: [],
    });
  });
});
