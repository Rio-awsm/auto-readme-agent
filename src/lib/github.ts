import { Octokit } from 'octokit';
import type { GitHubRepository } from '../types/github';

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepositories(): Promise<GitHubRepository[]> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser();
    return data as GitHubRepository[];
  }

  async getReadme(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      return {
        content: atob(data.content.replace(/\n/g, '')),
        sha: data.sha,
      };
    } catch (error) {
      return null;
    }
  }

  async getDefaultBranch(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo
      });
      return data.default_branch; // This will return 'main', 'master', or whatever the default branch is
    } catch (error) {
      console.error("Error getting default branch:", error);
      throw error;
    }
  }

  async createOrUpdateReadme(owner: string, repo: string, content: string, sha?: string) {
    const path = 'README.md';
    const message = sha 
      ? 'Update README.md using AI Agent'
      : 'Create README.md using AI Agent';

    try {
      // Get the default branch
      const defaultBranch = await this.getDefaultBranch(owner, repo);
      
      // Create a new branch
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`
      });

      const branchName = `feature/update-readme-${Date.now()}`;
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha
      });

      // Check if README already exists on the new branch
      let fileSha;
      if (!sha) {
        try {
          const { data: fileData } = await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: branchName
          });
          
          // If the file exists and is not a directory
          if (!Array.isArray(fileData) && fileData.type === 'file') {
            fileSha = fileData.sha;
          }
        } catch (e) {
          // File doesn't exist, which is fine for creation
          console.log("README doesn't exist yet, creating new file");
        }
      } else {
        fileSha = sha;
      }

      // Create or update README in the new branch
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: base64Content,
        branch: branchName,
        ...(fileSha && { sha: fileSha })
      });

      // Create pull request
      const { data: prData } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: 'Update README.md using AI Agent',
        head: branchName,
        base: defaultBranch,
        body: 'This PR updates the README.md file using the AI Agent.'
      });

      return prData;
    } catch (error) {
      console.error('Error in createOrUpdateReadme:', error);
      throw error;
    }
  }
}