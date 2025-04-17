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

        const API_BASE = 'http://localhost:3001';
        const [detailsRes, expensesRes, balancesRes] = await Promise.all([
          fetch(`${API_BASE}/api/groups/${groupId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(`${API_BASE}/api/expenses?groupId=${groupId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(`${API_BASE}/api/balance/detailed?groupId=${groupId}`, {
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
          const text = await expensesRes.text();
          throw new Error(text.includes('<!doctype') ?
            'Server returned HTML error page' :
            text || 'Failed to fetch expenses');
        }

        if (!balancesRes.ok) {
          const text = await balancesRes.text();
          throw new Error(text.includes('<!doctype') ?
            'Server returned HTML error page' :
            text || 'Failed to fetch balances');
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

  // Calculate group balance summary
  let groupTotalOwedByUser = 0;
  let groupTotalOwedToUser = 0;
  
  if (groupBalances?.length > 0) {
    groupBalances.forEach(balance => {
      if (balance.balance < 0) {
        groupTotalOwedByUser += Math.abs(balance.balance);
      } else if (balance.balance > 0) {
        groupTotalOwedToUser += balance.balance;
      }
    });
  }

  const netGroupBalance = groupTotalOwedToUser - groupTotalOwedByUser;

  return (
    <div className="group-detail">
      <h1>{groupDetails?.name}</h1>
      
      <section className="balance-summary" style={{margin: '20px 0', padding: '15px', border: '1px solid #eee', borderRadius: '5px'}}>
        <h2>Your Summary for this Group</h2>
        <div>Total you are owed in this group: ${groupTotalOwedToUser.toFixed(2)}</div>
        <div>Total you owe in this group: ${groupTotalOwedByUser.toFixed(2)}</div>
        <div style={{
          color: netGroupBalance > 0 ? 'green' : netGroupBalance < 0 ? 'red' : 'green',
          fontWeight: 'bold',
          marginTop: '10px'
        }}>
          {netGroupBalance > 0 ? `In this group, you are owed $${netGroupBalance.toFixed(2)} overall.` :
           netGroupBalance < 0 ? `In this group, you owe $${Math.abs(netGroupBalance).toFixed(2)} overall.` :
           'In this group, you are settled up.'}
        </div>
      </section>

      <button
        onClick={() => navigate('/add-expense', { state: { defaultGroupId: groupId } })}
        style={{margin: '15px 0'}}
      >
        Add Expense to this Group
      </button>

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