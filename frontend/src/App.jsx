// frontend/src/App.jsx
import React from 'react';
// Import routing components
import { Routes, Route, Link, useNavigate } from 'react-router-dom';

// Import page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AddExpensePage from './pages/AddExpensePage';
import GroupsPage from './pages/GroupsPage'; // GroupsPage is already imported

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
    <div>
      {/* Navigation Bar */}
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>

           {/* --- ADDED: Link to Groups page when logged in --- */}
           {isLoggedIn && (
             <li>
               <Link to="/groups">Groups</Link>
             </li>
           )}
           {/* --- END ADDED LINK --- */}

          {/* Conditionally show Login/Signup or Logout based on auth state */}
          {isLoggedIn ? (
            <>
              <li>
                {/* Logout Button - displays username */}
                <button onClick={handleLogout}>
                  Logout ({user?.username || 'User'})
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/signup">Sign Up</Link></li>
            </>
          )}
        </ul>
      </nav>

      <hr /> {/* Visual separator */}

      {/* Application Routes */}
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