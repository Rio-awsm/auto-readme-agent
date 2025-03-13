// Enhanced GitHub repository types to support improved functionality

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  url: string;
  html_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    url: string;
  } | null;
  topics: string[];
  default_branch: string;
  visibility: string;
  private: boolean;
}

// Enhanced repository with detailed information
export interface RepositoryDetails extends GitHubRepository {
  languages: LanguageStats;
  contributors: Contributor[];
  releases: Release[];
  commitActivity: CommitActivity[];
  readme: string | null;
  readmeSha: string | null;
  packageJson?: {
    content: string;
    sha: string;
  } | null;
  license: {
    name: string;
    url: string;
  } | null;
}

// Language statistics with percentage information
export interface LanguageStats {
  [language: string]: {
    bytes: number;
    percentage: number;
  };
}

// Contributor information
export interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
  profile_url: string;
}

// Release information
export interface Release {
  name: string;
  tag_name: string;
  published_at: string;
  html_url: string;
  body?: string;
}

// Weekly commit activity
export interface CommitActivity {
  days: number[];
  total: number;
  week: number;
}

// Pull request info returned when creating/updating README
export interface PullRequestInfo {
  html_url: string;
  number: number;
  state: string;
  title: string;
}