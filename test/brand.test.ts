/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { BRAND, BRAND_DARK, rgbChannels } from "../app/utils/brand";

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

describe("rgbChannels", () => {
  it("turns a hex colour into rgba() channels", () => {
    expect(rgbChannels("#312528")).toBe("49, 37, 40");
  });
});
