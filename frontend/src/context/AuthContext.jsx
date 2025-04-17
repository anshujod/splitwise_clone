import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user object {id, username, email}
  const [token, setToken] = useState(localStorage.getItem('authToken') || null); // Get token from localStorage on initial load
  const [isLoggedIn, setIsLoggedIn] = useState(!!token); // Check if token exists initially
  console.log('AuthContext initial state:', { user, token, isLoggedIn });

  // Effect to update state if localStorage changes (e.g., login/logout)
  // Also runs on initial load to parse stored user data
  useEffect(() => {
    console.log('AuthContext useEffect running - checking localStorage');
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    console.log('AuthContext localStorage values:', { storedToken, storedUser });

    if (storedToken) {
      console.log('AuthContext found token in localStorage');
      setToken(storedToken);
      setIsLoggedIn(true);
      if (storedUser) {
         try {
           const parsedUser = JSON.parse(storedUser);
           console.log('AuthContext parsed user from localStorage:', parsedUser);
           setUser(parsedUser);
         } catch (e) {
           console.error("Failed to parse stored user data", e);
           // Clear potentially corrupted data
           localStorage.removeItem('user');
           setUser(null);
         }
      }
    } else {
      console.log('AuthContext no token found in localStorage - clearing state');
      // Ensure state is cleared if token is not found
      setToken(null);
      setUser(null);
      setIsLoggedIn(false);
    }
  }, [token]); // Re-run if the token state changes (e.g., after login sets it)


  // --- Login Function ---
  const login = (userData, receivedToken) => {
    console.log('AuthContext login called with:', { userData, receivedToken });
    localStorage.setItem('authToken', receivedToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(receivedToken); // Update state
    setUser(userData);        // Update state
    setIsLoggedIn(true);      // Update state
    console.log("AuthContext: User logged in - current state:", {
      user: userData,
      token: receivedToken,
      isLoggedIn: true
    });
  };

  // --- Logout Function ---
  const logout = () => {
    console.log('AuthContext logout called');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);        // Clear state
    setUser(null);         // Clear state
    setIsLoggedIn(false);  // Clear state
    console.log("AuthContext: User logged out - current state:", {
      user: null,
      token: null,
      isLoggedIn: false
    });
    // Optional: Redirect to login page using navigate (if needed here)
  };

  // Value provided to consuming components
  const value = {
    isLoggedIn,
    user,
    token,
    login, // Expose login function
    logout, // Expose logout function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Create a custom hook for easy consumption
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};