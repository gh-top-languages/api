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
- Generates a chart of your top programming languages (up to 16).
- **Customizable:** Control the title, size, theme, and number of languages displayed.
    - **Theming**: Supports `default`, `light`, and `dark` themes.
    - **Custom Colours**: Set background (`bg`), text (`text`), and individual language colours (`c1`-`c16`) via query parameters. 
- **Dynamic Layout:** The legend automatically shifts to a **two-column layout** when displaying 9 or more languages.
- Automatically fetches all public GitHub repositories, and private repositories with a token.
- Ignores forks and optionally specific repositories (`IGNORED_REPOS`).
- Uses **hourly caching** to reduce API calls and improve performance.

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
Copy `.env.example` to `.env`, and update the variables.
- `GITHUB_USERNAMES`: GitHub usernames to fetch repositories from. Accepts a single value (`masonlet`), comma-separated (`masonlet,secondlet`), or a JSON array with optional per-user tokens (`["masonlet", {"name": "other", "token": "github_pat_..."}]`).
- `GITHUB_ORGS`: GitHub organization names to fetch repositories from. Accepts a single value (`gh-top-languages`), comma-separated (`gh-top-languages,starweb-libs`), or a JSON array with optional per-org tokens (`["gh-top-languages", {"name": "starweb-libs", "token": "github_pat_..."}]`)
- `IGNORED_REPOS`: Optional comma-separated repo names to exclude from the chart.

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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gh-top-languages/api&env=GITHUB_USERNAMES,GITHUB_ORGS,IGNORED_REPOS&envDescription=GITHUB_USERNAMES%20and%2For%20GITHUB_ORGS%3A%20GitHub%20users%2Forgs%20to%20fetch%20repos%20from.%20IGNORED_REPOS%3A%20optional%20comma-separated%20repo%20names%20to%20exclude.&envLink=https%3A%2F%2Fgithub.com%2Fgh-top-languages%2Fapi%23configuration)

## Error Responses

All errors return HTTP 200 with an error SVG so they render in GitHub README embeds.

Common error messages:
- `GitHub API error: {status} {statusText}` — GitHub API request failed
- `No language data available` — no public repositories found
- `At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set` — missing environment configuration

## License
MIT License - see [LICENSE](./LICENSE) for details.
