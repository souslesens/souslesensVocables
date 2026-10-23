import { describe, expect, it } from "vitest";

import { pluginNamesForRepository } from "./Plugins";

describe("pluginNamesForRepository", () => {
    it("returns the activated plugins of a multi-plugin repository", () => {
        const names = pluginNamesForRepository({ url: "https://github.com/souslesens/multi.git", plugins: ["Alpha", "Beta"] });
        expect(names).toEqual(["Alpha", "Beta"]);
    });

    it("derives the plugin name from the URL for a single-plugin repository", () => {
        const names = pluginNamesForRepository({ url: "https://github.com/souslesens/alignment.git" });
        expect(names).toEqual(["alignment"]);
    });

    it("ignores a trailing slash and a query string", () => {
        expect(pluginNamesForRepository({ url: "https://github.com/souslesens/alignment.git/?ref=main" })).toEqual(["alignment"]);
    });

    it("returns an empty list when neither plugins nor url are set", () => {
        expect(pluginNamesForRepository({})).toEqual([]);
    });
});
