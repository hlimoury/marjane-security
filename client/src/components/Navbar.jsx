import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiHome, FiShoppingCart, FiBarChart2 } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
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
    return user.region;
  };

  return (
    <nav className="bg-green-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and nav links */}
          <div className="flex items-center space-x-8">
            <Link to="/supermarkets" className="flex items-center space-x-2">
              <span className="text-yellow-400 font-bold text-xl">MARJANE</span>
              <span className="text-green-200 text-sm">Securite</span>
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/supermarkets"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/supermarkets') || isActive('/supermarket')
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-700 hover:text-white'
                }`}
              >
                <FiShoppingCart size={16} />
                <span>Supermarches</span>
              </Link>

              {isAdmin() && (
                <Link
                  to="/dashboard"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-green-900 text-white'
                      : 'text-green-100 hover:bg-green-700 hover:text-white'
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
              <p className="text-green-200 text-xs">{roleLabel()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 bg-green-900 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
              title="Deconnexion"
            >
              <FiLogOut size={16} />
              <span className="hidden sm:inline">Deconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-green-700 px-4 pb-3 pt-2 flex space-x-2">
        <Link
          to="/supermarkets"
          className={`flex-1 text-center py-2 rounded-md text-sm font-medium ${
            isActive('/supermarkets') || isActive('/supermarket')
              ? 'bg-green-900 text-white'
              : 'text-green-100 hover:bg-green-700'
          }`}
        >
          Supermarches
        </Link>
        {isAdmin() && (
          <Link
            to="/dashboard"
            className={`flex-1 text-center py-2 rounded-md text-sm font-medium ${
              isActive('/dashboard')
                ? 'bg-green-900 text-white'
                : 'text-green-100 hover:bg-green-700'
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
