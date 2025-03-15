import {
  ChevronRight,
  Code,
  Download,
  FileText,
  GitBranch,
  GitPullRequest,
  Loader,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GeminiService } from "../lib/gemini";
import { GitHubService } from "../lib/github";
import type { GitHubRepository, RepositoryDetails } from "../types/github";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";

export default function Repository() {
  const { user } = useAuth();
  const { owner, name } = useParams();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [repository, setRepository] = useState<GitHubRepository | null>(null);
  const [repositoryDetails, setRepositoryDetails] =
    useState<RepositoryDetails | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
  const [readmeSha, setReadmeSha] = useState<string | null>(null);
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");

  useEffect(() => {
    if (user?.accessToken && owner && name) {
      const github = new GitHubService(user.accessToken);

      setLoading(true);
      setError(null);

      Promise.all([
        github
          .getRepositories()
          .then((repos) =>
            repos.find((r) => r.name === name && r.owner.login === owner)
          ),
        github.getReadme(owner, name),
      ])
        .then(([repo, readmeData]) => {
          setRepository(repo || null);
          setReadme(readmeData?.content || null);
          setReadmeSha(readmeData?.sha || null);
        })
        .catch((err) => {
          console.error("Error loading repository:", err);
          setError("Failed to load repository data. Please try again.");
        })
        .finally(() => setLoading(false));
    }
  }, [user, owner, name]);

  const fetchRepositoryDetails = async () => {
    if (!user?.accessToken || !repository || !owner || !name) return;

    setFetchingDetails(true);
    setError(null);

    try {
      const github = new GitHubService(user.accessToken);
      const details = await github.getRepositoryDetails(owner, name);
      setRepositoryDetails(details);

      // Update readme with the latest from detailed fetch
      if (details.readme) {
        setReadme(details.readme);
        setReadmeSha(details.readmeSha || null);
      }
    } catch (err) {
      console.error("Error fetching repository details:", err);
      setError(
        "Failed to fetch detailed repository information. Using basic information instead."
      );
    } finally {
      setFetchingDetails(false);
    }
  };

  const generateReadme = async () => {
    if (!user?.accessToken || !repository) return;

    setGenerating(true);
    setPullRequestUrl(null);
    setError(null);

    try {
      const github = new GitHubService(user.accessToken);
      const gemini = new GeminiService();

      // Use repositoryDetails if available, otherwise use basic repository info
      const repoData = repositoryDetails || repository;
      const newReadme = await gemini.generateReadme(
        repoData,
        readme ?? undefined
      );

      const prData = await github.createOrUpdateReadme(
        repository.owner.login,
        repository.name,
        newReadme,
        readmeSha ?? undefined // Pass the SHA when we have it (for updates)
      );

      setReadme(newReadme);
      setPullRequestUrl(prData.html_url);
    } catch (error) {
      console.error("Error generating README:", error);
      setError("Failed to generate or update README. Please try again later.");
    } finally {
      setGenerating(false);
    }
  };

  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to="/dashboard"
            className="text-blue-400 hover:text-blue-300 flex items-center text-sm"
          >
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
            Back to Dashboard
          </Link>

          <div className="flex items-center space-x-3">
            {pullRequestUrl && (
              <a
                href={pullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-100 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors"
              >
                <GitPullRequest className="w-4 h-4 mr-2 text-green-400" />
                View PR
              </a>
            )}

            <button
              onClick={generateReadme}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50 transition-all shadow-md"
            >
              {generating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {readme ? "Update README" : "Generate README"}
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-300">
              Loading repository details...
            </span>
          </div>
        ) : repository ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {error && (
                <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Code className="w-5 h-5 text-blue-400 mr-2" />
                  <h1 className="text-xl font-bold text-gray-100 truncate">
                    {repository.name}
                  </h1>
                  {repository.private && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
                      Private
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  {repository.description || "No description provided"}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {repository.language && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/30 text-blue-200 border border-blue-800">
                      {repository.language}
                    </span>
                  )}
                  {repository.topics?.map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-0.5 text-xs rounded-full bg-purple-900/30 text-purple-200 border border-purple-800"
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex items-center text-gray-400 text-sm">
                    <GitBranch className="w-4 h-4 mr-1" />
                    <span>{repository.forks_count}</span>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 0a8 8 0 0 0-8 8 8 8 0 0 0 8 8 8 8 0 0 0 8-8 8 8 0 0 0-8-8zm.25 12a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm.9-8.2v.2c0 .53-.43.96-.96.96-.23 0-.44-.08-.61-.22-.17-.14-.3-.33-.35-.55L6 4.11c-.05-.22-.07-.45-.07-.67 0-1.13.92-2.05 2.05-2.05s2.05.92 2.05 2.05c0 .96-.66 1.79-1.58 2.01-.25.06-.41.29-.41.55v.2c0 .28.22.5.5.5s.5-.22.5-.5z" />
                    </svg>
                    <span>{repository.open_issues_count}</span>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
                    </svg>
                    <span>{repository.stargazers_count}</span>
                  </div>
                </div>

                {!repositoryDetails && (
                  <button
                    onClick={fetchRepositoryDetails}
                    disabled={fetchingDetails}
                    className="w-full inline-flex justify-center items-center px-3 py-2 rounded-md text-sm font-medium text-gray-100 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors disabled:opacity-50"
                  >
                    {fetchingDetails ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Fetching details...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Fetch repository details
                      </>
                    )}
                  </button>
                )}
              </div>

              {repositoryDetails && (
                <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-blue-400 mb-4">
                    Repository Details
                  </h2>

                  <div className="space-y-5">
                    {/* Languages */}
                    {Object.keys(repositoryDetails.languages).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-300 mb-2">
                          Languages
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(repositoryDetails.languages).map(
                            ([lang, stats]) => (
                              <div
                                key={lang}
                                className="px-2 py-0.5 rounded-full bg-gray-700 text-xs"
                              >
                                {lang}:{" "}
                                <span className="text-blue-300">
                                  {stats.percentage}%
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contributors */}
                    {repositoryDetails.contributors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-300 mb-2">
                          Top Contributors
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {repositoryDetails.contributors.map((contributor) => (
                            <a
                              key={contributor.login}
                              href={contributor.profile_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-xs transition-colors"
                            >
                              <img
                                src={contributor.avatar_url}
                                alt={contributor.login}
                                className="w-4 h-4 rounded-full mr-1"
                              />
                              {contributor.login}
                              <span className="ml-1 text-gray-400">
                                ({contributor.contributions})
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Releases */}
                    {repositoryDetails.releases.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-300 mb-2">
                          Recent Releases
                        </h3>
                        <div className="space-y-2">
                          {repositoryDetails.releases.map((release) => (
                            <a
                              key={release.tag_name}
                              href={release.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-xs transition-colors"
                            >
                              <Download className="w-3 h-3 mr-1 text-green-400" />
                              <div>
                                <div className="font-medium">
                                  {release.name || release.tag_name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(
                                    release.published_at
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main content - README with GitHub preview */}
            <div className="lg:col-span-2">
              {readme ? (
                <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg overflow-hidden">
                  {/* README Preview Header */}
                  <div className="border-b border-gray-700 px-4 py-3 bg-gray-800 flex items-center">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setActiveTab("preview")}
                        className={`px-3 py-1 text-sm rounded-md ${
                          activeTab === "preview"
                            ? "bg-gray-700 text-white"
                            : "text-gray-400 hover:bg-gray-700/50"
                        }`}
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => setActiveTab("raw")}
                        className={`px-3 py-1 text-sm rounded-md ${
                          activeTab === "raw"
                            ? "bg-gray-700 text-white"
                            : "text-gray-400 hover:bg-gray-700/50"
                        }`}
                      >
                        Raw
                      </button>
                    </div>
                  </div>

                  {/* README Content */}
                  <div className="p-0">
                    {activeTab === "preview" ? (
                      <div className="github-markdown p-6 bg-gray-800">
                        <div className="prose prose-invert prose-sm max-w-none overflow-auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {readme}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-900 p-4 overflow-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">
                          {readme}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-8 flex flex-col items-center justify-center text-center h-64">
                  <FileText className="w-12 h-12 text-gray-600 mb-4" />
                  <h2 className="text-lg font-medium text-gray-300">
                    No README found
                  </h2>
                  <p className="text-gray-500 mt-2 mb-6">
                    This repository doesn't have a README file yet.
                  </p>
                  <button
                    onClick={generateReadme}
                    disabled={generating}
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
                  >
                    {generating ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate README
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700">
            <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400">Repository not found</p>
            <p className="text-gray-500 mt-2">
              The repository you're looking for doesn't exist or you don't have
              access to it.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center px-4 py-2 rounded-md text-gray-100 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
