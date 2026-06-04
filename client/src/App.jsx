import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import WhatsAppButton from './components/WhatsAppButton';
import Login from './pages/Login';
import Supermarkets from './pages/Supermarkets';
import SupermarketDetail from './pages/SupermarketDetail';
import InstanceDetail from './pages/InstanceDetail';
import Dashboard from './pages/Dashboard';
import Dispositifs from './pages/Dispositifs';
import Interpellations from './pages/Interpellations';
import Accidents from './pages/Accidents';
import AutresIncidents from './pages/AutresIncidents';
import Formations from './pages/Formations';
import Reclamations from './pages/Reclamations';
import Anomalies from './pages/Anomalies';
import ControleRM from './pages/ControleRM';
import Scoring from './pages/Scoring';
import DashboardCategoryDetail from './pages/DashboardCategoryDetail';
import DashboardSubCategoryDetail from './pages/DashboardSubCategoryDetail';
import Totaux from './pages/Totaux';
import Rapport from './pages/Rapport';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <WhatsAppButton />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/supermarkets" replace /> : <Login />} />

        <Route path="/supermarkets" element={
          <ProtectedRoute><Supermarkets /></ProtectedRoute>
        } />

        <Route path="/supermarket/:id" element={
          <ProtectedRoute><SupermarketDetail /></ProtectedRoute>
        } />

        <Route path="/instance/:id" element={
          <ProtectedRoute><InstanceDetail /></ProtectedRoute>
        } />

        {/* Caracteristiques pages */}
        <Route path="/instance/:instanceId/dispositifs" element={
          <ProtectedRoute><Dispositifs /></ProtectedRoute>
        } />
        <Route path="/instance/:instanceId/interpellations" element={
          <ProtectedRoute><Interpellations /></ProtectedRoute>
        } />
        <Route path="/instance/:instanceId/accidents" element={
          <ProtectedRoute><Accidents /></ProtectedRoute>
        } />
        <Route path="/instance/:instanceId/autres_incidents" element={
          <ProtectedRoute><AutresIncidents /></ProtectedRoute>
        } />
        <Route path="/instance/:instanceId/formations" element={
          <ProtectedRoute><Formations /></ProtectedRoute>
        } />
        <Route path="/instance/:instanceId/reclamations" element={
          <ProtectedRoute><Reclamations /></ProtectedRoute>
        } />
        <Route path="/instance/:instanceId/anomalies" element={
          <ProtectedRoute><Anomalies /></ProtectedRoute>
        } />
        <Route path="/instance/:instanceId/controle_rm" element={
          <ProtectedRoute><ControleRM /></ProtectedRoute>
        } />
        <Route path="/instance/:instanceId/scoring" element={
          <ProtectedRoute><Scoring /></ProtectedRoute>
        } />

        <Route path="/totaux" element={
          <ProtectedRoute><Totaux /></ProtectedRoute>
        } />

        <Route path="/rapport" element={
          <ProtectedRoute><Rapport /></ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>
        } />
        <Route path="/dashboard/:category" element={
          <ProtectedRoute adminOnly><DashboardCategoryDetail /></ProtectedRoute>
        } />
        <Route path="/dashboard/:category/subcategory/:subcategory" element={
          <ProtectedRoute adminOnly><DashboardSubCategoryDetail /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to={user ? "/supermarkets" : "/login"} replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
