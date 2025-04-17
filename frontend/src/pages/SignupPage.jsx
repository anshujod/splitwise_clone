import React, { useState } from 'react';
// Optional: Import useNavigate from react-router-dom if you want to redirect after signup
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // <-- Import useAuth

function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(''); // State for displaying errors
  const [loading, setLoading] = useState(false); // State for loading indicator

  const navigate = useNavigate(); // Hook for navigation
  const { login } = useAuth(); // <-- Get login function from context

  const handleSubmit = async (event) => { // Make the function async
    event.preventDefault();
    setError(''); // Clear previous errors
    setLoading(true); // Set loading state

    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      setLoading(false);
      return;
    }

    // --- Call the backend API ---
    try {
      const response = await fetch('http://localhost:3001/api/auth/signup', { // Your backend URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Tell backend we're sending JSON
        },
        body: JSON.stringify({ // Convert JS object to JSON string
          username: username,
          email: email,
          password: password, // Send the plain password, backend will hash it
        }),
      });

      const data = await response.json(); // Parse the JSON response from backend

      if (!response.ok) {
        // Handle errors from backend (e.g., validation, user exists)
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      // --- Signup successful ---
      console.log('Signup successful:', data);
      // Automatically log in the user after successful signup
      if (data.token && data.user) {
          // Assuming your backend returns a token and user data on signup
          login(data.user, data.token); // Use the login function from context
          console.log('Auth context updated after signup');
          navigate('/'); // Redirect to home page after login
      } else {
          // This case might happen if the backend doesn't return token/user on signup
          console.error("Signup successful but backend did not return token/user data.");
          setError("Signup successful! Please log in."); // Inform user to log in manually
          navigate('/login'); // Redirect to login page as before
      }

    } catch (err) {
      // Handle network errors or errors thrown from response check
      console.error("Signup fetch Error:", err);
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
       setLoading(false); // Always turn off loading state
    }
    // --- End API Call ---
  };

  return (
    <div>
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit}>
        {/* ... (input fields remain the same) ... */}
         <div>
          <label htmlFor="signup-username">Username:</label>
          <input type="text" id="signup-username" name="username" required value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
        </div>
        <div>
          <label htmlFor="signup-email">Email:</label>
          <input type="email" id="signup-email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
        </div>
        <div>
          <label htmlFor="signup-password">Password:</label>
          <input type="password" id="signup-password" name="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        </div>
        <div>
           <label htmlFor="signup-confirm-password">Confirm Password:</label>
           <input type="password" id="signup-confirm-password" name="confirmPassword" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
        </div>
         {/* Display error message */}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'} {/* Show loading text */}
        </button>
      </form>
      <p>Already have an account? <a href="/login">Login</a></p>
    </div>
  );
}

export default SignupPage;