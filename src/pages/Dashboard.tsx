import { Code, GitFork, LogOut, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GitHubService } from '../lib/github';
import type { GitHubRepository } from '../types/github';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.accessToken) {
      const github = new GitHubService(user.accessToken);
      github.getRepositories()
        .then(repos => setRepositories(repos))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Code className="w-6 h-6 text-blue-400 mr-2" />
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">ReadMagic</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 rounded-md text-gray-100 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-100 mb-8">Your Repositories</h2>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-300">Loading repositories...</span>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {repositories.map((repo) => (
                <Link
                  key={repo.id}
                  to={`/repository/${repo.owner.login}/${repo.name}`}
                  className="block p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg hover:shadow-xl hover:border-blue-400 transition-all duration-300"
                >
                  <h3 className="text-lg font-semibold text-gray-100">{repo.name}</h3>
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2 h-10">
                    {repo.description || 'No description provided'}
                  </p>
                  <div className="mt-4 flex items-center space-x-4 text-sm text-gray-400">
                    <span className="flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-400" />
                      {repo.stargazers_count}
                    </span>
                    <span className="flex items-center">
                      <GitFork className="w-4 h-4 mr-1 text-green-400" />
                      {repo.forks_count}
                    </span>
                    {repo.language && (
                      <span className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-blue-400 mr-1"></span>
                        {repo.language}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          {repositories.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-gray-300">No repositories found.</p>
              <p className="text-gray-400 mt-2">Create a GitHub repository to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}