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
    expect(demo).toContain('placeholder="Type Hi to start…"');
    expect(demo).toContain("Hi! Welcome to Kasi Rentals");
    expect(demo).toContain("Please choose your preferred location from the dropdown below.");
    expect(demo).toContain("Choose an available location");
    expect(demo).toContain("Show rentals");
    for (const location of ["Tembisa", "Soweto", "Katlehong", "Mamelodi"]) {
      expect(demo).toContain(location);
    }
    for (const suburb of ["Ebony Park", "Ivory Park", "Birch Acres", "Kaalfontein"]) {
      expect(demo).toContain(suburb);
    }
    expect(demo).toContain("Choose a suburb in Tembisa");
    expect(demo).toContain("https://aluwani99.github.io/kasi-rentals-dashboard/");
    expect(demo).toContain("Ask an agent");
    expect(demo).toContain("Thandi Mokoena");
    expect(demo).toContain("27602671468");
    expect(demo).toContain("Hi Thandi, I'm interested in");
    expect(demo).toContain("https://wa.me/");
    expect(demo).toContain("See all photos & details");
    for (const listingId of [
      "ebony-room-1", "ebony-room-2", "ivory-room-1", "birch-room-1",
      "kaalfontein-room-1", "soweto-room-1", "katlehong-house-1", "mamelodi-room-1"
    ]) {
      expect(demo).toContain(listingId);
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

  it("provides a specific listing detail page with photo gallery and agent WhatsApp link", () => {
    const detail = readFileSync(new URL("../docs/rental.html", import.meta.url), "utf8");
    expect(demo).toContain("./rental.html?listing=${encodeURIComponent(listing.id)}");
    expect(detail).toContain('new URLSearchParams(window.location.search).get("listing")');
    expect(detail).toContain('className = "gallery"');
    expect(detail).toContain("for (const [index, src] of listing.images.entries())");
    expect(detail).toContain("https://wa.me/${agentNumber}?text=");
    expect(detail).toContain('href = dashboardUrl');
    const script = detail.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script!)).not.toThrow();
  });
});
