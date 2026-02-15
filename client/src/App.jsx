import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Supermarkets from './pages/Supermarkets';
import SupermarketDetail from './pages/SupermarketDetail';
import InstanceDetail from './pages/InstanceDetail';
import Dashboard from './pages/Dashboard';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
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

        <Route path="/dashboard" element={
          <ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>
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
