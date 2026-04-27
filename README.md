# Wendy Snacks

A lightweight, general-purpose command-line web bot built with Node.js. Given a URL, it fetches the page, logs structured output, and passes the response through a plugin pipeline for further processing.

## Requirements

- Node.js >= 12.0.0 (ESM module support required)
- npm

## Installation

```bash
git clone <repo-url>
cd wendy-snacks
npm install
```

## Configuration

Configuration lives in `config/default.json`:

```json
{
  "userAgent": "wendy-snacks/0.1.0",
  "timeoutMs": 10000,
  "maxRedirects": 5
}
```

| Field | Description | Default |
|-------|-------------|---------|
| userAgent | HTTP User-Agent header sent with every request | wendy-snacks/0.1.0 |
| timeoutMs | Request timeout in milliseconds | 10000 |
| maxRedirects | Maximum number of HTTP redirects to follow | 5 |

## Usage

As a CLI command (after `npm install -g .` or `npm link`):

```bash
wendy <url>
```

Directly with Node:

```bash
node src/cli.js <url>
```

Example:

```bash
wendy https://example.com
```

## Output

Each run prints a single line of JSON to stdout:

On success:

```json
{
  "timestamp": "2026-04-27T10:00:00.000Z",
  "url": "https://example.com",
  "statusCode": 200,
  "responseLength": 1256,
  "durationMs": 342
}
```

On failure:

```json
{
  "timestamp": "2026-04-27T10:00:00.000Z",
  "url": "https://example.com",
  "error": "connect ECONNREFUSED",
  "durationMs": 5001
}
```

## Plugins

Wendy supports a plugin system. Any .js file placed in the `plugins/` directory will be automatically loaded and executed against the response body after each successful fetch.

A plugin must have a default export that is a function accepting `(html, url)`:

```javascript
// plugins/my-plugin.js
export default function (html, url) {
  console.log(`Got ${typeof html} from ${url}`);
}
```

Plugins are loaded in filesystem order. If `plugins/` does not exist or is empty, the bot runs normally with no plugin processing.

## Project Structure

```
wendy-snacks/
├── src/
│   ├── cli.js        Entry point for CLI usage
│   ├── wendy.js      Core fetch logic and plugin orchestration
│   └── plugins.js    Plugin loader and runner
├── config/
│   └── default.json  Runtime configuration
├── plugins/          Drop .js plugin files here
├── package.json
└── README.md
```

## Dependencies

- axios — HTTP client

## Notes

- The `plugins/` directory must exist even if empty, or the app will crash on startup with an ENOENT error.
- The `config/` directory and `default.json` must be present before running — the app will crash immediately if the config file is missing or malformed.