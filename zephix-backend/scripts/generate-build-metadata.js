#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function generateBuildMetadata() {
  const buildMetadata = {
    sha: process.env.RAILWAY_GIT_COMMIT_SHA || 'railway-build',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'production',
    nodeVersion: process.version,
    buildTime: Date.now()
  };

  const metadataContent = `export const BUILD_METADATA = ${JSON.stringify(buildMetadata, null, 2)};`;
  const metadataPath = path.join(__dirname, '..', 'src', 'build-metadata.ts');
  
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, metadataContent);
  
  console.log('✅ Build metadata generated for production');
}

generateBuildMetadata();
