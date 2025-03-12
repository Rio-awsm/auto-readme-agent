import { ChevronRight, Code, FileText, GitPullRequest, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GeminiService } from '../lib/gemini';
import { GitHubService } from '../lib/github';
import type { GitHubRepository } from '../types/github';

export default function Repository() {
  const { user } = useAuth();
  const { owner, name } = useParams();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [repository, setRepository] = useState<GitHubRepository | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
  const [readmeSha, setReadmeSha] = useState<string | null>(null);
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.accessToken && owner && name) {
      const github = new GitHubService(user.accessToken);
      Promise.all([
        github.getRepositories().then(repos => 
          repos.find(r => r.name === name && r.owner.login === owner)
        ),
        github.getReadme(owner, name)
      ]).then(([repo, readmeData]) => {
        setRepository(repo || null);
        setReadme(readmeData?.content || null);
        setReadmeSha(readmeData?.sha || null);
      }).catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, owner, name]);

  const generateReadme = async () => {
    if (!user?.accessToken || !repository) return;

    setGenerating(true);
    setPullRequestUrl(null);
    
    try {
      const github = new GitHubService(user.accessToken);
      const gemini = new GeminiService();

      const newReadme = await gemini.generateReadme(repository, readme);
      const prData = await github.createOrUpdateReadme(
        repository.owner.login,
        repository.name,
        newReadme,
        readmeSha  // Pass the SHA when we have it (for updates)
      );

      setReadme(newReadme);
      setPullRequestUrl(prData.html_url);
    } catch (error) {
      console.error('Error generating README:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/dashboard" className="text-blue-400 hover:text-blue-300 flex items-center text-sm">
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
            Back to Dashboard
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-300">Loading repository details...</span>
          </div>
        ) : repository ? (
          <div className="space-y-8">
            <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-8">
              <div className="flex items-center">
                <Code className="w-6 h-6 text-blue-400 mr-3" />
                <h1 className="text-2xl font-bold text-gray-100">{repository.name}</h1>
              </div>
              <p className="mt-3 text-gray-400">{repository.description}</p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={generateReadme}
                  disabled={generating}
                  className="inline-flex items-center px-5 py-3 rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50 transition-all duration-300 shadow-lg font-medium"
                >
                  {generating ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Generating README...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      {readme ? 'Update README' : 'Generate README'}
                    </>
                  )}
                </button>

                {pullRequestUrl && (
                  <a
                    href={pullRequestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-5 py-3 rounded-lg text-gray-100 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors"
                  >
                    <GitPullRequest className="w-5 h-5 mr-2 text-green-400" />
                    View Pull Request
                  </a>
                )}
              </div>
            </div>

            {readme && (
              <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-8">
                <h2 className="text-xl font-semibold text-blue-400 mb-6">Current README</h2>
                <div className="prose prose-invert max-w-none">
                  <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 overflow-auto max-h-96">
                    <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">{readme}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700">
            <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400">Repository not found</p>
            <p className="text-gray-500 mt-2">The repository you're looking for doesn't exist or you don't have access to it.</p>
            <Link to="/dashboard" className="mt-6 inline-flex items-center px-4 py-2 rounded-md text-gray-100 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors">
              Return to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}