#!/usr/bin/env bash
# exit on error
set -o errexit

npm install

# Install Chrome for Puppeteer
echo "Installing Chrome dependencies for Puppeteer..."
npx puppeteer browsers install chrome
