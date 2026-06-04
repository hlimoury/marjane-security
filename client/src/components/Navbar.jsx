import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiHome, FiShoppingCart, FiBarChart2, FiList, FiFileText } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout, isAdmin, isCity } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const roleLabel = () => {
    if (user.role === 'admin') return 'Administrateur';
    if (user.role === 'main') return 'MAIN';
    if (user.role === 'city') return `City — ${user.region}`;
    return user.region;
  };

  return (
    <nav className="bg-orange-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and nav links */}
          <div className="flex items-center space-x-8">
            <Link to="/supermarkets" className="flex items-center space-x-3">
              <img src="/marjane-logo.png" alt="Marjane" className="h-10 w-auto" />
              <span className="text-white text-sm font-medium">Sécurité</span>
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/supermarkets"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/supermarkets') || isActive('/supermarket')
                    ? 'bg-orange-600 text-white'
                    : 'text-white hover:bg-orange-600 hover:text-white'
                }`}
              >
                <FiShoppingCart size={16} />
                <span>Magasins</span>
              </Link>

              <Link
                to="/totaux"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/totaux')
                    ? 'bg-orange-600 text-white'
                    : 'text-white hover:bg-orange-600 hover:text-white'
                }`}
              >
                <FiList size={16} />
                <span>Totaux</span>
              </Link>

              {!isCity() && (
                <Link
                  to="/rapport"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/rapport')
                      ? 'bg-orange-600 text-white'
                      : 'text-white hover:bg-orange-600 hover:text-white'
                  }`}
                >
                  <FiFileText size={16} />
                  <span>Rapport</span>
                </Link>
              )}

              {isAdmin() && (
                <Link
                  to="/dashboard"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-orange-600 text-white'
                      : 'text-white hover:bg-orange-600 hover:text-white'
                  }`}
                >
                  <FiBarChart2 size={16} />
                  <span>Dashboard</span>
                </Link>
              )}
            </div>
          </div>

          {/* User info and logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{user.username}</p>
              <p className="text-orange-100 text-xs">{roleLabel()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 bg-orange-600 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition-colors"
              title="Déconnexion"
            >
              <FiLogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-orange-400 px-4 pb-3 pt-2 flex space-x-2">
        <Link
          to="/supermarkets"
          className={`flex-1 text-center py-2 rounded-md text-sm font-medium ${
            isActive('/supermarkets') || isActive('/supermarket')
              ? 'bg-orange-600 text-white'
              : 'text-white hover:bg-orange-600'
          }`}
        >
          Magasins
        </Link>
        <Link
          to="/totaux"
          className={`flex-1 text-center py-2 rounded-md text-sm font-medium ${
            isActive('/totaux')
              ? 'bg-orange-600 text-white'
              : 'text-white hover:bg-orange-600'
          }`}
        >
          Totaux
        </Link>
        {!isCity() && (
          <Link
            to="/rapport"
            className={`flex-1 text-center py-2 rounded-md text-sm font-medium ${
              isActive('/rapport')
                ? 'bg-orange-600 text-white'
                : 'text-white hover:bg-orange-600'
            }`}
          >
            Rapport
          </Link>
        )}
        {isAdmin() && (
          <Link
            to="/dashboard"
            className={`flex-1 text-center py-2 rounded-md text-sm font-medium ${
              isActive('/dashboard')
                ? 'bg-orange-600 text-white'
                : 'text-white hover:bg-orange-600'
            }`}
          >
            Dashboard
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
