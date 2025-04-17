import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [groupDetails, setGroupDetails] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [groupBalances, setGroupBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (!groupId || !token) {
          return;
        }

        const [detailsRes, expensesRes, balancesRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(`/api/expenses?groupId=${groupId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(`/api/balance/detailed?groupId=${groupId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ]);

        if (!detailsRes.ok) {
          const data = await detailsRes.json();
          throw new Error(`Group Details Error: ${data.message}`);
        }

        if (!expensesRes.ok) {
          const data = await expensesRes.json();
          throw new Error(`Expenses Error: ${data.message}`);
        }

        if (!balancesRes.ok) {
          const data = await balancesRes.json();
          throw new Error(`Balances Error: ${data.message}`);
        }

        const [details, expenses, balances] = await Promise.all([
          detailsRes.json(),
          expensesRes.json(),
          balancesRes.json()
        ]);

        setGroupDetails(details);
        setGroupExpenses(expenses);
        setGroupBalances(balances);
      } catch (err) {
        console.error('Error fetching group data:', err);
        if (err.message.includes('403') || err.message.includes('404')) {
          setError('Group not found or you do not have access');
          navigate('/groups');
        } else {
          setError(err.message || 'Failed to load group data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId, token, navigate]);

  if (loading) {
    return <div>Loading group details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="group-detail">
      <h1>{groupDetails?.name}</h1>
      
      <section className="balances">
        <h2>Balances</h2>
        {groupBalances.map(balance => (
          <div key={balance.userId}>
            {balance.username}: ${balance.balance}
          </div>
        ))}
      </section>

      <section className="expenses">
        <h2>Expenses</h2>
        {groupExpenses.length > 0 ? (
          <ul>
            {groupExpenses.map(expense => (
              <li key={expense.id}>
                {expense.description} - ${expense.amount}
              </li>
            ))}
          </ul>
        ) : (
          <p>No expenses yet</p>
        )}
      </section>

      <Link to="/groups">Back to Groups</Link>
    </div>
  );
};

export default GroupDetailPage;