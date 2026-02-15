import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userData = await login(username, password);
      toast.success(`Bienvenue, ${userData.username} !`);

      if (userData.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/supermarkets');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur de connexion';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-800 to-green-950 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800">MARJANE</h1>
          <div className="h-1 w-20 bg-yellow-400 mx-auto mt-2 rounded"></div>
          <p className="text-gray-500 mt-3 text-sm">Plateforme de Gestion de Securite</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="Entrer votre identifiant"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="Entrer votre mot de passe"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {isLoading ? 'Connexion en cours...' : 'Se Connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
