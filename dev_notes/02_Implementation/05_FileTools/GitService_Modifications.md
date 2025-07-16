# GitService Modifications

## Overview
The GitService has been modified to work with the Gemini CLI, replacing the original Claude-specific implementation with a Google Gemini-compatible version.

## Key Changes

### 1. Package and Import Changes
- Replaced Claude-specific paths with Gemini paths
- Updated the service to work with the Gemini CLI directory structure

### 2. Directory Structure Updates
```typescript
// Original: Uses CLAUDE_DIR
private getHistoryDir(): string {
  const hash = getProjectHash(this.projectRoot);
  return path.join(os.homedir(), CLAUDE_DIR, 'history', hash);
}

// Modified: Uses GEMINI_DIR
private getHistoryDir(): string {
  const hash = getProjectHash(this.projectRoot);
  return path.join(os.homedir(), GEMINI_DIR, 'history', hash);
}
```

### 3. Git Configuration Changes
- Updated the shadow git repository configuration
- Changed user information from Claude CLI to Gemini CLI:
```typescript
const gitConfigContent = 
  '[user]\n  name = Gemini CLI\n  email = gemini-cli@google.com\n[commit]\n  gpgsign = false\n';
```

### 4. Core Functionality Preserved
The following core features remain unchanged:
- Git availability verification
- Shadow repository setup for checkpointing
- Snapshot creation and restoration
- Git ignore file synchronization
- Repository isolation from user's global git config

## Implementation Details

### Shadow Repository
The service creates a hidden git repository in the user's home directory under `~/.gemini/history/{project-hash}/` to track file changes without interfering with the project's actual git repository.

### Environment Isolation
The shadow repository uses its own git configuration to prevent inheriting user settings:
```typescript
.env({
  GIT_DIR: path.join(repoDir, '.git'),
  GIT_WORK_TREE: this.projectRoot,
  HOME: repoDir,
  XDG_CONFIG_HOME: repoDir,
})
```

## Usage
The GitService is used for:
1. Creating checkpoints of project state
2. Restoring project to previous checkpoints
3. Tracking changes made by the Gemini CLI

## Dependencies
- simple-git: For git operations
- Node.js built-in modules: fs, path, os, child_process