import { Github } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, signInWithGithub } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-md w-full space-y-8 p-10 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        <div className="text-center">
          <h2 className="mt-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            README AI Generator
          </h2>
          <p className="mt-4 text-gray-300 text-lg">
            Create stunning README files for your GitHub repositories with the power of AI
          </p>
        </div>
        
        <div className="mt-10">
          <button
            onClick={signInWithGithub}
            className="group relative w-full flex justify-center items-center py-4 px-6 rounded-xl text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
          >
            <Github className="w-6 h-6 mr-3" />
            Sign in with GitHub
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          Connect your GitHub account to get started generating professional README files
        </div>
      </div>
    </div>
  );
}