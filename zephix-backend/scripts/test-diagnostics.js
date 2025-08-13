#!/usr/bin/env node
/**
 * Simple test script to verify diagnostic tools work
 * 
 * Usage: node scripts/test-diagnostics.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Zephix Diagnostic Tools...\n');

// Check if diagnostic files exist
const diagnosticFiles = [
    'scripts/auth-diagnostics.ts',
    'scripts/browser-auth-diagnostics.js',
    'scripts/run-auth-diagnostics.sh'
];

let allFilesExist = true;

diagnosticFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} - Found`);
    } else {
        console.log(`❌ ${file} - Missing`);
        allFilesExist = false;
    }
});

// Check package.json scripts
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
        'auth:diagnose',
        'auth:diagnose:browser',
        'auth:diagnose:full',
        'auth:test'
    ];
    
    console.log('\n📋 Checking package.json scripts...');
    requiredScripts.forEach(script => {
        if (scripts[script]) {
            console.log(`✅ ${script} - Found`);
        } else {
            console.log(`❌ ${script} - Missing`);
            allFilesExist = false;
        }
    });
} else {
    console.log('❌ package.json not found');
    allFilesExist = false;
}

// Check if shell script is executable
const shellScriptPath = path.join(__dirname, '..', 'scripts', 'run-auth-diagnostics.sh');
try {
    fs.accessSync(shellScriptPath, fs.constants.X_OK);
    console.log('✅ run-auth-diagnostics.sh - Executable');
} catch (error) {
    console.log('❌ run-auth-diagnostics.sh - Not executable');
    allFilesExist = false;
}

console.log('\n📊 Test Summary');
console.log('=' .repeat(30));

if (allFilesExist) {
    console.log('🎉 All diagnostic tools are properly configured!');
    console.log('\n🚀 You can now run:');
    console.log('  npm run auth:diagnose        # Backend diagnostics');
    console.log('  npm run auth:diagnose:browser # Browser diagnostics');
    console.log('  npm run auth:diagnose:full   # Complete diagnostic package');
    console.log('  npm run auth:test            # Run both tests');
} else {
    console.log('⚠️  Some diagnostic tools are missing or misconfigured');
    console.log('\n🔧 Please check the missing files above');
}

console.log('\n📚 For detailed usage, see: AUTHENTICATION_DIAGNOSTICS_GUIDE.md');
