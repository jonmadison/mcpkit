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
  }
};

async function main() {
  // Check for --skip-checks flag
  const skipChecks = process.argv.includes('--skip-checks');

  // Check for Claude installation
  if (!skipChecks) {
    try {
      await fs.access(claudeDir);
    } catch (error) {
      console.error('Error: Claude desktop application is not installed.');
      console.error('Please download and install Claude desktop from https://claude.ai/download');
      process.exit(1);
    }
  }

  // Check for required commands
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

  // Get directory preference
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

  // Select servers to install
  const { selectedServers } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedServers',
    message: 'Select which MCP servers to install:',
    choices: Object.entries(serverDescriptions).map(([key, value]) => ({
      name: `${value.name} - ${value.description}`,
      value: key,
      checked: true
    }))
  }]);

  // Create project directory
  console.log(`\n📁 Creating directory: ${projectDir}`);
  await fs.mkdir(projectDir, { recursive: true });

  // Setup fetch-mcp if selected
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


  // Create config file
  const config = {
    mcpServers: {}
  };

  selectedServers.forEach(server => {
    const serverConfig = serverDescriptions[server].config;
    // Replace $PROJECT_DIR with actual path
    const configWithPath = JSON.parse(
      JSON.stringify(serverConfig).replace(/\$PROJECT_DIR/g, projectDir)
    );
    config.mcpServers[server] = configWithPath;
  });

  const configPath = path.join(projectDir, 'claude_desktop_config.json');
  const symlinkPath = path.join(claudeDir, 'claude_desktop_config.json');

  console.log('Checking paths:');
  console.log('Config path:', configPath);
  console.log('Symlink path:', symlinkPath);

  // Check if symlink already exists
  try {
    const stats = await fs.lstat(symlinkPath);
    if (stats.isSymbolicLink()) {
      console.log('Existing symlink found.');

      const { shouldOverwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'shouldOverwrite',
        message: 'An existing configuration symlink was found. Do you want to overwrite it?',
        default: false
      }]);

      if (!shouldOverwrite) {
        console.log('Setup cancelled. Existing configuration maintained.');
        return;
      }

      // If user confirms, remove the existing symlink
      await fs.unlink(symlinkPath);
      console.log('Existing symlink removed.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error checking for existing symlink:', error);
    } else {
      console.log('No existing symlink found.');
    }
  }



  // Create new symlink
  console.log('Creating new symlink...');
  await fs.symlink(configPath, symlinkPath);

  // Write new config file
  console.log('Writing new config file...');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));


  console.log('\n✨ Claude desktop configuration has been set up successfully!');
  console.log(`📁 Config file created at: ${configPath}`);
  console.log(`🔗 Symlink created at: ${symlinkPath}`);
  if (selectedServers.includes('fetch')) {
    console.log(`🚀 fetch-mcp server installed at: ${path.join(projectDir, 'mcp_servers', 'fetch-mcp')}`);
  }
  console.log('\nYou\'re all set! You can now use Claude with your selected MCP servers.');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
