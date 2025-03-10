#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultDir = path.join(os.homedir(), 'src', 'ai_projects');
const claudeDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
const configPath = path.join(claudeDir, 'claude_desktop_config.json');

const serverDescriptions = {
  memory: {
    name: 'memory',
    description: 'Adds persistent memory capability to your LLM across sessions',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: {
        MEMORY_PERSIST: 'true',
        MEMORY_PATH: path.join('$PROJECT_DIR', 'memory', 'memory.json')
      }
    }
  },
  terminal: {
    name: 'terminal',
    description: 'Execute terminal commands (sandboxed)',
    config: {
      command: 'npx',
      args: ['@dillip285/mcp-terminal', '--allowed-paths', '$PROJECT_DIR']
    }
  },
  filesystem: {
    name: 'filesystem',
    description: 'Read/write files to and from the filesystem',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '$PROJECT_DIR']
    }
  },
  fetch: {
    name: 'fetch',
    description: 'Fetch a URL from the web (requires local installation)',
    config: {
      command: 'node',
      args: ['$PROJECT_DIR/mcp_servers/fetch-mcp/dist/index.js']
    },
    requiresBuild: true
  },
  'youtube-transcript': {
    name: 'youtube-transcript',
    description: 'Get a transcript from a youtube video',
    config: {
      command: 'npx',
      args: ['-y', '@kimtaeyoon83/mcp-server-youtube-transcript']
    }
  },
  puppeteer: {
    name: 'puppeteer',
    description: 'Browser automation capabilities via Puppeteer',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer']
    }
  }
};

async function openEditor() {
  const configPath = path.join(claudeDir, 'claude_desktop_config.json');
  try {
    await fs.access(configPath);
    const editor = process.env.EDITOR || process.env.VISUAL;
    
    if (editor) {
      execSync(`${editor} "${configPath}"`, { stdio: 'inherit' });
    } else {
      try {
        execSync(`code "${configPath}"`, { stdio: 'inherit' });
      } catch {
        try {
          execSync(`vim "${configPath}"`, { stdio: 'inherit' });
        } catch {
          try {
            execSync(`nano "${configPath}"`, { stdio: 'inherit' });
          } catch {
            console.error('No suitable editor found. Please set your EDITOR environment variable.');
            process.exit(1);
          }
        }
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Config file not found at: ${configPath}`);
    } else {
      console.error('Error opening editor:', error.message);
    }
    process.exit(1);
  }
}

async function getExistingConfig() {
  const configPath = path.join(claudeDir, 'claude_desktop_config.json');
  try {
    const configContent = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function main() {
  if (process.argv.includes('-e')) {
    await openEditor();
    return;
  }

  const skipChecks = process.argv.includes('--skip-checks');

  if (!skipChecks) {
    try {
      await fs.access(claudeDir);
    } catch (error) {
      console.error('Error: Claude desktop application is not installed.');
      console.error('Please download and install Claude desktop from https://claude.ai/download');
      process.exit(1);
    }
  }

  if (!skipChecks) {
    ['git', 'node', 'npm'].forEach(cmd => {
      try {
        execSync(`which ${cmd}`);
      } catch (error) {
        console.error(`Error: ${cmd} is required but not installed.`);
        console.error(`Please install ${cmd} and try again.`);
        process.exit(1);
      }
    });
  }

  console.log('Welcome to the Claude MCP Server Configuration Setup! 🚀\n');

  // Get existing configuration
  const existingConfig = await getExistingConfig();
  const installedServers = existingConfig?.mcpServers ? Object.keys(existingConfig.mcpServers) : [];

  if (installedServers.length > 0) {
    console.log('Currently installed servers:');
    installedServers.forEach(server => {
      console.log(`✔ ${server}: ${serverDescriptions[server]?.description || 'Custom server'}`);
    });
    console.log();
  }

  // Filter out already installed servers
  const availableServers = Object.entries(serverDescriptions)
    .filter(([key]) => !installedServers.includes(key));

  if (availableServers.length === 0) {
    console.log('All available servers are already installed!');
    process.exit(0);
  }

  const { useDefaultDir } = await inquirer.prompt([{
    type: 'confirm',
    name: 'useDefaultDir',
    message: `Use default project directory (${defaultDir})?`,
    default: true
  }]);

  let projectDir = defaultDir;
  if (!useDefaultDir) {
    const { customDir } = await inquirer.prompt([{
      type: 'input',
      name: 'customDir',
      message: 'Enter your preferred directory path:',
      filter: input => input.replace('~', os.homedir())
    }]);
    projectDir = customDir;
  }

  const { selectedServers } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedServers',
    message: 'Select which additional MCP servers to install:',
    choices: availableServers.map(([key, value]) => ({
      name: `${value.name} - ${value.description}`,
      value: key,
      checked: true
    }))
  }]);

  if (selectedServers.length === 0) {
    console.log('No new servers selected. Configuration unchanged.');
    process.exit(0);
  }

  console.log(`\n📁 Creating directory: ${projectDir}`);
  await fs.mkdir(projectDir, { recursive: true });

  if (selectedServers.includes('fetch')) {
    console.log('\n🔧 Setting up fetch-mcp server...');
    const fetchMcpDir = path.join(projectDir, 'mcp_servers', 'fetch-mcp');
    await fs.mkdir(path.join(projectDir, 'mcp_servers'), { recursive: true });

    if (await fs.access(fetchMcpDir).then(() => true).catch(() => false)) {
      await fs.rm(fetchMcpDir, { recursive: true });
    }

    try {
      console.log('Cloning fetch-mcp repository...');
      execSync('git clone https://github.com/zcaceres/fetch-mcp.git', {
        cwd: path.join(projectDir, 'mcp_servers'),
        stdio: 'inherit'
      });

      console.log('Installing dev dependencies...');
      execSync('npm install shx typescript', {
        cwd: fetchMcpDir,
        stdio: 'inherit'
      });

      console.log('Installing fetch-mcp...');
      execSync('npm install', {
        cwd: fetchMcpDir,
        stdio: 'inherit'
      });

      console.log('fetch-mcp setup completed successfully.');
    } catch (error) {
      console.error('Error during fetch-mcp setup:', error.message);
      console.error('Full error:', error);
    }
  }
  // Create or update config file
  let config;
  try {
    // Try to read existing config
    const existingContent = await fs.readFile(configPath, 'utf8');
    config = JSON.parse(existingContent);
    console.log('Found existing configuration file');
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create new config
      config = { mcpServers: {} };
      console.log('Creating new configuration file');
      // Ensure the Claude directory exists
      await fs.mkdir(claudeDir, { recursive: true });
    } else {
      // Some other error occurred
      throw error;
    }
  }

  // Add new servers to config
  selectedServers.forEach(server => {
    const serverConfig = serverDescriptions[server].config;
    const configWithPath = JSON.parse(
      JSON.stringify(serverConfig).replace(/\$PROJECT_DIR/g, defaultDir)
    );
    config.mcpServers[server] = configWithPath;
  });

  // Write config to file
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  console.log('\n✨ Claude desktop configuration has been updated successfully!');
  console.log(`📁 Config ${config.mcpServers ? 'updated' : 'created'} at: ${configPath}`);
  if (selectedServers.includes('fetch')) {
    console.log(`🚀 fetch-mcp server installed at: ${path.join(defaultDir, 'mcp_servers', 'fetch-mcp')}`);
  }
  console.log('\nYou\'re all set! You can now use Claude with your selected MCP servers.');

}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
