import { describe, it, expect, vi } from "vitest";
import { completeJson } from "@/lib/json-completion";
import type { ChatCompleter, CompletionRequest } from "@/lib/openai";

/** A fake completer that returns each response in order (repeating the last). */
function sequenceCompleter(responses: string[]): ChatCompleter {
  let index = 0;
  return {
    model: "fake-model",
    complete: vi.fn(async (_req: CompletionRequest) => {
      const value = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return value ?? "";
    }),
  };
}

const request: CompletionRequest = { system: "sys", user: "do the thing", json: true };
const parse = (raw: string): { ok: boolean } => JSON.parse(raw) as { ok: boolean };

describe("completeJson", () => {
  it("returns the parsed value on a valid first response", async () => {
    const completer = sequenceCompleter(['{"ok":true}']);
    const result = await completeJson(completer, request, parse);
    expect(result.ok).toBe(true);
    expect(completer.complete).toHaveBeenCalledOnce();
  });

  it("retries once with a correction hint after a malformed response", async () => {
    const completer = sequenceCompleter(["not json at all", '{"ok":true}']);
    const result = await completeJson(completer, request, parse);

    expect(result.ok).toBe(true);
    expect(completer.complete).toHaveBeenCalledTimes(2);

    const secondCall = (completer.complete as ReturnType<typeof vi.fn>).mock.calls[1]![0];
    expect(secondCall.user).toContain("do the thing");
    expect(secondCall.user).toContain("Correction");
    expect(secondCall.system).toBe("sys");
    expect(secondCall.json).toBe(true);
  });

  it("throws the last parse error after exhausting attempts", async () => {
    const completer = sequenceCompleter(["nope", "still nope"]);
    await expect(completeJson(completer, request, parse)).rejects.toThrow();
    expect(completer.complete).toHaveBeenCalledTimes(2);
  });

  it("does not retry when maxAttempts is 1", async () => {
    const completer = sequenceCompleter(["nope"]);
    await expect(
      completeJson(completer, request, parse, { maxAttempts: 1 })
    ).rejects.toThrow();
    expect(completer.complete).toHaveBeenCalledOnce();
  });

  it("propagates completer errors without retrying", async () => {
    const completer: ChatCompleter = {
      model: "fake-model",
      complete: vi.fn(async () => {
        throw new Error("upstream is down");
      }),
    };
    await expect(completeJson(completer, request, parse)).rejects.toThrow(
      "upstream is down"
    );
    expect(completer.complete).toHaveBeenCalledOnce();
  });
});
