import { Calendar, Code, Eye, FileText, Filter, GitFork, LogOut, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GitHubService } from '../lib/github';
import type { GitHubRepository } from '../types/github';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('updated');
  const [filterOption, setFilterOption] = useState('all');

  useEffect(() => {
    if (user?.accessToken) {
      const github = new GitHubService(user.accessToken);
      github.getRepositories()
        .then(repos => {
          setRepositories(repos);
          setFilteredRepos(repos);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  // Handle filtering and sorting when options change
  useEffect(() => {
    let result = [...repositories];
    
    // Apply search filter
    if (searchTerm) {
      const lowercaseTerm = searchTerm.toLowerCase();
      result = result.filter(repo => 
        repo.name.toLowerCase().includes(lowercaseTerm) || 
        (repo.description && repo.description.toLowerCase().includes(lowercaseTerm)) ||
        (repo.language && repo.language.toLowerCase().includes(lowercaseTerm))
      );
    }
    
    // Apply type filter
    if (filterOption !== 'all') {
      if (filterOption === 'forked') {
        result = result.filter(repo => repo.fork);
      } else if (filterOption === 'owned') {
        result = result.filter(repo => !repo.fork);
      } else if (filterOption === 'starred') {
        result = result.filter(repo => repo.stargazers_count > 0);
      }
    }
    
    // Apply sorting
    result = result.sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stars':
          return b.stargazers_count - a.stargazers_count;
        case 'forks':
          return b.forks_count - a.forks_count;
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    
    setFilteredRepos(result);
  }, [repositories, searchTerm, sortOption, filterOption]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  const getLanguageColor = (language: string | null) => {
    if (!language) return 'bg-gray-500';
    
    const colors: {[key: string]: string} = {
      JavaScript: 'bg-yellow-400',
      TypeScript: 'bg-blue-500',
      Python: 'bg-green-500',
      Java: 'bg-red-500',
      HTML: 'bg-orange-500',
      CSS: 'bg-purple-500',
      Rust: 'bg-amber-600',
      Go: 'bg-cyan-500',
      Ruby: 'bg-red-600',
      PHP: 'bg-indigo-500',
      'C#': 'bg-green-600',
      C: 'bg-gray-400',
      'C++': 'bg-pink-500',
      Kotlin: 'bg-orange-600',
      Swift: 'bg-red-400',
      Dart: 'bg-blue-400',
      Scala: 'bg-red-800',
      Shell: 'bg-green-700',
      R: 'bg-blue-800',
      Lua: 'bg-blue-600',
    };
    
    return colors[language] || 'bg-gray-500';
  };

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
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <img 
                  src={user.photoURL || undefined} 
                  alt={user.displayName || 'User'} 
                  className="w-8 h-8 rounded-full mr-2"
                />
                <span className="text-sm text-gray-300">{user.displayName}</span>
              </div>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-gray-100">Your Repositories</h2>
            
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              {/* Search input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  className="bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-4 w-full md:w-60 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Filter dropdown */}
              <div className="relative">
                <select
                  className="bg-gray-800 border border-gray-700 rounded-md py-2 px-4 pr-8 text-sm text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value)}
                >
                  <option value="all">All Repositories</option>
                  <option value="owned">Your Repositories</option>
                  <option value="forked">Forked Repositories</option>
                  <option value="starred">Starred Repositories</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              {/* Sort dropdown */}
              <div className="relative">
                <select
                  className="bg-gray-800 border border-gray-700 rounded-md py-2 px-4 pr-8 text-sm text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="updated">Recently Updated</option>
                  <option value="name">Name</option>
                  <option value="stars">Stars</option>
                  <option value="forks">Forks</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-300">No repositories found</h3>
              <p className="mt-2 text-sm text-gray-400">
                {searchTerm || filterOption !== 'all' 
                  ? "Try adjusting your search or filters"
                  : "You don't have any repositories yet"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRepos.map((repo) => (
                <Link 
                  to={`/repository/${repo.owner.login}/${repo.name}`}
                  key={repo.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:bg-gray-750 hover:border-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold truncate text-blue-400">{repo.name}</h3>
                    {repo.fork && (
                      <span className="flex items-center text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                        <GitFork className="w-3 h-3 mr-1" />
                        Fork
                      </span>
                    )}
                  </div>
                  
                  {repo.description && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">{repo.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 mt-auto">
                    {repo.language && (
                      <div className="flex items-center text-xs">
                        <span className={`w-3 h-3 rounded-full mr-1 ${getLanguageColor(repo.language)}`}></span>
                        <span className="text-gray-300">{repo.language}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-xs text-gray-400">
                      <Star className="w-3 h-3 mr-1" />
                      {repo.stargazers_count}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-400">
                      <GitFork className="w-3 h-3 mr-1" />
                      {repo.forks_count}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-400 ml-auto">
                      <span>Updated {formatDate(repo.updated_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}