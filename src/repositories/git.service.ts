import { Injectable } from '@nestjs/common';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitService {
  private reposPath: string;

  constructor(private readonly configService: ConfigService) {
    // Store repositories in ./repositories directory
    this.reposPath = path.join(process.cwd(), 'repositories');
    if (!fs.existsSync(this.reposPath)) {
      fs.mkdirSync(this.reposPath, { recursive: true });
    }
  }

  // Initialize a new Git repository
  async initRepository(repoId: string): Promise<void> {
    const repoPath = this.getRepoPath(repoId);
    
    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
    }

    const git = simpleGit(repoPath);
    
    // Check if already a git repo
    if (fs.existsSync(path.join(repoPath, '.git'))) {
      return;
    }

    await git.init();
    await git.addConfig('user.name', 'Team Connect Hub');
    await git.addConfig('user.email', 'noreply@teamconnecthub.com');
    
    // Create initial README
    const readmePath = path.join(repoPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, `# ${repoId}\n\nRepository created in Team Connect Hub.\n`);
      await git.add('README.md');
      await git.commit('Initial commit');
    }
  }

  // Get repository path
  getRepoPath(repoId: string): string {
    return path.join(this.reposPath, repoId);
  }

  // Check if repository exists
  repositoryExists(repoId: string): boolean {
    const repoPath = this.getRepoPath(repoId);
    return fs.existsSync(repoPath) && fs.existsSync(path.join(repoPath, '.git'));
  }

  // Create a file in repository
  async createFile(repoId: string, filePath: string, content: string, authorName: string, authorEmail: string): Promise<void> {
    const repoPath = this.getRepoPath(repoId);
    const fullPath = path.join(repoPath, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');

    const git = simpleGit(repoPath);
    await git.addConfig('user.name', authorName);
    await git.addConfig('user.email', authorEmail);
    await git.add(filePath);
  }

  // Update a file in repository
  async updateFile(repoId: string, filePath: string, content: string, authorName: string, authorEmail: string, message?: string): Promise<string> {
    const repoPath = this.getRepoPath(repoId);
    const fullPath = path.join(repoPath, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File ${filePath} does not exist`);
    }

    fs.writeFileSync(fullPath, content, 'utf-8');

    const git = simpleGit(repoPath);
    await git.addConfig('user.name', authorName);
    await git.addConfig('user.email', authorEmail);
    await git.add(filePath);
    
    const commitMessage = message || `Update ${filePath}`;
    const commit = await git.commit(commitMessage);
    
    // Get commit hash
    const log = await git.log(['-1']);
    return log.latest?.hash || '';
  }

  // Delete a file
  async deleteFile(repoId: string, filePath: string, authorName: string, authorEmail: string, message?: string): Promise<string> {
    const repoPath = this.getRepoPath(repoId);
    const fullPath = path.join(repoPath, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File ${filePath} does not exist`);
    }

    fs.unlinkSync(fullPath);

    const git = simpleGit(repoPath);
    await git.addConfig('user.name', authorName);
    await git.addConfig('user.email', authorEmail);
    await git.add(filePath);
    
    const commitMessage = message || `Delete ${filePath}`;
    await git.commit(commitMessage);
    
    const log = await git.log(['-1']);
    return log.latest?.hash || '';
  }

  // Get file content
  getFileContent(repoId: string, filePath: string, branch: string = 'main'): string {
    const repoPath = this.getRepoPath(repoId);
    const fullPath = path.join(repoPath, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File ${filePath} does not exist`);
    }

    return fs.readFileSync(fullPath, 'utf-8');
  }

  // List files in repository
  listFiles(repoId: string, directory: string = '.'): string[] {
    const repoPath = this.getRepoPath(repoId);
    const dirPath = path.join(repoPath, directory);

    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const files: string[] = [];
    const listDir = (dir: string, base: string = '') => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item === '.git') continue;
        
        const fullPath = path.join(dir, item);
        const relativePath = path.join(base, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          listDir(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };

    listDir(dirPath, directory === '.' ? '' : directory);
    return files;
  }

  // Create a branch
  async createBranch(repoId: string, branchName: string): Promise<void> {
    const repoPath = this.getRepoPath(repoId);
    const git = simpleGit(repoPath);
    await git.checkoutLocalBranch(branchName);
  }

  // Switch to a branch
  async checkoutBranch(repoId: string, branchName: string): Promise<void> {
    const repoPath = this.getRepoPath(repoId);
    const git = simpleGit(repoPath);
    await git.checkout(branchName);
  }

  // Get all branches
  async getBranches(repoId: string): Promise<string[]> {
    const repoPath = this.getRepoPath(repoId);
    const git = simpleGit(repoPath);
    const branches = await git.branchLocal();
    return branches.all;
  }

  // Get commits
  async getCommits(repoId: string, branch: string = 'main', limit: number = 50): Promise<any[]> {
    const repoPath = this.getRepoPath(repoId);
    const git = simpleGit(repoPath);
    
    try {
      await git.checkout(branch);
    } catch {
      // Branch might not exist
    }

    const log = await git.log({ maxCount: limit });
    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email,
      date: commit.date,
    }));
  }

  // Get commit details
  async getCommit(repoId: string, hash: string): Promise<any> {
    const repoPath = this.getRepoPath(repoId);
    const git = simpleGit(repoPath);
    
    const log = await git.log({ from: hash, to: hash, maxCount: 1 });
    if (log.all.length === 0) {
      throw new Error('Commit not found');
    }

    const commit = log.all[0];
    const diff = await git.show([hash, '--stat']);

    return {
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email,
      date: commit.date,
      diff,
    };
  }

  // Create a commit
  async createCommit(repoId: string, message: string, authorName: string, authorEmail: string, files?: string[]): Promise<string> {
    const repoPath = this.getRepoPath(repoId);
    const git = simpleGit(repoPath);
    
    await git.addConfig('user.name', authorName);
    await git.addConfig('user.email', authorEmail);

    if (files && files.length > 0) {
      await git.add(files);
    } else {
      await git.add('.');
    }

    await git.commit(message);
    
    const log = await git.log(['-1']);
    return log.latest?.hash || '';
  }

  // Get file tree
  async getFileTree(repoId: string, branch: string = 'main'): Promise<any> {
    const repoPath = this.getRepoPath(repoId);
    const files = this.listFiles(repoId);
    
    const tree: any = {};
    for (const file of files) {
      const parts = file.split(path.sep);
      let current = tree;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = {
        type: 'file',
        path: file,
      };
    }

    return tree;
  }

  // Delete repository
  async deleteRepository(repoId: string): Promise<void> {
    const repoPath = this.getRepoPath(repoId);
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  }
}
