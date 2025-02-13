# MCP Kit

A CLI tool for easily setting up Model Context Protocol (MCP) servers for Claude Desktop on OSX. This tool helps you configure and manage multiple MCP servers. I've included some of my favorite servers to start with.

Features

- 🚀 Easy setup of multiple MCP servers
- Includes the following servers:
  - 💾 Persistent memory across sessions
  - 📂 File system access
  - 🖥️ Terminal command execution (sandboxed)
  - 🌐 Web fetch capabilities
  - 📝 YouTube transcript extraction
- 🔗 Automatic symlink creation for Claude Desktop

## Prerequisites

- Node.js >=14.0.0
- npm
- git
- Claude Desktop installed

## Installation & Usage

You can run MCP Kit directly without installation using npx:

```bash
# Run directly from GitHub
npx github:jonmadison/mcpkit
```

Or install it globally:

```bash
# Install from npm
npm install -g mcp-kit

# Install from GitHub
npm install -g github:jonmadison/mcpkit

# Then run
mcp-kit
```

## Development

To run the tool in development mode or for testing:

```bash
# Clone the repository
git clone https://github.com/jonmadison/mcpkit.git
cd mcpkit

# Install dependencies
npm install

# Run locally
npm start

# Run with checks disabled (for testing)
npm start -- --skip-checks
```

## Available MCP Servers

1. **[Memory Server](https://github.com/modelcontextprotocol/servers)**

   - Adds persistent memory capability across sessions
   - Stores memory in a JSON file
2. **[Terminal Server](https://github.com/dillip285/mcp-terminal)**

   - Execute terminal commands in a sandboxed environment
   - Path-restricted for security
3. **[Filesystem Server](https://github.com/modelcontextprotocol/servers)**

   - Read and write files
   - Path-restricted access
4. **[Fetch Server](https://github.com/zcaceres/fetch-mcp.git)**

   - Make HTTP requests to external URLs
   - Requires local installation
5. **[YouTube Transcript Server](https://github.com/kimtaeyoon83/mcp-server-youtube-transcript)**

   - Extract transcripts from YouTube videos
   - Supports multiple languages

## Configuration

The tool will:

1. Create an MCP work directory in your preferred location
2. Install and configure selected MCP servers
3. Create a configuration file (claude_desktop_config.json)
4. Set up appropriate symlinks for Claude Desktop

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

MIT

## Authors

- Jon Madison
