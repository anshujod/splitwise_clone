// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // For navigation link/button
import { useAuth } from '../context/AuthContext'; // To get user info and token

function HomePage() {
  // State for the list of user's expense splits
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [errorExpenses, setErrorExpenses] = useState('');

  // State for the user's overall balance summary
  const [balance, setBalance] = useState({ totalPaid: 0, totalOwed: 0, netBalance: 0 });
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [errorBalance, setErrorBalance] = useState('');

  // --- NEW: State for Detailed Balances (per person) ---
  const [detailedBalances, setDetailedBalances] = useState([]); // Array to hold balances with others
  const [loadingDetailed, setLoadingDetailed] = useState(true); // Loading status for detailed balances
  const [errorDetailed, setErrorDetailed] = useState('');     // Error status for detailed balances
  // --- End New State ---

  // Get authentication token and user details from context
  const { token, user } = useAuth();

  // useEffect hook: Fetch all necessary data when component mounts or token changes
  useEffect(() => {
    // Ensure token exists before attempting fetches
    if (!token) {
      setErrorExpenses("Not authenticated");
      setErrorBalance("Not authenticated");
      setErrorDetailed("Not authenticated"); // Set detailed error too
      setLoadingExpenses(false);
      setLoadingBalance(false);
      setLoadingDetailed(false); // Set detailed loading false
      return;
    }

    // --- Combined Fetching Function ---
    const fetchData = async () => {
      // Set all loading states to true, clear previous errors
      setLoadingExpenses(true); setLoadingBalance(true); setLoadingDetailed(true);
      setErrorExpenses(''); setErrorBalance(''); setErrorDetailed('');

      try {
        // Use Promise.all to fetch all required data concurrently
        const [expensesResponse, balanceResponse, detailedResponse] = await Promise.all([
          fetch('http://localhost:3001/api/expenses', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3001/api/balance/overall', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3001/api/balance/detailed', { headers: { 'Authorization': `Bearer ${token}` } }) // <-- Fetch detailed balances
        ]);

        // --- Process Expenses Response ---
        if (!expensesResponse.ok) {
          const errorData = await expensesResponse.json().catch(() => ({ message: 'Failed to parse expenses error' }));
          throw new Error(`Expenses Error: ${errorData.message || `HTTP ${expensesResponse.status}`}`);
        }
        const expensesData = await expensesResponse.json();
        console.log("Fetched expenses data:", expensesData);
        setExpenses(expensesData);

        // --- Process Overall Balance Response ---
        if (!balanceResponse.ok) {
          const errorData = await balanceResponse.json().catch(() => ({ message: 'Failed to parse overall balance error' }));
          throw new Error(`Overall Balance Error: ${errorData.message || `HTTP ${balanceResponse.status}`}`);
        }
        const balanceData = await balanceResponse.json();
        console.log("Fetched overall balance data:", balanceData);
        setBalance(balanceData);

        // --- Process Detailed Balance Response --- // <-- NEW PROCESSING
        if (!detailedResponse.ok) {
            const errorData = await detailedResponse.json().catch(() => ({ message: 'Failed to parse detailed balance error' }));
            throw new Error(`Detailed Balance Error: ${errorData.message || `HTTP ${detailedResponse.status}`}`);
        }
        const detailedData = await detailedResponse.json(); // Expecting array: [{ userId, username, balance }]
        console.log("Fetched detailed balances:", detailedData);
        setDetailedBalances(detailedData); // <-- Update detailed balance state
        // --- End New Processing ---

      } catch (err) {
        console.error("Error fetching data:", err);
        // Set specific or general errors based on error message content
        if (err.message.includes('Expenses Error')) setErrorExpenses(err.message);
        else if (err.message.includes('Overall Balance Error')) setErrorBalance(err.message);
        else if (err.message.includes('Detailed Balance Error')) setErrorDetailed(err.message); // <-- Set detailed error
        else {
          // Set general error if origin unknown
          setErrorExpenses('Failed to load some data.');
          setErrorBalance('Failed to load some data.');
          setErrorDetailed('Failed to load some data.'); // <-- Set general detailed error
        }
      } finally {
        // Ensure all loading states are set to false after fetches complete/fail
        setLoadingExpenses(false); setLoadingBalance(false); setLoadingDetailed(false);
      }
    };

    fetchData(); // Execute the combined fetch function

  }, [token]); // Dependency array: re-run effect if token changes


  // --- Helper Function to Render Overall Balance Summary (no changes needed) ---
  const renderBalanceSummary = () => {
    if (loadingBalance) return <p>Loading balance...</p>;
    if (errorBalance) return <p style={{ color: 'orange' }}>Could not load balance: {errorBalance}</p>;
    const { netBalance } = balance;
    const balanceAmount = Math.abs(netBalance).toFixed(2);
    if (Math.abs(netBalance) < 0.01) { return <p style={{ color: 'green', fontWeight: 'bold' }}>You are all settled up!</p>; }
    else if (netBalance > 0) { return <p style={{ color: 'green', fontWeight: 'bold' }}>Overall, you are owed ${balanceAmount}</p>; }
    else { return <p style={{ color: 'red', fontWeight: 'bold' }}>Overall, you owe ${balanceAmount}</p>; }
 };

  // --- Render the component ---
  return (
    <div>
      <h1>Home Page</h1>
      {/* Welcome message */}
      <h2>Welcome, {user?.username || 'User'}!</h2>

      {/* Overall Balance Summary Section */}
      <div style={{ border: '1px solid grey', padding: '15px', margin: '20px 0', backgroundColor: 'black' }}>
        <h3>Overall Balance Summary:</h3>
        {renderBalanceSummary()}
        { !loadingBalance && !errorBalance &&
          <p style={{fontSize: '0.9em'}}>
              (Total you paid: ${balance.totalPaid.toFixed(2)} | Total your share: ${balance.totalOwed.toFixed(2)})
          </p>
        }
      </div>

      {/* --- NEW: Detailed Balance Section --- */}
      <div style={{ margin: '20px 0' }}>
          <h3>Who Owes Whom:</h3>
          {/* Display loading state for detailed balances */}
          {loadingDetailed && <p>Loading detailed balances...</p>}
          {/* Display error state for detailed balances */}
          {errorDetailed && <p style={{ color: 'red' }}>Error: {errorDetailed}</p>}
          {/* Display message if no balances and not loading/error */}
          {!loadingDetailed && !errorDetailed && detailedBalances.length === 0 && (
              <p>No outstanding balances with anyone.</p>
          )}
          {/* Display the list of detailed balances */}
          {!loadingDetailed && !errorDetailed && detailedBalances.length > 0 && (
              <ul>
                  {detailedBalances.map(item => (
                      <li key={item.userId}>
                          {/* Check if balance is positive (they owe you) or negative (you owe them) */}
                          {item.balance > 0 ? (
                              <span style={{ color: 'green' }}>
                                  {item.username} owes you ${item.balance.toFixed(2)}
                              </span>
                          ) : (
                              <span style={{ color: 'red' }}>
                                  You owe {item.username} ${Math.abs(item.balance).toFixed(2)}
                              </span>
                          )}
                      </li>
                  ))}
              </ul>
          )}
      </div>
      {/* --- End Detailed Balance Section --- */}

      {/* Add Expense Button/Link */}
      <div style={{ margin: '20px 0' }}>
        <Link to="/add-expense">
          <button>Add New Expense</button>
        </Link>
      </div>

      {/* Your Expenses List Section */}
      <h3>Your Expenses:</h3>
      {/* Display loading/error/empty state for expenses */}
      {loadingExpenses && <p>Loading expenses...</p>}
      {!loadingExpenses && errorExpenses && <p style={{ color: 'red' }}>Error fetching expenses: {errorExpenses}</p>}
      {!loadingExpenses && !errorExpenses && expenses.length === 0 && (
         <p>You currently have no expenses recorded.</p>
      )}
      {/* Display the list of expenses */}
      {!loadingExpenses && !errorExpenses && expenses.length > 0 && (
         <ul>
          {expenses.map((split) => (
            <li key={split.id} style={{ borderBottom: '1px solid #ccc', marginBottom: '10px', paddingBottom: '10px' }}>
              <strong>Description:</strong> {split.expense.description} <br />
              <strong>Total Amount:</strong> ${split.expense.amount.toFixed(2)} <br />
              <strong>Paid By:</strong> {split.expense.paidBy.username} <br />
              <strong>Group:</strong> {split.expense.group.name} <br />
              <strong>Date:</strong> {new Date(split.expense.date).toLocaleDateString()} <br />
              <strong>Your Share:</strong> ${split.amountOwed.toFixed(2)}
            </li>
          ))}
         </ul>
      )}
    </div>
  );
}

export default HomePage;