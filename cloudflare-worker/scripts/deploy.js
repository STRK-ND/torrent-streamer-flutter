#!/usr/bin/env node

/**
 * Deployment script for Cloudflare Worker
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CONFIG = {
  workerName: 'torrent-scraper-worker',
  environment: process.argv[2] || 'production',
};

async function deploy() {
  console.log(`🚀 Deploying ${CONFIG.workerName} to ${CONFIG.environment}...`);

  try {
    // Check if wrangler is installed
    execSync('npx wrangler --version', { stdio: 'pipe' });

    // Validate environment
    console.log('📋 Validating configuration...');
    await validateConfiguration();

    // Run tests (if available)
    console.log('🧪 Running tests...');
    try {
      execSync('npm test', { stdio: 'pipe' });
      console.log('✅ Tests passed');
    } catch (error) {
      console.warn('⚠️  Tests failed or not available, continuing deployment...');
    }

    // Deploy to Cloudflare
    console.log('☁️  Deploying to Cloudflare...');
    execSync(`npx wrangler deploy --env ${CONFIG.environment}`, { stdio: 'inherit' });

    console.log('✅ Deployment successful!');
    console.log(`🌐 Worker URL: https://${CONFIG.workerName}.${process.env.CLOUDFLARE_ACCOUNT_ID || 'your-account'}.workers.dev`);

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

async function validateConfiguration() {
  // Check wrangler.toml exists
  try {
    readFileSync('wrangler.toml');
  } catch (error) {
    throw new Error('wrangler.toml not found. Please create configuration file.');
  }

  // Check source files exist
  try {
    readFileSync('src/index.js');
  } catch (error) {
    throw new Error('src/index.js not found. Please ensure source files exist.');
  }

  console.log('✅ Configuration validated');
}

// Run deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  deploy().catch(console.error);
}

export { deploy };