import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { toast } from 'sonner';

function HomePage() {
  // State management
  const { token, user } = useAuth();
  
  // Data states
  const [expenses, setExpenses] = useState([]);
  const [balance, setBalance] = useState({ totalPaid: 0, totalOwed: 0, netBalance: 0 });
  const [detailedBalances, setDetailedBalances] = useState([]);
  const [deletingExpenses, setDeletingExpenses] = useState({}); // Track deleting state per expense
  
  // Loading states
  const [loading, setLoading] = useState({
    expenses: true,
    balance: true,
    detailed: true
  });
  
  // Error states
  const [errors, setErrors] = useState({
    expenses: '',
    balance: '', 
    detailed: ''
  });

  // Payment modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTargetUser, setModalTargetUser] = useState(null);
  const [modalBalanceDirection, setModalBalanceDirection] = useState(null);
  const [modalError, setModalError] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!token) {
      setErrors({
        expenses: "Not authenticated",
        balance: "Not authenticated",
        detailed: "Not authenticated"
      });
      setLoading({
        expenses: false,
        balance: false,
        detailed: false
      });
      return;
    }

    try {
      // Set loading states
      setLoading({
        expenses: true,
        balance: true,
        detailed: true
      });
      setErrors({
        expenses: '',
        balance: '',
        detailed: ''
      });

      // Fetch all data
      const [expensesResponse, balanceResponse, detailedResponse] = await Promise.all([
        fetch('http://localhost:3001/api/expenses', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:3001/api/balance/overall', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:3001/api/balance/detailed', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      // Handle responses
      if (!expensesResponse.ok) throw new Error(`Expenses Error: ${await expensesResponse.text()}`);
      if (!balanceResponse.ok) throw new Error(`Balance Error: ${await balanceResponse.text()}`);
      if (!detailedResponse.ok) throw new Error(`Detailed Balance Error: ${await detailedResponse.text()}`);

      const [expensesData, balanceData, detailedData] = await Promise.all([
        expensesResponse.json(),
        balanceResponse.json(),
        detailedResponse.json()
      ]);

      // Update states
      setExpenses(expensesData);
      setBalance(balanceData);
      setDetailedBalances(detailedData);
    } catch (err) {
      // Log error to error reporting service in production
      setErrors({
        expenses: err.message.includes('Expenses') ? err.message : 'Failed to load expenses',
        balance: err.message.includes('Balance') ? err.message : 'Failed to load balance',
        detailed: err.message.includes('Detailed') ? err.message : 'Failed to load detailed balances'
      });
    } finally {
      setLoading({
        expenses: false,
        balance: false,
        detailed: false
      });
    }
  }, [token]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Payment modal handlers
  const handleOpenPaymentModal = (user, direction) => {
    setModalTargetUser(user);
    setModalBalanceDirection(direction);
    setModalOpen(true);
    setModalError('');
  };

  const handleClosePaymentModal = () => {
    setModalOpen(false);
    setModalTargetUser(null);
    setModalBalanceDirection(null);
    setModalError('');
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return; // Stop if user cancels
    }

    try {
      setDeletingExpenses(prev => ({...prev, [expenseId]: true}));
      setErrors(prev => ({...prev, expenses: ''})); // Clear any existing errors
      
      const response = await fetch(`http://localhost:3001/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 204 || response.ok) {
        toast.success('Expense deleted successfully!');
        fetchData(); // Refresh the data
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete expense');
      }
    } catch (error) {
      // Log error to error reporting service in production
      toast.error(error.message || 'Failed to delete expense');
    } finally {
      setDeletingExpenses(prev => ({...prev, [expenseId]: false}));
    }
  };

  const handleSubmitPayment = async (amount) => {
    try {
      setProcessingPayment(true);
      setModalError('');
      
      const payerId = modalBalanceDirection === 'owesYou' ? modalTargetUser.userId : user.id;
      const payeeId = modalBalanceDirection === 'owesYou' ? user.id : modalTargetUser.userId;

      const response = await fetch('http://localhost:3001/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payeeId,
          amount,
          payerId
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Refresh data and close modal
      await fetchData();
      handleClosePaymentModal();
      toast.success('Payment recorded successfully!');
    } catch (error) {
      // Log error to error reporting service in production
      setModalError(error.message || 'Failed to record payment');
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Render functions
  const renderBalanceSummary = () => {
    if (loading.balance) return <p className="text-gray-600">Loading balance...</p>;
    if (errors.balance) return <p className="text-orange-500">Could not load balance: {errors.balance}</p>;
    
    const { netBalance } = balance;
    const balanceAmount = Math.abs(netBalance).toFixed(2);
    
    if (Math.abs(netBalance) < 0.01) {
      return <p className="text-green-600 font-bold">You are all settled up!</p>;
    } else if (netBalance > 0) {
      return <p className="text-green-600 font-bold">Overall, you are owed ${balanceAmount}</p>;
    } else {
      return <p className="text-red-600 font-bold">Overall, you owe ${balanceAmount}</p>;
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Home Page</h1>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Welcome, {user?.username || 'User'}!</h2>

      {/* Balance Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 my-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Overall Balance Summary</h3>
        {renderBalanceSummary()}
        {!loading.balance && !errors.balance && (
          <p className="text-sm text-gray-600 mt-2">
            (Total you paid: ${balance.totalPaid.toFixed(2)} | Total your share: ${balance.totalOwed.toFixed(2)})
          </p>
        )}
      </div>

      {/* Detailed Balances */}
      <div className="my-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Who Owes Whom</h3>
        {loading.detailed && <p className="text-gray-600">Loading detailed balances...</p>}
        {errors.detailed && <p className="text-red-500">Error: {errors.detailed}</p>}
        {!loading.detailed && !errors.detailed && detailedBalances.length === 0 && (
          <p className="text-gray-600">No outstanding balances with anyone.</p>
        )}
        {!loading.detailed && !errors.detailed && detailedBalances.length > 0 && (
          <ul className="space-y-2">
            {detailedBalances.map(item => (
              <li key={item.userId} className="bg-gray-50 p-3 rounded border border-gray-200 flex justify-between items-center">
                {item.balance > 0 ? (
                  <span className="text-green-600 font-medium">
                    {item.username} owes you ${item.balance.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    You owe {item.username} ${Math.abs(item.balance.toFixed(2))}
                  </span>
                )}
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-xs py-1 px-2 rounded transition-colors"
                  onClick={() => handleOpenPaymentModal(
                    { userId: item.userId, username: item.username },
                    item.balance > 0 ? 'owesYou' : 'youOwe'
                  )}
                >
                  {item.balance > 0 ? 'Record Payment Received' : 'Record Payment Made'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payment Modal */}
      {modalOpen && (
        <RecordPaymentModal
          isOpen={modalOpen}
          onClose={handleClosePaymentModal}
          onSubmit={handleSubmitPayment}
          targetUser={modalTargetUser}
          balanceDirection={modalBalanceDirection}
          currentBalance={Math.abs(
            detailedBalances.find(b => b.userId === modalTargetUser.userId)?.balance || 0
          )}
          error={modalError}
          processing={processingPayment}
        />
      )}

      {/* Add Expense Button */}
      <div className="my-6">
        <Link to="/add-expense">
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded shadow-md transition-colors">
            Add New Expense
          </button>
        </Link>
      </div>

      {/* Expenses List */}
      <h3 className="text-xl font-semibold text-gray-800 mb-3">Your Expenses</h3>
      {loading.expenses && <p className="text-gray-600">Loading expenses...</p>}
      {!loading.expenses && errors.expenses && <p className="text-red-500">Error fetching expenses: {errors.expenses}</p>}
      {!loading.expenses && !errors.expenses && expenses.length === 0 && (
        <p className="text-gray-600">You currently have no expenses recorded.</p>
      )}
      {!loading.expenses && !errors.expenses && expenses.length > 0 && (
        <ul className="space-y-4">
          {expenses.map((split) => (
            <li key={split.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <p className="font-medium text-gray-700">Description: {split.expense.description}</p>
                  <p className="text-sm text-gray-500">Total: ${split.expense.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Paid by: {split.expense.paidBy.username}</p>
                  <p className="text-sm text-gray-500">Group: {split.expense.group.name}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Date: {new Date(split.expense.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500 mt-1">Your share: ${split.amountOwed.toFixed(2)}</p>
                  {split.expense.paidById === user?.id && (
                    <div className="mt-2 space-x-2">
                      <button
                        onClick={() => handleDeleteExpense(split.expense.id)}
                        disabled={deletingExpenses[split.expense.id]}
                        className={`text-xs text-red-600 hover:text-red-800 hover:underline flex items-center ${
                          deletingExpenses[split.expense.id] ? 'opacity-70' : ''
                        }`}
                      >
                        {deletingExpenses[split.expense.id] ? (
                          <>
                            <svg className="animate-spin mr-1 h-3 w-3 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </>
                        ) : 'Delete'}
                      </button>
                      <Link
                        to={`/edit-expense/${split.expense.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default HomePage;