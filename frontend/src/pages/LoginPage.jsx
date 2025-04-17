// LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // <-- Import useAuth

function LoginPage() {
  // ... (email, password, error, loading states remain the same)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth(); // <-- Get login function from context

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    console.log('LoginPage: Starting login attempt for email:', email);

    try {
      console.log('LoginPage: Making API call to /api/auth/login');
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('LoginPage: Received response, status:', response.status);

      // Check if the response status indicates success (e.g., 2xx)
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          // Try to parse error message from backend if response is JSON
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.log('LoginPage: Error response data:', errorData);
        } catch (parseError) {
          // If response is not JSON or parsing fails, use the status text
          errorMessage = response.statusText || errorMessage;
          console.error("LoginPage: Could not parse error response:", parseError);
        }
        throw new Error(errorMessage); // Throw error to be caught below
      }

      // Only parse JSON if response is ok
      const data = await response.json();
      console.log('LoginPage: Parsed response data:', data);

      // --- Login successful ---
      console.log('LoginPage: API login successful, calling AuthContext login');

      if (data.token && data.user) {
         // !! Use the context's login function !!
         console.log('LoginPage: Calling login() with token and user data');
         login(data.user, data.token);
         console.log('LoginPage: AuthContext login called, navigating to home');
         navigate('/'); // Redirect to the Home page
      } else {
         const errorMsg = "Login successful but missing token or user data.";
         console.error("LoginPage:", errorMsg, "Response data:", data);
         throw new Error(errorMsg);
      }

    } catch (err) {
      console.error("Login fetch Error:", err);
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
      // ... (JSX remains the same) ...
       <div>
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
            {/* Input fields */}
            <div><label htmlFor="login-email">Email:</label><input type="email" id="login-email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} /></div>
            <div><label htmlFor="login-password">Password:</label><input type="password" id="login-password" name="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} /></div>
            {/* Error display */}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {/* Submit button */}
            <button type="submit" disabled={loading}>{loading ? 'Logging In...' : 'Login'}</button>
        </form>
        <p>Don't have an account? <a href="/signup">Sign Up</a></p>
       </div>
  );
}

export default LoginPage;