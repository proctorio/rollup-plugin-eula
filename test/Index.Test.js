import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import eula, { renderLicense } from "../src/index.js";

let m_dir = null;

beforeEach(async() =>
{
	m_dir = await fs.mkdtemp(path.join(os.tmpdir(), "eula-test-"));
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2027-06-15"));
});

afterEach(async() =>
{
	vi.useRealTimers();
	await fs.rm(m_dir, {
		recursive: true,
		force: true
	});
});

/**
 * @description Writes a template file into the test dir.
 * @param {string} content - Template content.
 * @return {Promise<string>} Absolute path to the written template.
 */
async function writeTemplate(content)
{
	const FILE = path.join(m_dir, "eula.txt");
	await fs.writeFile(FILE, content, "utf8");

	return FILE;
}

describe("renderLicense()", function()
{
	it("Should substitute the current year", function()
	{
		expect(renderLicense("COPYRIGHT (C) {{year}} EXAMPLE INC.")).toBe("COPYRIGHT (C) 2027 EXAMPLE INC.");
	});

	it("Should substitute the start year when provided", function()
	{
		expect(renderLicense("COPYRIGHT (C) {{startYear}}-{{year}} EXAMPLE INC.", 2013)).toBe("COPYRIGHT (C) 2013-2027 EXAMPLE INC.");
	});

	it("Should substitute every occurrence", function()
	{
		expect(renderLicense("{{startYear}}-{{year}} and again {{startYear}}-{{year}}", 2013)).toBe("2013-2027 and again 2013-2027");
	});

	it("Should throw when the template has no year placeholder", function()
	{
		expect(() => renderLicense("COPYRIGHT (C) 2013-2026 EXAMPLE INC.")).toThrow(/no \{\{year\}\} placeholder/u);
	});

	it("Should throw when startYear is provided without a placeholder for it", function()
	{
		expect(() => renderLicense("COPYRIGHT (C) {{year}} EXAMPLE INC.", 2013)).toThrow(/no \{\{startYear\}\} placeholder/u);
	});

	it("Should throw when the template expects a startYear that was not provided", function()
	{
		expect(() => renderLicense("COPYRIGHT (C) {{startYear}}-{{year}} EXAMPLE INC.")).toThrow(/no startYear option/u);
	});
});

describe("eula()", function()
{
	it("Should require input and output", function()
	{
		expect(() => eula()).toThrow(/input and output options are required/u);
		expect(() => eula({ input: "a.txt" })).toThrow(/input and output options are required/u);
		expect(() => eula({ output: "b.txt" })).toThrow(/input and output options are required/u);
	});

	it("Should refuse to overwrite the tracked template", function()
	{
		expect(() => eula({
			input: "docs/eula.txt",
			output: "./docs/../docs/eula.txt"
		})).toThrow(/Refusing to overwrite the tracked template/u);
	});

	it("Should write the stamped license to the output path and leave the template untouched", async function()
	{
		const TEMPLATE = "COPYRIGHT (C) {{startYear}}-{{year}} EXAMPLE INC.";
		const INPUT = await writeTemplate(TEMPLATE);
		const OUTPUT = path.join(m_dir, "build", "eula.txt");

		await eula({
			input: INPUT,
			output: OUTPUT,
			startYear: 2013
		}).buildEnd();

		expect(await fs.readFile(OUTPUT, "utf8")).toBe("COPYRIGHT (C) 2013-2027 EXAMPLE INC.");
		expect(await fs.readFile(INPUT, "utf8")).toBe(TEMPLATE);
	});

	it("Should create the output directory when missing", async function()
	{
		const INPUT = await writeTemplate("{{year}}");
		const OUTPUT = path.join(m_dir, "deep", "nested", "dir", "eula.txt");

		await eula({
			input: INPUT,
			output: OUTPUT
		}).buildEnd();

		expect(await fs.readFile(OUTPUT, "utf8")).toBe("2027");
	});

	it("Should fail the build when the template is missing", async function()
	{
		const PLUGIN = eula({
			input: path.join(m_dir, "does-not-exist.txt"),
			output: path.join(m_dir, "out.txt")
		});

		await expect(PLUGIN.buildEnd()).rejects.toThrow(/ENOENT/u);
	});

	it("Should fail the build when the template has no placeholder", async function()
	{
		const INPUT = await writeTemplate("COPYRIGHT (C) 2013-2026 EXAMPLE INC.");
		const PLUGIN = eula({
			input: INPUT,
			output: path.join(m_dir, "out.txt")
		});

		await expect(PLUGIN.buildEnd()).rejects.toThrow(/no \{\{year\}\} placeholder/u);
	});
});
