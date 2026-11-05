import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const demo = readFileSync(new URL("../docs/chat.html", import.meta.url), "utf8");
const home = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");

describe("WhatsApp-style static bot demo", () => {
  it("makes the chat demo the GitHub Pages entry point", () => {
    expect(home).toContain("url=./chat.html");
    expect(home).toContain('window.location.replace("./chat.html")');
  });

  it("includes a location-first conversation without backend credentials", () => {
    expect(demo).toContain("Which area would you like to find a room or house in?");
    for (const location of ["Tembisa", "Soweto", "Katlehong", "Mamelodi"]) {
      expect(demo).toContain(location);
    }
    expect(demo).toContain("Preview only.");
    expect(demo).toContain("not connected to WhatsApp or a live rentals database");
    expect(demo).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(demo).not.toContain("WHATSAPP_ACCESS_TOKEN");
  });

  it("contains syntactically valid chatbot JavaScript", () => {
    const script = demo.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script!)).not.toThrow();
  });
});
