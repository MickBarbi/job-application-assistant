import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const ORIGINAL_TOKEN = process.env.APP_AUTH_TOKEN;

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.APP_AUTH_TOKEN;
  } else {
    process.env.APP_AUTH_TOKEN = ORIGINAL_TOKEN;
  }
});

describe("optional auth middleware", () => {
  it("allows requests when APP_AUTH_TOKEN is not set", () => {
    delete process.env.APP_AUTH_TOKEN;

    const response = middleware(new NextRequest("http://test/jobs"));

    expect(response.status).not.toBe(401);
  });

  it("requires authentication when APP_AUTH_TOKEN is set", () => {
    process.env.APP_AUTH_TOKEN = "secret";

    const response = middleware(new NextRequest("http://test/jobs"));

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Basic");
  });

  it("accepts bearer and basic credentials", () => {
    process.env.APP_AUTH_TOKEN = "secret";

    const bearer = middleware(new NextRequest("http://test/jobs", {
      headers: { Authorization: "Bearer secret" },
    }));
    const basic = middleware(new NextRequest("http://test/jobs", {
      headers: { Authorization: `Basic ${btoa("user:secret")}` },
    }));

    expect(bearer.status).not.toBe(401);
    expect(basic.status).not.toBe(401);
  });
});
