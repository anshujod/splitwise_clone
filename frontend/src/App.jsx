// frontend/src/App.jsx
import React from 'react';
import { Toaster } from '@/components/ui/sonner';
import EditExpensePage from './pages/EditExpensePage';
// Import routing components
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
// Import Shadcn UI components
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
// Import icons
import { Menu, Home, Users, User, LogOut } from 'lucide-react';

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
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          {/* Left side - Brand/Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-blue-600">Splitwise</Link>
          </div>

          {/* Center - Desktop Navigation Links */}
          <div className="hidden md:flex md:space-x-6">
            <Link to="/" className="text-gray-800 hover:text-blue-600 font-medium flex items-center">
              <Home className="h-4 w-4 mr-1" />
              <span>Home</span>
            </Link>
            {isLoggedIn && (
              <Link to="/groups" className="text-gray-800 hover:text-blue-600 font-medium flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>Groups</span>
              </Link>
            )}
          </div>

          {/* Right side - User/Auth Controls */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                {/* Desktop User Dropdown */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{user?.username || 'User'}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile Menu Trigger */}
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px]">
                      <SheetHeader>
                        <SheetTitle>Menu</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col space-y-4 pt-6">
                        <SheetClose asChild>
                          <Link to="/" className="flex items-center space-x-2 text-gray-800 hover:text-blue-600">
                            <Home className="h-4 w-4" />
                            <span>Home</span>
                          </Link>
                        </SheetClose>
                        {isLoggedIn && (
                          <>
                            <SheetClose asChild>
                              <Link to="/groups" className="flex items-center space-x-2 text-gray-800 hover:text-blue-600">
                                <Users className="h-4 w-4" />
                                <span>Groups</span>
                              </Link>
                            </SheetClose>
                            <Separator />
                            <SheetClose asChild>
                              <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 text-gray-800 hover:text-blue-600"
                              >
                                <LogOut className="h-4 w-4" />
                                <span>Logout</span>
                              </button>
                            </SheetClose>
                          </>
                        )}
                        {!isLoggedIn && (
                          <>
                            <SheetClose asChild>
                              <Link to="/login" className="flex items-center space-x-2 text-gray-800 hover:text-blue-600">
                                <span>Login</span>
                              </Link>
                            </SheetClose>
                            <SheetClose asChild>
                              <Link to="/signup" className="flex items-center space-x-2 text-gray-800 hover:text-blue-600">
                                <span>Sign Up</span>
                              </Link>
                            </SheetClose>
                          </>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            ) : (
              <>
                {/* Desktop Auth Links */}
                <div className="hidden md:flex md:space-x-4">
                  <Link to="/login" className="text-gray-800 hover:text-blue-600 font-medium">Login</Link>
                  <Link to="/signup" className="text-gray-800 hover:text-blue-600 font-medium">Sign Up</Link>
                </div>

                {/* Mobile Menu Trigger */}
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px]">
                      <SheetHeader>
                        <SheetTitle>Menu</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col space-y-4 pt-6">
                        <SheetClose asChild>
                          <Link to="/login" className="flex items-center space-x-2 text-gray-800 hover:text-blue-600">
                            <span>Login</span>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to="/signup" className="flex items-center space-x-2 text-gray-800 hover:text-blue-600">
                            <span>Sign Up</span>
                          </Link>
                        </SheetClose>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            )}
          </div>
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
        {/* Edit Expense Page Route */}
        <Route
          path="/edit-expense/:expenseId"
          element={ <ProtectedRoute> <EditExpensePage /> </ProtectedRoute> }
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
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;