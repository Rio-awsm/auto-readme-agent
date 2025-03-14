import { Octokit } from 'octokit';
import type { CommitActivity, Contributor, GitHubRepository, LanguageStats, Release, RepositoryDetails } from '../types/github';

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  // Get all repositories with pagination and sorting
  async getRepositories(perPage = 100): Promise<GitHubRepository[]> {
    const allRepos: GitHubRepository[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const { data, headers } = await this.octokit.rest.repos.listForAuthenticatedUser({
        per_page: perPage,
        page: page,
        sort: 'updated',
        direction: 'desc'
      });

      allRepos.push(...data as GitHubRepository[]);
      
      // Check if there are more pages
      const linkHeader = headers.link;
      hasMorePages = linkHeader ? linkHeader.includes('rel="next"') : false;
      page++;
    }

    // Sort repositories by update date (newest first)
    return allRepos.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  // Get detailed repository information for better README generation
  async getRepositoryDetails(owner: string, repo: string): Promise<RepositoryDetails> {
    try {
      const [repoData, languages, rawContributors, rawReleases, rawCommitActivity] = await Promise.all([
        this.octokit.rest.repos.get({ owner, repo }).then(res => res.data),
        this.getLanguages(owner, repo),
        this.getContributors(owner, repo),
        this.getReleases(owner, repo),
        this.getCommitActivity(owner, repo)
      ]);

      // Ensure we have proper types for the data
      const contributors: Contributor[] = rawContributors.map(c => ({
        login: c.login || '',
        avatar_url: c.avatar_url || '',
        contributions: c.contributions,
        profile_url: c.profile_url || ''
      }));

      const releases: Release[] = rawReleases.map(r => ({
        name: r.name || '',
        tag_name: r.tag_name,
        published_at: r.published_at || '',
        html_url: r.html_url,
        body: r.body || ''
      }));

      const commitActivity: CommitActivity[] = Array.isArray(rawCommitActivity) 
        ? rawCommitActivity as CommitActivity[]
        : [];

      // Get README content if it exists
      const readme = await this.getReadme(owner, repo);
      
      // Try to get package.json for dependency information
      const packageJson = await this.getFileContents(owner, repo, 'package.json');
      
      return {
        ...repoData as GitHubRepository,
        languages,
        contributors,
        releases,
        commitActivity,
        readme: readme ? readme.content : null,
        readmeSha: readme ? readme.sha : null,
        packageJson
      };
    } catch (error) {
      console.error("Error fetching repository details:", error);
      throw error;
    }
  }

  // Get language statistics with percentages
  async getLanguages(owner: string, repo: string): Promise<LanguageStats> {
    try {
      const { data } = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      });
      
      // Calculate percentages
      const total = Object.values(data).reduce((sum, val) => sum + val, 0);
      const percentages = {} as LanguageStats;
      
      for (const [lang, bytes] of Object.entries(data)) {
        percentages[lang] = {
          bytes,
          percentage: Math.round((bytes / total) * 1000) / 10 // Round to 1 decimal place
        };
      }
      
      // Sort languages by percentage (highest first)
      return Object.fromEntries(
        Object.entries(percentages).sort((a, b) => b[1].percentage - a[1].percentage)
      );
    } catch (error) {
      console.error("Error fetching languages:", error);
      return {};
    }
  }

  // Get repository contributors
  async getContributors(owner: string, repo: string, maxContributors = 10) {
    try {
      const { data } = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: maxContributors
      });
      
      return data.map(contributor => ({
        login: contributor.login,
        avatar_url: contributor.avatar_url,
        contributions: contributor.contributions,
        profile_url: contributor.html_url
      }));
    } catch (error) {
      console.error("Error fetching contributors:", error);
      return [];
    }
  }

  // Get repository releases
  async getReleases(owner: string, repo: string, maxReleases = 5) {
    try {
      const { data } = await this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: maxReleases
      });
      
      return data.map(release => ({
        name: release.name || '',
        tag_name: release.tag_name,
        published_at: release.published_at || '',
        html_url: release.html_url,
        body: release.body
      }));
    } catch (error) {
      console.error("Error fetching releases:", error);
      return [];
    }
  }

  // Get commit activity for repository activity insights
  async getCommitActivity(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.getCommitActivityStats({
        owner,
        repo,
      });
      
      return data || [];
    } catch (error) {
      console.error("Error fetching commit activity:", error);
      return [];
    }
  }

  // Get README content with SHA for updating
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

  // Get contents of any file (useful for package.json, etc.)
  async getFileContents(owner: string, repo: string, path: string) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      
      if ('content' in data && typeof data.content === 'string') {
        return {
          content: atob(data.content.replace(/\n/g, '')),
          sha: data.sha,
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Get default branch name
  async getDefaultBranch(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo
      });
      return data.default_branch;
    } catch (error) {
      console.error("Error getting default branch:", error);
      throw error;
    }
  }

  // Improved createOrUpdateReadme with better PR description
  async createOrUpdateReadme(owner: string, repo: string, content: string, sha?: string) {
    const path = 'README.md';
    const message = sha 
      ? 'Update README.md using ReadMagic AI'
      : 'Create README.md using ReadMagic AI';

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

      // Create pull request with detailed description
      const prTitle = sha 
        ? '📝 Update README with ReadMagic AI'
        : '📝 Create README with ReadMagic AI';
        
      const prBody = `## AI-Generated README Improvements

This PR ${sha ? 'updates' : 'creates'} the README.md file using ReadMagic AI to provide:

- Clear project documentation
- Proper formatting and structure
- Installation and usage instructions
- Complete feature descriptions
- Better project visibility

**Note**: Please review the changes and make any necessary adjustments before merging.
`;

      const { data: prData } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: prTitle,
        head: branchName,
        base: defaultBranch,
        body: prBody
      });

      return prData;
    } catch (error) {
      console.error('Error in createOrUpdateReadme:', error);
      throw error;
    }
  }
}