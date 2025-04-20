// frontend/src/App.jsx
import React from 'react';
import { Toaster } from '@/components/ui/sonner';
// Import routing components
import { Routes, Route, Link, useNavigate } from 'react-router-dom';

// Import page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AddExpensePage from './pages/AddExpensePage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';

// Import Auth context and ProtectedRoute component
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import default CSS
import './App.css';


function App() {
  // Get auth state and functions from context
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

  // Handle user logout
  const handleLogout = () => {
    logout(); // Call the logout function from context
    navigate('/login'); // Redirect to login page after logout
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <ul className="flex items-center space-x-6">
            <li><Link to="/" className="text-gray-800 hover:text-blue-600 font-medium">Home</Link></li>

            {/* --- ADDED: Link to Groups page when logged in --- */}
            {isLoggedIn && (
              <li>
                <Link to="/groups" className="text-gray-800 hover:text-blue-600 font-medium">Groups</Link>
              </li>
            )}
            {/* --- END ADDED LINK --- */}

            {/* Conditionally show Login/Signup or Logout based on auth state */}
            {isLoggedIn ? (
              <div className="ml-auto flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user?.username || 'User'}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-red-700 bg-red-100 hover:bg-red-200 rounded-md font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="ml-auto flex items-center space-x-4">
                <li><Link to="/login" className="text-gray-800 hover:text-blue-600 font-medium">Login</Link></li>
                <li><Link to="/signup" className="text-gray-800 hover:text-blue-600 font-medium">Sign Up</Link></li>
              </div>
            )}
          </ul>
        </div>
      </nav>

      {/* Application Routes */}
      <Routes>
        {/* --- Protected Routes --- */}
        {/* Home Page Route */}
        <Route
          path="/"
          element={ <ProtectedRoute> <HomePage /> </ProtectedRoute> }
        />
        {/* Add Expense Page Route */}
        <Route
          path="/add-expense"
          element={ <ProtectedRoute> <AddExpensePage /> </ProtectedRoute> }
        />
        {/* Groups List Page Route */}
         <Route
           path="/groups" // Path for the list of groups
           element={
             <ProtectedRoute> {/* Ensure user must be logged in */}
               <GroupsPage />
             </ProtectedRoute>
           }
         />
         
         {/* Group Detail Page Route */}
         <Route
           path="/groups/:groupId" // Path for individual group details
           element={
             <ProtectedRoute>
               <GroupDetailPage />
             </ProtectedRoute>
           }
         />


        {/* --- Public Routes --- */}
        {/* Login Page Route */}
        <Route path="/login" element={<LoginPage />} />
        {/* Signup Page Route */}
        <Route path="/signup" element={<SignupPage />} />

        {/* TODO: Add a 404 Not Found route later */}
        {/* Example: <Route path="*" element={<div>404 Not Found</div>} /> */}

      </Routes>
    </div>
  );
}

export default App;