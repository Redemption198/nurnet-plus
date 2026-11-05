import { describe, expect, it } from "vite-plus/test";
import { CATEGORIES } from "../app/utils/categories";
import { markerForCategory, markerPriority } from "../app/utils/mapMarkers";

// A "match" expression as [input, [ids, value]..., fallback]
function matchArms(expression: unknown[]) {
  const [operator, , ...rest] = expression;
  expect(operator).toBe("match");
  const fallback = rest.pop();
  const arms: [string[], unknown][] = [];
  for (let i = 0; i < rest.length; i += 2) arms.push([rest[i] as string[], rest[i + 1]]);
  return { arms, fallback };
}

describe("markerPriority", () => {
  it("ranks every category once: a renamed one would get -1 and win over the landmarks", () => {
    const { arms, fallback } = matchArms(markerPriority);
    const ranks = [...arms.map(([, rank]) => rank), fallback];
    expect(ranks).toHaveLength(CATEGORIES.length);
    expect([...ranks].sort((a, b) => Number(a) - Number(b))).toEqual(CATEGORIES.map((_, i) => i));
  });

  it("puts the nuraghi first and the unknown sites last", () => {
    const { arms, fallback } = matchArms(markerPriority);
    expect(arms.find(([ids]) => ids.includes("10"))?.[1]).toBe(0);
    expect(fallback).toBe(CATEGORIES.length - 1);
  });
});

describe("markerForCategory", () => {
  it("has a marker for every category id, and the unknown one for the rest", () => {
    const { arms, fallback } = matchArms(markerForCategory);
    expect(arms.flatMap(([ids]) => ids).sort()).toEqual(
      CATEGORIES.flatMap((category) => category.ids).sort(),
    );
    expect(fallback).toBe(`marker-${CATEGORIES.length - 1}`);
  });
});
