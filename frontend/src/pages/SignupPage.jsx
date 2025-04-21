import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const form = useForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100">
      <div className="w-full max-w-md px-6 py-8">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <div className="px-10 py-12">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2 animate-fade-in">
                Splitsync
              </h1>
              <h2 className="text-2xl font-bold text-gray-800 mb-1 animate-bounce-in">Create Account</h2>
              <p className="text-gray-600 animate-fade-in">Join us today</p>
            </div>

            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <FormField
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Choose a username"
                          disabled={loading}
                          {...field}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          disabled={loading}
                          {...field}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={loading}
                          {...field}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={loading}
                          {...field}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;