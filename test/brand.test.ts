import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { BRAND, rgbChannels } from "../app/utils/brand";

const css = readFileSync(new URL("../app/assets/css/tailwind.css", import.meta.url), "utf8");

describe("BRAND", () => {
  it.each(Object.entries(BRAND))("%s matches its tailwind.css token", (name, hex) => {
    expect(css).toContain(`--color-${name}: ${hex};`);
  });
});

describe("rgbChannels", () => {
  it("turns a hex colour into rgba() channels", () => {
    expect(rgbChannels("#312528")).toBe("49, 37, 40");
  });
});
