// frontend/src/pages/AddExpensePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  const [splitAmounts, setSplitAmounts] = useState({}); // Track split amounts per member

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
        if (user?.id && !payerId) { // Only set if payerId isn't already set (e.g., by group change effect)
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
  }, [token, user?.id]); // Depend on token and user.id

  // Effect 2: Fetch/Set Members when Group Selection Changes
  useEffect(() => {
    // Clear members and potentially reset payer if no group is selected
    if (!groupId) {
      setGroupMembers([]);
      // Optionally reset payer to self, or leave it as is
      // if (user?.id) setPayerId(user.id);
      return;
    }

    setLoadingMembers(true); // Indicate loading members for the UI
    console.log(`Group selected: ${groupId}. Finding members...`);

    // Find the full data for the selected group from the already fetched userGroups state
    const selectedGroupData = userGroups.find(g => g.id === groupId);

    if (selectedGroupData && selectedGroupData.members) {
      // Handle both nested (member.user) and flat member structures
      const members = selectedGroupData.members.map(member => {
        if (member.user) {
          return member.user; // Nested structure
        }
        return { // Flat structure
          id: member.userId || member.id,
          username: member.username || member.name
        };
      }).filter(member => member.id && member.username); // Ensure valid members
      
      setGroupMembers(members);
      console.log('Members for selected group:', members);

      // Check if the current payer is still valid for this group.
      // If not, default to the logged-in user IF they are a member of this new group.
      const currentPayerIsValidMember = members.some(m => m.id === payerId);
      const loggedInUserIsMember = members.some(m => m.id === user?.id);

      if (!currentPayerIsValidMember && loggedInUserIsMember) {
          console.log("Current payer not in group, defaulting to logged-in user.");
          setPayerId(user.id);
      } else if (!payerId && loggedInUserIsMember) { // Set default payer if payerId is empty
          console.log("No payer selected, defaulting to logged-in user.");
          setPayerId(user.id);
      }
    } else {
      // This case means GET /api/groups didn't include members as expected
      console.warn("Member data not found in userGroups state for groupId:", groupId);
      setGroupMembers([]);
      setError("Could not load members for the selected group.");
    }

    setLoadingMembers(false); // Finish loading members

  }, [groupId, userGroups, user?.id]); // Re-run when groupId or userGroups change


  // Handle Form Submission (includes payerId)
  const handleSplitAmountChange = (memberId, value) => {
    console.log(`Updating split for member ${memberId} to:`, value); // Debug log
    // Allow empty string or valid numbers (potentially with decimals)
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSplitAmounts(prev => {
        const newState = {
          ...prev,
          [memberId]: value
        };
        console.log('New splitAmounts state:', newState); // Debug log
        return newState;
      });
    } else {
      console.log('Invalid input rejected:', value); // Debug log
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Validation
    if (!description.trim() || !amount || !groupId || !payerId) {
      setError('Please fill out all fields: Description, Amount, Group, and Paid By.');
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    // Validate splits sum matches expense amount
    const sumOfSplits = Object.values(splitAmounts).reduce((sum, val) => {
      const num = parseFloat(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
    
    if (Math.abs(sumOfSplits - numericAmount) >= 0.01) {
      setError(`Split total (${sumOfSplits.toFixed(2)}) must equal the expense amount (${numericAmount.toFixed(2)})`);
      return;
    }

    // Prepare splits payload
    const splitsPayload = groupMembers.map(member => ({
      userId: member.id,
      amountOwed: parseFloat(splitAmounts[member.id]) || 0
    }));

    setLoadingSubmit(true);
    try {
      console.log('Submitting expense:', {
        description,
        amount: numericAmount,
        groupId,
        payerId,
        splits: splitsPayload
      });
      // Prepare splits array from splitAmounts
      const splits = Object.entries(splitAmounts)
        .filter(([, amount]) => amount && !isNaN(parseFloat(amount)))
        .map(([userId, amount]) => ({
          userId,
          amountOwed: parseFloat(amount)
        }));

      const response = await fetch('http://localhost:3001/api/expenses', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
              description: description.trim(),
              amount: numericAmount,
              groupId,
              payerId,
              splits
          }),
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.message || `HTTP Error ${response.status}`); }
      alert('Expense added successfully!');
      navigate('/'); // Go back to home page
    } catch (err) {
      console.error("Error adding expense:", err);
      setError(err.message || 'Failed to add expense.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Render JSX
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
            onChange={(e) => setGroupId(e.target.value)} // Set group ID state
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

        {/* --- NEW: Payer Select Dropdown --- */}
        <div>
          <label htmlFor="payer">Paid By:</label>
          <select
              id="payer"
              value={payerId} // Controlled by payerId state
              onChange={(e) => setPayerId(e.target.value)} // Update payerId state
              required
              disabled={loadingSubmit || loadingMembers || !groupId || groupMembers.length === 0} // Disable logic
          >
              <option value="" disabled>
                  { !groupId ? '-- Select Group First --' : (loadingMembers ? 'Loading members...' : (groupMembers.length === 0 ? '-- No members --' : '-- Select Payer --')) }
              </option>
              {/* Map over members of the *selected* group */}
              {!loadingMembers && groupMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                      {member.username} {member.id === user?.id ? '(You)' : ''} {/* Indicate self */}
                  </option>
              ))}
          </select>
          {loadingMembers && <span style={{ marginLeft: '10px', fontSize: '0.9em' }}>Loading...</span>}
        </div>
        {/* --- End Payer Select --- */}

        {/* Split Amounts Section */}
        {!loadingMembers && groupId && groupMembers.length > 0 && (
          <div style={{ margin: '20px 0' }}>
            <h3>Split Details</h3>
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
                  // Add remainder to first member
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
            {groupMembers.map(member => (
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

            {/* Split Summary */}
            <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
              <div>Expense Total: ${amount || '0.00'}</div>
              <div>Split Total: ${Object.values(splitAmounts).reduce((sum, val) => {
                const num = parseFloat(val);
                return sum + (isNaN(num) ? 0 : num);
              }, 0).toFixed(2)}</div>
              <div style={{
                color: Math.abs(parseFloat(amount || 0) - Object.values(splitAmounts).reduce((sum, val) => {
                  const num = parseFloat(val);
                  return sum + (isNaN(num) ? 0 : num);
                }, 0)) <= 0.01 ? 'green' :
                Object.values(splitAmounts).reduce((sum, val) => {
                  const num = parseFloat(val);
                  return sum + (isNaN(num) ? 0 : num);
                }, 0) > parseFloat(amount || 0) ? 'red' : 'orange'
              }}>
                Amount Left: ${(parseFloat(amount || 0) - Object.values(splitAmounts).reduce((sum, val) => {
                  const num = parseFloat(val);
                  return sum + (isNaN(num) ? 0 : num);
                }, 0)).toFixed(2)}
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