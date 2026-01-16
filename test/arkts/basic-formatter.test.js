"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { formatWithBasicRulesText, detectComplexSyntax } = require("../../out/arkts/basicFormatter");

describe("ArkTS Basic Formatter (fallback)", () => {
    it("should detect complex syntax in test.ets", () => {
        const p = path.join(__dirname, "..", "test.ets");
        const code = fs.readFileSync(p, "utf8");
        assert.strictEqual(detectComplexSyntax(code), true);
    });

    it("should be idempotent for test/test.ets", () => {
        const p = path.join(__dirname, "..", "test.ets");
        const code = fs.readFileSync(p, "utf8");

        const eol = code.includes("\r\n") ? "\r\n" : "\n";
        const formatted = formatWithBasicRulesText(code, { eol, indent: "    " });
        assert.strictEqual(formatted, code);
    });
});
