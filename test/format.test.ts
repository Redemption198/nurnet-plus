import { describe, expect, it } from "vite-plus/test";
import { formatDistance } from "../app/utils/format";

describe("formatDistance", () => {
  it("gives metres up to a kilometre", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("gives kilometres, Italian style, from one kilometre", () => {
    expect(formatDistance(1000)).toBe("1 km");
    expect(formatDistance(4230)).toBe("4,2 km");
    expect(formatDistance(25_600)).toBe("25,6 km");
  });
});
