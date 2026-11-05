/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { BRAND, BRAND_DARK, SPLASH_STATUS_BAR, rgbChannels } from "../app/utils/brand";

const css = readFileSync(new URL("../app/assets/css/tailwind.css", import.meta.url), "utf8");
const darkStart = css.indexOf(".dark {");
const darkBlock = css.slice(darkStart, css.indexOf("}", darkStart));

describe("BRAND", () => {
  it.each(Object.entries(BRAND))("%s matches its tailwind.css token", (name, hex) => {
    expect(css).toContain(`--color-${name}: ${hex};`);
  });
});

describe("BRAND_DARK", () => {
  it.each(Object.entries(BRAND_DARK))("%s matches its tailwind.css .dark token", (name, hex) => {
    expect(darkBlock).toContain(`--color-${name}: ${hex};`);
  });
});

describe("SPLASH_STATUS_BAR", () => {
  it("is halfway from brand-light to terracotta, the launch screen's top edge", () => {
    const token = (name: string) => css.match(new RegExp(`--color-${name}: (#[0-9a-f]{6});`))![1]!;
    const channels = (hex: string) => rgbChannels(hex).split(", ").map(Number);
    const [light, terracotta] = [channels(token("brand-light")), channels(token("terracotta"))];
    expect(channels(SPLASH_STATUS_BAR)).toEqual(
      light.map((value, i) => Math.round((value + terracotta[i]!) / 2)),
    );
  });
});

describe("rgbChannels", () => {
  it("turns a hex colour into rgba() channels", () => {
    expect(rgbChannels("#312528")).toBe("49, 37, 40");
  });
});
