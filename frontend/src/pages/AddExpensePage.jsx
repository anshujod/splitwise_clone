// frontend/src/pages/AddExpensePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

function AddExpensePage() {
  // Form input states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [groupId, setGroupId] = useState(''); // Selected group ID

  // --- State for Payer selection ---
  const [payerId, setPayerId] = useState(''); // Selected Payer ID
  const [groupMembers, setGroupMembers] = useState([]); // Members of the *selected* group
  const [loadingMembers, setLoadingMembers] = useState(false); // Loading state for members dropdown
  // --- End Payer State ---

  // General states
  const [userGroups, setUserGroups] = useState([]); // List of user's groups
  const [loadingGroups, setLoadingGroups] = useState(true); // Loading state for groups dropdown
  const [loadingSubmit, setLoadingSubmit] = useState(false); // Loading state for form submission
  const [error, setError] = useState(''); // Combined error state for the page
  const [splitMethod, setSplitMethod] = useState('equally'); // Split method
  const [splitAmounts, setSplitAmounts] = useState({}); // Track split amounts per member
  const [splitPercentages, setSplitPercentages] = useState({}); // Track split percentages
  const [splitShares, setSplitShares] = useState({}); // Track split shares

  // Get authentication token and logged-in user details from context
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // Effect 1: Fetch User's Groups (when component mounts or token changes)
  useEffect(() => {
    const fetchGroups = async () => {
      if (!token) {
          console.log("AddExpensePage: No token, cannot fetch groups.");
          setLoadingGroups(false);
          return;
      }
      setLoadingGroups(true);
      setError('');
      try {
        const response = await fetch('http://localhost:3001/api/groups', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const e = await response.json().catch(()=>({}));
            throw new Error(e.message || `Failed to fetch groups (HTTP ${response.status})`);
        }
        const groupsData = await response.json();
        console.log('Groups API response:', groupsData);
        
        // Ensure groups have members data
        const groupsWithMembers = groupsData.map(group => ({
            ...group,
            members: group.members || []
        }));
        setUserGroups(groupsWithMembers);
        // Set default payer to logged-in user initially
        if (user?.id && !payerId) {
            setPayerId(user.id);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch groups.');
        console.error("Fetch Groups Error:", err);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, [token, user?.id]);

  // Effect 2: Fetch/Set Members when Group Selection Changes
  useEffect(() => {
    if (!groupId) {
      setGroupMembers([]);
      return;
    }

    setLoadingMembers(true);
    console.log(`Group selected: ${groupId}. Finding members...`);

    const selectedGroupData = userGroups.find(g => g.id === groupId);

    if (selectedGroupData && selectedGroupData.members) {
      const members = selectedGroupData.members.map(member => {
        if (member.user) {
          return member.user;
        }
        return {
          id: member.userId || member.id,
          username: member.username || member.name
        };
      }).filter(member => member.id && member.username);
      
      setGroupMembers(members);
      console.log('Members for selected group:', members);

      const currentPayerIsValidMember = members.some(m => m.id === payerId);
      const loggedInUserIsMember = members.some(m => m.id === user?.id);

      if (!currentPayerIsValidMember && loggedInUserIsMember) {
          console.log("Current payer not in group, defaulting to logged-in user.");
          setPayerId(user.id);
      } else if (!payerId && loggedInUserIsMember) {
          console.log("No payer selected, defaulting to logged-in user.");
          setPayerId(user.id);
      }
    } else {
      console.warn("Member data not found in userGroups state for groupId:", groupId);
      setGroupMembers([]);
      setError("Could not load members for the selected group.");
    }

    setLoadingMembers(false);
  }, [groupId, userGroups, user?.id]);

  // Effect 3: Reset split states when method changes
  useEffect(() => {
    setSplitAmounts({});
    setSplitPercentages({});
    setSplitShares({});
  }, [splitMethod]);

  const handleSplitAmountChange = (memberId, value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSplitAmounts(prev => ({
        ...prev,
        [memberId]: value
      }));
    }
  };

  const handleSplitPercentageChange = (memberId, value) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSplitPercentages(prev => ({
        ...prev,
        [memberId]: value
      }));
    }
  };

  const handleSplitSharesChange = (memberId, value) => {
    if (value === '' || /^\d*$/.test(value)) {
      setSplitShares(prev => ({
        ...prev,
        [memberId]: value
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Basic validation
    if (!description.trim() || !amount || !groupId || !payerId) {
      setError('Please fill out all fields: Description, Amount, Group, and Paid By.');
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    // Method-specific validation
    let splitsPayload = [];
    switch(splitMethod) {
      case 'exact': {
        const exactSum = Object.values(splitAmounts).reduce((sum, val) => {
          const num = parseFloat(val);
          return sum + (isNaN(num) ? 0 : num);
        }, 0);
        
        if (Math.abs(exactSum - numericAmount) >= 0.01) {
          setError(`Split total (${exactSum.toFixed(2)}) must equal the expense amount (${numericAmount.toFixed(2)})`);
          return;
        }
        splitsPayload = groupMembers.map(member => ({
          userId: member.id,
          amountOwed: parseFloat(splitAmounts[member.id]) || 0
        }));
        break;
      }

      case 'percentage': {
        const percentageSum = Object.values(splitPercentages).reduce((sum, val) => {
          const num = parseFloat(val);
          return sum + (isNaN(num) ? 0 : num);
        }, 0);
        
        if (Math.abs(percentageSum - 100) >= 0.01) {
          setError(`Sum of percentages (${percentageSum.toFixed(2)}%) must equal 100%`);
          return;
        }
        splitsPayload = groupMembers.map(member => ({
          userId: member.id,
          percentage: parseFloat(splitPercentages[member.id]) || 0
        }));
        break;
      }

      case 'shares': {
        const sharesSum = Object.values(splitShares).reduce((sum, val) => {
          const num = parseFloat(val);
          return sum + (isNaN(num) ? 0 : num);
        }, 0);
        
        if (sharesSum <= 0) {
          setError('Total shares must be greater than 0');
          return;
        }
        splitsPayload = groupMembers.map(member => ({
          userId: member.id,
          shares: parseInt(splitShares[member.id]) || 0
        }));
        break;
      }

      case 'equally': {
        const amountPerMember = numericAmount / groupMembers.length;
        splitsPayload = groupMembers.map(member => ({
          userId: member.id,
          amountOwed: amountPerMember
        }));
        break;
      }

      default:
        setError('Invalid split method selected');
        return;
    }

    try {
      setLoadingSubmit(true);
      const response = await fetch('http://localhost:3001/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: numericAmount,
          groupId,
          payerId,
          splits: splitsPayload,
          splitMethod
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP Error ${response.status}`);
      }
      toast.success('Expense added successfully!');
      navigate('/');
    } catch (err) {
      console.error("Error adding expense:", err);
      setError(err.message || 'Failed to add expense.');
      toast.error(err.message || 'Failed to add expense.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Calculate summary values
  const calculateSplitSummary = () => {
    if (splitMethod === 'exact') {
      return Object.values(splitAmounts).reduce((sum, val) => {
        const num = parseFloat(val);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    } else if (splitMethod === 'percentage') {
      return Object.values(splitPercentages).reduce((sum, val) => {
        const num = parseFloat(val);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    } else if (splitMethod === 'shares') {
      return Object.values(splitShares).reduce((sum, val) => {
        const num = parseFloat(val);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    }
    return 0;
  };

  return (
    <div>
      <h1>Add New Expense</h1>
      <form onSubmit={handleSubmit}>
        {/* Description Input */}
        <div>
          <label htmlFor="description">Description:</label>
          <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={loadingSubmit || loadingGroups}/>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="amount">Amount ($):</label>
          <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0.01" step="0.01" disabled={loadingSubmit || loadingGroups}/>
        </div>

        {/* Group Select Dropdown */}
        <div>
          <label htmlFor="group">Group:</label>
          <select
            id="group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
            disabled={loadingSubmit || loadingGroups || userGroups.length === 0}
          >
            <option value="" disabled>
              {loadingGroups ? 'Loading groups...' : (userGroups.length === 0 ? '-- No groups found --' : '-- Select a Group --')}
            </option>
            {!loadingGroups && userGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payer Select Dropdown */}
        <div>
          <label htmlFor="payer">Paid By:</label>
          <select
              id="payer"
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              required
              disabled={loadingSubmit || loadingMembers || !groupId || groupMembers.length === 0}
          >
              <option value="" disabled>
                  { !groupId ? '-- Select Group First --' : (loadingMembers ? 'Loading members...' : (groupMembers.length === 0 ? '-- No members --' : '-- Select Payer --')) }
              </option>
              {!loadingMembers && groupMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                      {member.username} {member.id === user?.id ? '(You)' : ''}
                  </option>
              ))}
          </select>
          {loadingMembers && <span style={{ marginLeft: '10px', fontSize: '0.9em' }}>Loading...</span>}
        </div>

        {/* Split Method Selection */}
        <div className="mb-4">
          <label className="block font-bold mb-2">Split Method:</label>
          <div className="flex space-x-4">
            <label><input type="radio" name="splitMethod" value="equally" checked={splitMethod === 'equally'} onChange={(e) => setSplitMethod(e.target.value)} /> Equally</label>
            <label><input type="radio" name="splitMethod" value="exact" checked={splitMethod === 'exact'} onChange={(e) => setSplitMethod(e.target.value)} /> By Exact Amounts</label>
            <label><input type="radio" name="splitMethod" value="percentage" checked={splitMethod === 'percentage'} onChange={(e) => setSplitMethod(e.target.value)} /> By Percentage</label>
            <label><input type="radio" name="splitMethod" value="shares" checked={splitMethod === 'shares'} onChange={(e) => setSplitMethod(e.target.value)} /> By Shares</label>
          </div>
        </div>

        {/* Split Details Section */}
        {!loadingMembers && groupId && groupMembers.length > 0 && (
          <div style={{ margin: '20px 0' }}>
            <h3>Split Details</h3>

            {/* Equally Split Button */}
            {splitMethod === 'equally' && (
              <button
                type="button"
                onClick={() => {
                  if (!amount) {
                    setError('Please enter a total amount first');
                    return;
                  }
                  if (!groupMembers.length) {
                    setError('No group members found');
                    return;
                  }
                  
                  const numericAmount = parseFloat(amount);
                  if (isNaN(numericAmount) || numericAmount <= 0) {
                    setError('Please enter a valid positive amount');
                    return;
                  }

                  const numberOfMembers = groupMembers.length;
                  const amountPerMember = Math.round((numericAmount / numberOfMembers) * 100) / 100;
                  const remainder = Math.round((numericAmount * 100) - (amountPerMember * 100 * numberOfMembers));
                  
                  const newSplits = {};
                  groupMembers.forEach((member, index) => {
                    let memberAmount = amountPerMember;
                    if (index === 0 && remainder !== 0) {
                      memberAmount = (amountPerMember * 100 + remainder) / 100;
                    }
                    newSplits[member.id] = memberAmount.toFixed(2);
                  });

                  setSplitAmounts(newSplits);
                  setError('');
                }}
                disabled={loadingSubmit || loadingMembers || !amount}
                style={{ marginBottom: '15px' }}
              >
                Split Equally
              </button>
            )}

            {/* Exact Amount Inputs */}
            {splitMethod === 'exact' && groupMembers.map(member => (
              <div key={member.id} style={{ margin: '10px 0' }}>
                <label>
                  {member.username} {member.id === user?.id ? '(You)' : ''}:
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitAmounts[member.id] || ''}
                    onChange={(e) => handleSplitAmountChange(member.id, e.target.value)}
                    disabled={loadingSubmit}
                    style={{ marginLeft: '10px' }}
                  />
                </label>
              </div>
            ))}

            {/* Percentage Inputs */}
            {splitMethod === 'percentage' && (
              <>
                <h4>Enter Percentages:</h4>
                {groupMembers.map(member => (
                  <div key={member.id} style={{ margin: '10px 0' }}>
                    <label>
                      {member.username} {member.id === user?.id ? '(You)' : ''}:
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={splitPercentages[member.id] || ''}
                        onChange={(e) => handleSplitPercentageChange(member.id, e.target.value)}
                        disabled={loadingSubmit}
                        style={{ marginLeft: '10px' }}
                      /> %
                    </label>
                  </div>
                ))}
              </>
            )}

            {/* Shares Inputs */}
            {splitMethod === 'shares' && (
              <>
                <h4>Enter Shares:</h4>
                {groupMembers.map(member => (
                  <div key={member.id} style={{ margin: '10px 0' }}>
                    <label>
                      {member.username} {member.id === user?.id ? '(You)' : ''}:
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={splitShares[member.id] || ''}
                        onChange={(e) => handleSplitSharesChange(member.id, e.target.value)}
                        disabled={loadingSubmit}
                        style={{ marginLeft: '10px' }}
                      /> shares
                    </label>
                  </div>
                ))}
              </>
            )}

            {/* Split Summary */}
            <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
              <div>Expense Total: ${amount || '0.00'}</div>
              <div>Split Total: ${calculateSplitSummary().toFixed(2)}</div>
              <div style={{
                color: Math.abs(parseFloat(amount || 0) - calculateSplitSummary()) <= 0.01 ? 'green' :
                calculateSplitSummary() > parseFloat(amount || 0) ? 'red' : 'orange'
              }}>
                Amount Left: ${(parseFloat(amount || 0) - calculateSplitSummary()).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Submit/Cancel Buttons */}
        <div style={{ marginTop: '20px' }}>
          <button type="submit" disabled={loadingSubmit || loadingGroups || loadingMembers}>
            {loadingSubmit ? 'Adding...' : 'Add Expense'}
          </button>
          <button type="button" onClick={() => navigate('/')} disabled={loadingSubmit || loadingGroups || loadingMembers} style={{ marginLeft: '10px' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddExpensePage;
