# GWAS.tools - GitHub Gist Logging System

A lightweight, serverless logging system for GWAS projects using GitHub Gists as
storage.

## Overview

GWAS.tools provides a complete logging system with two main components:

1. **Logger Script (`gist-logger.ts`)**: A Deno script that creates and updates
   a GitHub Gist with CSV-formatted logs
2. **Log Viewer**: A web interface for viewing, filtering, and analyzing the
   logs stored in the Gist

This approach offers several advantages:

- No database required
- GitHub handles the storage
- CSV formatting allows for easy data viewing/export
- The log viewer can be embedded in any static site

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to
   [GitHub Settings > Developer Settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token with the `gist` scope
3. Save this token securely - you'll need it for logging

### 2. Set Up the Logger

The `gist-logger.ts` script can be used to log events:

```bash
# Set your GitHub token as an environment variable
export GITHUB_TOKEN=your_github_token

# Log an event
deno run --allow-net --allow-env --allow-read --allow-write gist-logger.ts \
  --type=info \
  --source=gwas.engineer \
  --message="Feature X deployed" \
  --details="version=1.0,user=chan"
```

The first log will create a new Gist and save its ID for future use. Subsequent
logs will append to the same Gist.

### 3. Configure the Log Viewer

1. Copy the Gist ID created by the logger (it's also saved in
   `./logs/gist-id.txt`)
2. Add the Gist ID to your HTML:

```html
<div id="gist-id" style="display: none">YOUR_GIST_ID_HERE</div>
```

The Log Viewer will automatically fetch and display logs from this Gist.

## Logger Reference

### Options

- `--type=info`: Log type (info, warning, error, system, user)
- `--source=gwas.engineer`: Source of the log (domain or application)
- `--message="Some action"`: The log message (required)
- `--details="key1=val1,key2=val2"`: Additional details as key-value pairs
- `--token=YOUR_GITHUB_TOKEN`: GitHub personal access token (or set GITHUB_TOKEN
  env var)
- `--gist-id=GIST_ID`: Existing Gist ID (if not provided, creates a new gist)
- `--help`: Show help message

### Deno Tasks

If you're using Deno with a `deno.json` file, you can add these tasks for
convenience:

```json
"tasks": {
  "gist:log": "deno run --allow-net --allow-env --allow-read --allow-write utils/gist-logger.ts",
  "gist:log:info": "deno run --allow-net --allow-env --allow-read --allow-write utils/gist-logger.ts --type=info",
  "gist:log:error": "deno run --allow-net --allow-env --allow-read --allow-write utils/gist-logger.ts --type=error",
  "gist:log:warn": "deno run --allow-net --allow-env --allow-read --allow-write utils/gist-logger.ts --type=warning",
  "gist:log:help": "deno run --allow-net --allow-env --allow-read --allow-write utils/gist-logger.ts --help"
}
```

Then you can run:

```bash
deno task gist:log --message="User logged in" --details="userId=123,ip=192.168.1.1"
```

## Log Viewer Features

The web-based Log Viewer provides:

- Real-time log updates (30-second refresh by default)
- Filtering by log type, source, and time range
- Full-text search capability
- Advanced pagination
- Statistics and metrics
- Export functionality

## Embedding in Other Sites

To embed this logging system in other projects:

1. Copy the `log-viewer.js` script to your project
2. Include it in your HTML with the Gist ID
3. Use the logger script to push logs to the same Gist ID

## Development

### Requirements

- [Deno](https://deno.land/) for running the logger script
- A GitHub account with permission to create Gists
- A GitHub Personal Access Token with the `gist` scope

### License

MIT License

---

Created by the GWAS Team. For more information, visit
[gwas.engineer](https://gwas.engineer).
