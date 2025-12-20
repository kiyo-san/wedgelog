#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitStatus() {
  try {
    return execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error('Error getting git status:', error.message);
    process.exit(1);
  }
}

function getGitDiff() {
  try {
    return execSync('git diff --cached', { encoding: 'utf-8' });
  } catch (error) {
    // If no staged changes, try unstaged
    try {
      return execSync('git diff', { encoding: 'utf-8' });
    } catch (e) {
      return '';
    }
  }
}

function getStagedFiles() {
  try {
    return execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function getUnstagedFiles() {
  try {
    return execSync('git diff --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function getUntrackedFiles() {
  try {
    return execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function stageAllFiles() {
  try {
    execSync('git add ./', { encoding: 'utf-8', stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Error staging files:', error.message);
    return false;
  }
}

function analyzeChanges(files, diff) {
  const changes = {
    added: [],
    modified: [],
    deleted: [],
    types: {
      feature: false,
      fix: false,
      config: false,
      test: false,
      docs: false,
      style: false,
      refactor: false,
    },
    areas: new Set(),
  };

  files.forEach((file) => {
    const lowerFile = file.toLowerCase();
    
    // Determine change type
    if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
      changes.types.test = true;
    } else if (file.includes('README') || file.includes('.md')) {
      changes.types.docs = true;
    } else if (file.includes('config') || file.includes('.json') || file.includes('.yml') || file.includes('.yaml')) {
      changes.types.config = true;
    } else if (file.includes('api/') || file.includes('route')) {
      changes.types.feature = true;
      changes.areas.add('api');
    } else if (file.includes('component') || file.includes('page.tsx') || file.includes('layout.tsx')) {
      changes.types.feature = true;
      changes.areas.add('ui');
    } else if (file.includes('prisma') || file.includes('schema')) {
      changes.types.feature = true;
      changes.areas.add('database');
    } else if (file.includes('workflow') || file.includes('.github')) {
      changes.types.config = true;
      changes.areas.add('ci');
    }

    // Determine file status
    const status = execSync(`git status --porcelain ${file}`, { encoding: 'utf-8' }).trim();
    if (status.startsWith('??')) {
      changes.added.push(file);
    } else if (status.startsWith('D')) {
      changes.deleted.push(file);
    } else {
      changes.modified.push(file);
    }
  });

  // Analyze diff for keywords
  const diffLower = diff.toLowerCase();
  if (diffLower.includes('fix') || diffLower.includes('bug') || diffLower.includes('error')) {
    changes.types.fix = true;
  }
  if (diffLower.includes('refactor')) {
    changes.types.refactor = true;
  }
  if (diffLower.includes('style') || diffLower.includes('format')) {
    changes.types.style = true;
  }

  return changes;
}

function generateCommitMessage(changes) {
  const parts = [];
  
  // Determine commit type
  let commitType = 'chore';
  if (changes.types.fix) {
    commitType = 'fix';
  } else if (changes.types.feature) {
    commitType = 'feat';
  } else if (changes.types.test) {
    commitType = 'test';
  } else if (changes.types.docs) {
    commitType = 'docs';
  } else if (changes.types.config) {
    commitType = 'config';
  } else if (changes.types.refactor) {
    commitType = 'refactor';
  } else if (changes.types.style) {
    commitType = 'style';
  }

  // Generate scope from areas
  const areas = Array.from(changes.areas);
  const scope = areas.length > 0 ? `(${areas[0]})` : '';

  // Generate description from file changes
  const allFiles = [...changes.added, ...changes.modified, ...changes.deleted];
  const mainFiles = allFiles.slice(0, 3).map(f => {
    const parts = f.split('/');
    return parts[parts.length - 1];
  });

  let description = '';
  if (changes.added.length > 0 && changes.modified.length === 0 && changes.deleted.length === 0) {
    description = `add ${mainFiles[0]}`;
  } else if (changes.deleted.length > 0) {
    description = `remove ${mainFiles[0]}`;
  } else if (mainFiles.length > 0) {
    description = `update ${mainFiles[0]}`;
  } else {
    description = 'update files';
  }

  // Build commit message
  parts.push(`${commitType}${scope}: ${description}`);

  // Add body with file list if multiple files
  if (allFiles.length > 1) {
    parts.push('');
    parts.push('Changes:');
    changes.added.forEach(f => parts.push(`  + ${f}`));
    changes.modified.forEach(f => parts.push(`  ~ ${f}`));
    changes.deleted.forEach(f => parts.push(`  - ${f}`));
  }

  return parts.join('\n');
}

function main() {
  // Check for untracked files and stage them
  const untrackedFiles = getUntrackedFiles();
  if (untrackedFiles.length > 0) {
    console.log(`\n📦 Found ${untrackedFiles.length} untracked file(s). Staging them...\n`);
    if (stageAllFiles()) {
      console.log('✓ All files staged successfully.\n');
    } else {
      console.log('⚠ Failed to stage some files. Continuing anyway...\n');
    }
  }

  const status = getGitStatus();
  
  if (!status) {
    console.log('No changes detected. Nothing to commit.');
    process.exit(0);
  }

  // Get files after staging (untracked files are now staged)
  const stagedFiles = getStagedFiles();
  const unstagedFiles = getUnstagedFiles();
  const allFiles = [...new Set([...stagedFiles, ...unstagedFiles])];
  
  if (allFiles.length === 0) {
    console.log('No changed files detected.');
    process.exit(0);
  }

  const diff = getGitDiff();
  const changes = analyzeChanges(allFiles, diff);
  const commitMessage = generateCommitMessage(changes);

  console.log('\n📝 Generated commit message:\n');
  console.log(commitMessage);
  console.log('\n---\n');
  console.log('To use this message, run:');
  console.log(`  git commit -m "${commitMessage.split('\n')[0]}"`);
  if (commitMessage.includes('\n')) {
    console.log('\nOr save it to a file and use:');
    const msgFile = path.join(process.cwd(), '.git-commit-msg.txt');
    fs.writeFileSync(msgFile, commitMessage);
    console.log(`  git commit -F ${msgFile}`);
  }
}

main();

