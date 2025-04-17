import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// This component wraps routes that require authentication
// It checks if the user is logged in using the AuthContext.
// If logged in, it renders the child components (the actual page).
// If not logged in, it redirects the user to the login page,
// remembering the page they tried to access so they can be sent back after login.

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth(); // Get the current login status
  const location = useLocation(); // Get the current location object

  if (!isLoggedIn) {
    // If not logged in, redirect to the login page
    // We pass the current location in state. This allows the login page
    // (if we enhance it later) to redirect back here after successful login.
    console.log('ProtectedRoute: Not logged in, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in, render the component that was passed as children
  return children;
}

export default ProtectedRoute;