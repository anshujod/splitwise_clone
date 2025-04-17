import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RecordPaymentModal from '../components/RecordPaymentModal';

function HomePage() {
  // State management
  const { token, user } = useAuth();
  
  // Data states
  const [expenses, setExpenses] = useState([]);
  const [balance, setBalance] = useState({ totalPaid: 0, totalOwed: 0, netBalance: 0 });
  const [detailedBalances, setDetailedBalances] = useState([]);
  
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
      console.error("Error fetching data:", err);
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

  const handleSubmitPayment = async (amount) => {
    try {
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
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Payment error:', error);
      setModalError(error.message || 'Failed to record payment');
    }
  };

  // Render functions
  const renderBalanceSummary = () => {
    if (loading.balance) return <p>Loading balance...</p>;
    if (errors.balance) return <p style={{ color: 'orange' }}>Could not load balance: {errors.balance}</p>;
    
    const { netBalance } = balance;
    const balanceAmount = Math.abs(netBalance).toFixed(2);
    
    if (Math.abs(netBalance) < 0.01) {
      return <p style={{ color: 'green', fontWeight: 'bold' }}>You are all settled up!</p>;
    } else if (netBalance > 0) {
      return <p style={{ color: 'green', fontWeight: 'bold' }}>Overall, you are owed ${balanceAmount}</p>;
    } else {
      return <p style={{ color: 'red', fontWeight: 'bold' }}>Overall, you owe ${balanceAmount}</p>;
    }
  };

  return (
    <div>
      <h1>Home Page</h1>
      <h2>Welcome, {user?.username || 'User'}!</h2>

      {/* Balance Summary */}
      <div style={{ border: '1px solid grey', padding: '15px', margin: '20px 0', backgroundColor: 'black' }}>
        <h3>Overall Balance Summary:</h3>
        {renderBalanceSummary()}
        {!loading.balance && !errors.balance && (
          <p style={{fontSize: '0.9em'}}>
            (Total you paid: ${balance.totalPaid.toFixed(2)} | Total your share: ${balance.totalOwed.toFixed(2)})
          </p>
        )}
      </div>

      {/* Detailed Balances */}
      <div style={{ margin: '20px 0' }}>
        <h3>Who Owes Whom:</h3>
        {loading.detailed && <p>Loading detailed balances...</p>}
        {errors.detailed && <p style={{ color: 'red' }}>Error: {errors.detailed}</p>}
        {!loading.detailed && !errors.detailed && detailedBalances.length === 0 && (
          <p>No outstanding balances with anyone.</p>
        )}
        {!loading.detailed && !errors.detailed && detailedBalances.length > 0 && (
          <ul>
            {detailedBalances.map(item => (
              <li key={item.userId}>
                {item.balance > 0 ? (
                  <span style={{ color: 'green' }}>
                    {item.username} owes you ${item.balance.toFixed(2)}
                  </span>
                ) : (
                  <span style={{ color: 'red' }}>
                    You owe {item.username} ${Math.abs(item.balance.toFixed(2))}
                  </span>
                )}
                <button 
                  style={{ marginLeft: '10px', fontSize: '0.8em' }}
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
          error={modalError}
        />
      )}

      {/* Add Expense Button */}
      <div style={{ margin: '20px 0' }}>
        <Link to="/add-expense">
          <button>Add New Expense</button>
        </Link>
      </div>

      {/* Expenses List */}
      <h3>Your Expenses:</h3>
      {loading.expenses && <p>Loading expenses...</p>}
      {!loading.expenses && errors.expenses && <p style={{ color: 'red' }}>Error fetching expenses: {errors.expenses}</p>}
      {!loading.expenses && !errors.expenses && expenses.length === 0 && (
        <p>You currently have no expenses recorded.</p>
      )}
      {!loading.expenses && !errors.expenses && expenses.length > 0 && (
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