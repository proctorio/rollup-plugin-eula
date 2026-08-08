# rollup-plugin-eula

Stamps the copyright years into a license template at build time and writes the result into the build output. The tracked template is never modified.

Version 1.x rewrote the license file in place, which destroyed the `{{year}}` placeholder in any working tree that ran a build. Version 2 takes an explicit `input` template and `output` path instead, so the source file keeps its placeholders permanently and the stamped copy lands next to the other build artifacts.

## Installation

```bash
npm install rollup-plugin-eula
```

## Usage

```js
// rollup.config.js
import eula from "rollup-plugin-eula";

export default {
	plugins: [
		eula({
			input: "EULA.txt",                  // tracked template: "COPYRIGHT (C) {{startYear}}-{{year}} EXAMPLE INC."
			output: "_build/EULA.txt",          // stamped copy written here
			startYear: 2010
		})
	]
};
```

## Options

| Option      | Required | Description |
| ----------- | -------- | ----------- |
| `input`     | yes      | Path to the tracked license template. Must contain `{{year}}`; may contain `{{startYear}}`. |
| `output`    | yes      | Path to write the stamped license to. Must differ from `input`; parent directories are created. |
| `startYear` | no       | Value for the `{{startYear}}` placeholder. Required if the template uses it, rejected if it does not. |

Any misconfiguration or io failure throws and fails the build — a shipped artifact must never carry an unstamped or missing license.

The `renderLicense(template, startYear)` function is also exported for use outside rollup.

## Development

```
npm install
npm test        # vitest
npm run coverage
npm run lint
```
