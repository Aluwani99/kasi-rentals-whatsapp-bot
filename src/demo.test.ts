import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const demo = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");

describe("static GitHub Pages demo", () => {
  it("includes sample listings and location-first options without backend credentials", () => {
    expect(demo).toContain("Choose your location");
    for (const location of ["Tembisa", "Soweto", "Katlehong", "Mamelodi"]) {
      expect(demo).toContain(location);
    }
    expect(demo).toContain("Sample listings are fictional");
    expect(demo).toContain("not WhatsApp");
    expect(demo).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(demo).not.toContain("WHATSAPP_ACCESS_TOKEN");
  });

  it("contains syntactically valid inline JavaScript", () => {
    const script = demo.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script!)).not.toThrow();
  });
});
