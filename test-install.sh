#!/bin/bash
set -e

echo "Testing local npx installation..."
npx . --skip-checks

echo -e "\nTesting GitHub installation..."
npx github:jonmadison/mcpkit --skip-checks

# Optionally test specific branch
# echo -e "\nTesting GitHub installation from specific branch..."
# npx github:jonmadison/mcpkit#main