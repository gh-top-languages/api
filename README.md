# GitHub Top Languages API

Deployable **GitHub language chart generator** — embeddable SVGs for READMEs and websites.

[![CI](https://github.com/gh-top-languages/api/actions/workflows/ci.yml/badge.svg)](https://github.com/gh-top-languages/api/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node.js-22+-green)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

![Example 8 Top Languages Chart](images/default8.png)

<details>
  <summary>More Examples</summary>

  **16 Languages**
  ![Example 16 Top Languages Chart](images/default16.png)

  **Dark Theme**
  ![Dark Theme](images/pie-dark.png)

  **Light Theme**
  ![Light Theme](images/pie-light.png)

  **Default Theme**
  ![Default Theme](images/pie.png)
</details>

## Table of Contents
- [Features](#features)
- [Customize Your Charts](#customize-your-charts)
- [Usage](#usage)
- [Parameters](#parameter-options)
- [Library](#library)
- [Deployment & Configuration](#deployment--configuration)
  - [Prerequisites](#prerequisites)
  - [Configure `.env`](#configuration)
  - [Local Development](#running-locally)
  - [Deploying](#deployment)
- [Error Responses](#error-responses)
- [License](#license)

## Features
- **Generates a chart of your top programming languages (up to 16).**
- **Customizable:** Control the title, size, theme, and number of languages displayed.
    - **Theming**: Supports `default`, `light`, and `dark` themes.
    - **Custom Colours**: Set background (`bg`), text (`text`), and individual language colours (`c1`-`c16`) via query parameters. 
- **Dynamic Layout:** The legend automatically shifts to a **two-column layout** when displaying 9 or more languages.
- **Automatically fetches GitHub repositories:** Public user and organization sources are automatically fetched; private repos can be fetched if tokens have access (personal mode only).
- **Hosted instances:** Serve charts for others via `?source=` — an enumerated allowlist, or `*` for any GitHub account. Hosted modes fetch public repos only.
- **Global Token:** Optional deployment-wide default token, applied to any source without its own `token`, boosting limits from 60 req/hr to 5,000/hr.
- **Hourly caching**: Used to reduce API calls and improve performance. On fetch failure the last good chart is served and refresh retries after either 5 minutes, or when GitHub rate-limit timer resets.
- **Automatically ignores forks**.
- **Ignored repositories**: Repos ignored via optional (`IGNORED_REPOS`) env var.
- **Preview-only deployments:** Optional `ALLOWED_REFERERS` restricts rendering to your own site — blocks README embeds and hotlinking.

## Customize Your Charts
Prefer a visual workflow? Use the [@gh-top-languages/builder](https://github.com/gh-top-languages/builder) to preview themes, colours, and layout options interactively, then easily copy the generated embed URL to quickly deploy.

## Usage

### Markdown (For READMEs)
```markdown
![Top Languages](https://your-deployment-url.vercel.app/api/languages)
```

### HTML (For Websites)
```html
<img 
  src="https://your-deployment-url.vercel.app/api/languages" 
  alt="My Top Programming Languages" 
/>
```

### Parameter Options
#### API-Only Parameters
| Parameter | Type    | Description | Default | Example |
| :---      | :---    | :--- | :--- | :--- |
| `test`    | Boolean | Uses sample data instead of fetching from GitHub API. | `false` | `?test=true` |
| `error`   | String  | Forces an error SVG with the given message. For testing only. | — | `?error=test` |
| `source`  | String  | Hosted instances only: comma-separated GitHub account names to chart (max 10 when `GITHUB_ALLOWED_SOURCES=*`). | — | `?source=torvalds,rails` |

#### Query Parameters
Full parameter reference lives in the [lib README](https://github.com/gh-top-languages/lib#query-parameters).

## Library
Chart rendering, theming, and parameter parsing are powered by [@gh-top-languages/lib](https://github.com/gh-top-languages/lib).

## Deployment & Configuration

### Prerequisites
- Node.js 22+

### Installation
```bash
git clone https://github.com/gh-top-languages/api.git
cd api
npm install
```

### Configuration
Copy `.env.example` to `.env`, and update the variables. Configure exactly one mode: **Personal** or **Hosted**.

#### Global
- `IGNORED_REPOS`: Optional comma-separated repo names to exclude from the chart. Accepts a bare name (`repo`, excluded from all sources) or `owner/name` (`org/repo`, scoped to one source).
- `GITHUB_TOKEN`: Optional deployment-wide default token, applied to any source without its own `token`. A per-source token always takes precedence; the global token only authenticates public repos (no private repos) while boosting limits (5,000 req/hr instead of 60/hr).
- `ALLOWED_REFERERS`: Optional comma-separated hostnames. When set, charts render only for requests whose `Origin`/`Referer` hostname matches: for preview-only deployments (e.g. serving a builder site). Blocks README embeds, hotlinks, and direct navigation.

#### Personal
- `GITHUB_USERNAMES`: GitHub usernames to fetch repositories from. Accepts a single value (`masonlet`), comma-separated (`masonlet,secondlet`), or a JSON array with optional per-user tokens (`["masonlet", {"name": "other", "token": "github_pat_..."}]`).
- `GITHUB_ORGS`: GitHub organization names to fetch repositories from. Accepts a single value (`gh-top-languages`), comma-separated (`gh-top-languages,starweb-libs`), or a JSON array with optional per-org tokens (`["gh-top-languages", {"name": "starweb-libs", "token": "github_pat_..."}]`)

#### Hosted
- `GITHUB_ALLOWED_SOURCES`: Comma-separated account names selectable via `?source=` (bare URL renders their combined chart), or `*` to allow any GitHub account (`?source=` required, max 10 names per request). Hosted instances chart **public repositories only**; per-source tokens don't exist in this mode. **Warning:** with `*`, anyone can use your instance, and every request they make spends your GITHUB_TOKEN's rate limit.

### Running Locally
Your endpoint will be available at http://localhost:3000/api/languages (or your configured PORT)

```bash
# Build and serve node:http server
npm start

# Serve vercel serverless endpoint (requires Vercel CLI).
vercel dev
```

### Deployment

Builds to `dist/` and runs a plain `node:http` server. Requires a configured `.env` (or use ?test=true for sample data).

> The default endpoint is /api/languages

Any **Node.js** host: the server is a standalone `node:http` entry:
```bash
npm start
```

Or, deploy with Vercel:
**Personal** instance (your own chart):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gh-top-languages/api&env=GITHUB_USERNAMES&envDescription=Your%20GitHub%20username%28s%29%2C%20comma-separated.%20Optional%20vars%20%28GITHUB_ORGS%2C%20GITHUB_TOKEN%2C%20IGNORED_REPOS%29%20are%20documented%20at%20the%20link%20and%20can%20be%20added%20in%20Vercel%20project%20settings.&envLink=https%3A%2F%2Fgithub.com%2Fgh-top-languages%2Fapi%23configuration)

**Hosted** instance (serve charts for others via `?source=`):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gh-top-languages/api&env=GITHUB_ALLOWED_SOURCES&envDescription=Account%20names%20to%20allow%2C%20comma-separated%2C%20or%20*%20for%20any%20account.%20Strongly%20recommended%3A%20add%20GITHUB_TOKEN%20in%20Vercel%20settings%20%28*%20mode%20is%20nearly%20unusable%20at%2060%20req%2Fhr%20without%20one%29.%20See%20link%20for%20all%20options.&envLink=https%3A%2F%2Fgithub.com%2Fgh-top-languages%2Fapi%23configuration)

## Error Responses

All errors return HTTP 200 with an error SVG so they render in GitHub README embeds.

Common error messages:
- `Set GITHUB_USERNAMES/GITHUB_ORGS, or GITHUB_ALLOWED_SOURCES for a hosted instance`: missing environment configuration
- `GITHUB_ALLOWED_SOURCES cannot be combined with GITHUB_USERNAMES/GITHUB_ORGS`: both modes configured at once
- `Source selection is not enabled on this instance` / `Unknown or disallowed source` / `Invalid source name` / `Too many sources`: bad `?source=` request; these are CDN-cached for 5 minutes
- `Unknown GitHub account`: `?source=` named an account that doesn't exist (cached 10 minutes)
- `This instance only serves its own site - deploy your own from github.com/gh-top-languages/api`: request blocked by `ALLOWED_REFERERS` (cached 5 minutes)
- `GITHUB_USERNAMES/GITHUB_ORGS must be a valid JSON array. Check your configuration.`: malformed JSON array in env config
- `GitHub API error: {status} {statusText}`: GitHub API request failed
- `No language data available`: no public repositories found
- Rate limiting (`403`/`429` with exhausted quota) is detected separately and logged as `GitHub rate limit exceeded; resets at HH:MM:SS`; the cached chart is served until the reset.

## License
MIT License - see [LICENSE](./LICENSE) for details.
