import { describe, expect, it } from "vitest";
import {
  normalizeLearnWorldsApiUrl,
  resolveLearnWorldsRestBase,
  resolveLearnWorldsTokenUrl,
} from "@/lib/learnworlds/config";

describe("LearnWorlds URL normalization", () => {
  it("accepte l'URL dashboard .../admin/api", () => {
    const api = "https://www.woloyem.com/admin/api/";
    expect(normalizeLearnWorldsApiUrl(api)).toBe(
      "https://www.woloyem.com/admin/api",
    );
    expect(resolveLearnWorldsTokenUrl(api)).toBe(
      "https://www.woloyem.com/admin/api/oauth2/access_token",
    );
    expect(resolveLearnWorldsRestBase(api)).toBe(
      "https://www.woloyem.com/admin/api",
    );
  });

  it("accepte la homepage école", () => {
    const home = "https://www.woloyem.com";
    expect(resolveLearnWorldsTokenUrl(home)).toBe(
      "https://www.woloyem.com/admin/api/oauth2/access_token",
    );
    expect(resolveLearnWorldsRestBase(home)).toBe(
      "https://www.woloyem.com/admin/api",
    );
  });
});
