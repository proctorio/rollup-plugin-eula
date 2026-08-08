import fs from "node:fs/promises";
import path from "node:path";

// Rollup plugin that stamps the current (and optionally the start) year into a license text
// template and writes the result into the build output. The tracked template is never modified -
// the 1.x versions rewrote the file in place, which destroyed the {{year}} placeholder in any
// working tree that ran a build, so the stamped file now always lands next to the other build
// artifacts instead.

/**
 * @description Substitutes the year placeholders in a license template.
 * @param {string} template - Template text containing {{year}} and optionally {{startYear}}.
 * @param {number|string} [startYear] - Value for the {{startYear}} placeholder.
 * @return {string} Substituted text.
 */
export function renderLicense(template, startYear)
{
	if (!template.includes("{{year}}"))
	{
		throw new Error("[eula] The license template has no {{year}} placeholder - nothing to stamp.");
	}

	let rendered = template.replaceAll("{{year}}", new Date().getFullYear());

	const HAS_START_PLACEHOLDER = rendered.includes("{{startYear}}");
	if (startYear === null || typeof startYear === "undefined")
	{
		if (HAS_START_PLACEHOLDER)
		{
			throw new Error("[eula] The template has a {{startYear}} placeholder but no startYear option was provided.");
		}
	}
	else
	{
		if (!HAS_START_PLACEHOLDER)
		{
			throw new Error("[eula] startYear was provided but the template has no {{startYear}} placeholder.");
		}

		rendered = rendered.replaceAll("{{startYear}}", startYear);
	}

	return rendered;
}

/**
 * @description Rollup plugin that reads a license template, stamps the year placeholders and
 * writes the result to the build output. Any misconfiguration or io failure throws, failing the
 * build - a shipped artifact must never carry an unstamped or missing license.
 * @param {Object} options - Plugin options.
 * @param {string} options.input - Path to the tracked license template (contains {{year}}, optionally {{startYear}}).
 * @param {string} options.output - Path to write the stamped license to (inside the build output).
 * @param {number|string} [options.startYear] - Value for the {{startYear}} placeholder.
 * @return {Object} Rollup plugin.
 */
export default function eula(options)
{
	const { input, output, startYear } = options || {};

	if (!input || !output)
	{
		throw new Error("[eula] Both the input and output options are required.");
	}

	if (path.resolve(input) === path.resolve(output))
	{
		throw new Error("[eula] Refusing to overwrite the tracked template - output must differ from input.");
	}

	return {
		name: "eula",

		/**
		 * @description Stamps and writes the license once the bundle finishes; a rejection here
		 * fails the build.
		 */
		async buildEnd()
		{
			const TEMPLATE = await fs.readFile(input, "utf8");
			const RENDERED = renderLicense(TEMPLATE, startYear);

			await fs.mkdir(path.dirname(output), { recursive: true });
			await fs.writeFile(output, RENDERED, "utf8");
		}
	};
}
