# Github Top Languages API

Deployable **GitHub language chart generator** — embeddable SVGs for READMEs and websites.

[![Tests](https://github.com/masonlet/github-top-languages-api/actions/workflows/tests.yml/badge.svg)](https://github.com/masonlet/github-top-languages-api/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)
![Node](https://img.shields.io/badge/Node.js-20+-green)

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
- [Usage](#usage)
- [Parameters](#customization-options)
- [Deployment & Configuration](#deployment--configuration)
  - [Prerequisites](#prerequisites)
  - [Configure `.env`](#configuration)
  - [Local Development](#running-locally)
  - [Deploying](#deployment)
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

### Customization Options
Append these query parameters to the URL to customize the look and data of your chart:

| Parameter    | Type    | Description | Default | Example |
| :---         | :---    | :--- | :--- | :--- |
| `theme`      | String  | Sets the colour scheme. Available options: `default`, `light`, `dark`. | `default`  | `?theme=dark` |
| `type`       | String  | Sets the chart type. Available options: `donut`, `pie`.                | `donut`    | `?type=pie`   |
| `title`      | String  | Sets a custom title for the chart.                   | `Top Languages` | `?title=My%20Code%20Stack` |
| `hide_title` | Boolean | Hides the chart title completely.                    | `false`         | `?hide_title=true`         |
| `text`       | String  | Sets the chart text colour. Accepts hex (`ffffff`).  | `#000000`       | `?text=ffffff`             |
| `bg`         | String  | Sets the chart background colour. Accepts hex (`ffffff`) or theme names (`dark`). | `default` | `?bg=dark` |
| `c1`-`c16`   | String  | Sets individual colours for languages 1-16. Accepts hex codes.  | Auto-assigned | `?c1=ff0000&c2=00ff00` |
| `count`      | Number  | Sets the maximum number of languages to display. Max is **16**. | `8`           | `?count=10`            |
| `width`      | Number  | Sets the width of the SVG in pixels.                            | `400`         | `?width=500`           |
| `height`     | Number  | Sets the height of the SVG in pixels.                           | `300`         | `?height=350`          |
| `stroke`     | Boolean | Adds an outline stroke to chart segments.                       | `false`       | `?stroke=true`         |
| `test`       | Boolean | Uses samples data instead of fetching from GitHub API.          | `false`       | `?test=true`           |
| `error`      | String  | Forces an error SVG with the given message. For testing only.   | —             | `?error=test`          |

#### Example URL
To get 10 languages, a dark theme, and a custom title:
```markdown
![My Custom Chart](https://your-deployment-url.vercel.app/api/languages?count=10&theme=dark&title=My%20Top%2010%20Languages)
```

## Deployment & Configuration

### Prerequisites
- Node.js 18+
- TypeScript 5.0+
- (Optional) Vercel or other Node.js hosting

### Installation
```bash
git clone https://github.com/masonlet/github-top-languages-api.git
cd github-top-languages-api
npm install
```

### Configuration
Copy `.env.example` to `.env`, and update the variables.
- `GITHUB_USERNAMES`: GitHub usernames to fetch repositories from. Accepts a plain string (`masonlet`), comma-separated (`masonlet,secondlet`), or a JSON array with optional per-user tokens (`["masonlet", {"name": "other", "token": "github_pat_..."}]`).
- `GITHUB_ORGS`: GitHub organization names to fetch repositories from. Accepts a plain string (`gh-top-languages`), comma-separated(`gh-top-languages,starweb-libs`), or a JSON array with optional per-org tokens (`["gh-top-languages", {"name": "starweb-libs", "token": "github_pat_..."}]`)
- `IGNORED_REPOS`: Optional comma-separated repo names to exclude from the chart.

### Running Locally
```bash
vercel dev
# Your endpoint will be available at https://localhost:3000/api/languages (or your configured port)
```

### Deployment

> The default endpoint is /api/languages

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/masonlet/github-top-languages-api&env=GITHUB_USERNAMES,GITHUB_ORGS,IGNORED_REPOS&envDescription[GITHUB_USERNAMES]=GitHub%20usernames%20to%20fetch%20repos%20from.%20See%20README%20for%20format.&envDescription[GITHUB_ORGS]=GitHub%20org%20names%20to%20fetch%20repos%20from.%20See%20README%20for%20format.&envDescription[IGNORED_REPOS]=Optional%20comma-separated%20repo%20names%20to%20exclude)

## Error Responses

All errors return HTTP 200 with an error SVG so they render in GitHub README embeds.

Common error messages:
- `GitHub API error: {status} {statusText}` — GitHub API request failed
- `No language data available` — no public repositories found
- `At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set` — missing environment configuration

## License
MIT License - see [LICENSE](./LICENSE) for details.
