export interface GitHubRepository {
    id: number;
    node_id: string;
    name: string;
    homepage : string,
    topics : string,
    full_name: string;
    description: string | null;
    private: boolean;
    owner: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      url: string;
    };
    html_url: string;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    default_branch: string;
  }