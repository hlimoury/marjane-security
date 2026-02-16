import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';
import { toast } from 'react-toastify';
import { FiShoppingCart, FiCalendar, FiCheckCircle, FiMapPin } from 'react-icons/fi';

const MONTHS = ['', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const regionColor = (region) => {
    const colors = {
      'REGION CENTRE 1': 'bg-blue-500',
      'REGION CENTRE 02': 'bg-indigo-500',
      'REGION SUD': 'bg-orange-500',
      'REGION ORIENT': 'bg-purple-500',
      'REGION NORD': 'bg-teal-500',
    };
    return colors[region] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Administrateur</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-lg p-3">
              <FiShoppingCart size={20} className="text-blue-700" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Supermarches</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total_supermarkets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-lg p-3">
              <FiCalendar size={20} className="text-blue-700" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Instances</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total_instances}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 rounded-lg p-3">
              <FiMapPin size={20} className="text-purple-700" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Regions Actives</p>
              <p className="text-2xl font-bold text-gray-800">{stats.supermarkets_per_region.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-100 rounded-lg p-3">
              <FiCheckCircle size={20} className="text-yellow-700" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Completion</p>
              <p className="text-2xl font-bold text-gray-800">{stats.completion.percentage}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supermarkets per Region */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Supermarches par Region</h2>
          {stats.supermarkets_per_region.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun supermarche</p>
          ) : (
            <div className="space-y-3">
              {stats.supermarkets_per_region.map((item) => (
                <div key={item.region} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${regionColor(item.region)}`}></div>
                    <span className="text-sm text-gray-700">{item.region}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completion Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Progression Globale</h2>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Caracteristiques remplies</span>
              <span className="font-medium text-gray-800">{stats.completion.filled} / {stats.completion.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${stats.completion.percentage}%` }}
              ></div>
            </div>
          </div>
          <p className="text-gray-400 text-xs">
            Chaque instance a 8 caracteristiques a remplir
          </p>
        </div>

        {/* Recent Instances */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Instances Recentes</h2>
          {stats.recent_instances.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune instance</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Supermarche</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Region</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Periode</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Date de creation</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_instances.map((inst) => (
                    <tr
                      key={inst.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/instance/${inst.id}`)}
                    >
                      <td className="py-3 px-2 font-medium text-gray-800">{inst.supermarket_name}</td>
                      <td className="py-3 px-2 text-gray-600">{inst.region}</td>
                      <td className="py-3 px-2 text-gray-600">{MONTHS[inst.month]} {inst.year}</td>
                      <td className="py-3 px-2 text-gray-400">{new Date(inst.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
