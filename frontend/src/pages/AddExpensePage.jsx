// frontend/src/pages/AddExpensePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

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
        // Groups data loaded successfully
        
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
    // Group selected, finding members

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
      // Members loaded for selected group

      const currentPayerIsValidMember = members.some(m => m.id === payerId);
      const loggedInUserIsMember = members.some(m => m.id === user?.id);

      if (!currentPayerIsValidMember && loggedInUserIsMember) {
          setPayerId(user.id);
      } else if (!payerId && loggedInUserIsMember) {
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
    <div className="flex justify-center pt-10">
      <Card className="w-full max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle>Add New Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 mb-1 block">Description</Label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={loadingSubmit || loadingGroups}
            className="border border-input bg-background px-3 py-2 h-10 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 mb-1 block">Amount ($)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="0.01"
            step="0.01"
            disabled={loadingSubmit || loadingGroups}
            className="border border-input bg-background px-3 py-2 h-10 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Group Select Dropdown */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 mb-1 block">Group</Label>
          <Select
            value={groupId}
            onValueChange={setGroupId}
            disabled={loadingSubmit || loadingGroups || userGroups.length === 0}
          >
            <SelectTrigger className="border border-input bg-background px-3 py-2 h-10 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <SelectValue placeholder={loadingGroups ? 'Loading groups...' : (userGroups.length === 0 ? '-- No groups found --' : '-- Select a Group --')} />
            </SelectTrigger>
            <SelectContent>
              {!loadingGroups && userGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payer Select Dropdown */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 mb-1 block">Paid By</Label>
          <Select
            value={payerId}
            onValueChange={setPayerId}
            disabled={loadingSubmit || loadingMembers || !groupId || groupMembers.length === 0}
          >
            <SelectTrigger className="border border-input bg-background px-3 py-2 h-10 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <SelectValue placeholder={!groupId ? '-- Select Group First --' : (loadingMembers ? 'Loading members...' : (groupMembers.length === 0 ? '-- No members --' : '-- Select Payer --'))} />
            </SelectTrigger>
            <SelectContent>
              {!loadingMembers && groupMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.username} {member.id === user?.id ? '(You)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Split Method Selection */}
        <div className="mb-4">
          <Label className="block font-bold text-gray-700 mb-2">Split Method</Label>
          <RadioGroup value={splitMethod} onValueChange={setSplitMethod}>
            <div className="flex space-x-4">
              <RadioGroupItem value="equally" id="split-equally" />
              <label htmlFor="split-equally">Equally</label>
              <RadioGroupItem value="exact" id="split-exact" />
              <label htmlFor="split-exact">By Exact Amounts</label>
              <RadioGroupItem value="percentage" id="split-percentage" />
              <label htmlFor="split-percentage">By Percentage</label>
              <RadioGroupItem value="shares" id="split-shares" />
              <label htmlFor="split-shares">By Shares</label>
            </div>
          </RadioGroup>
        </div>

        {/* Split Details Section */}
        {!loadingMembers && groupId && groupMembers.length > 0 && (
          <div className="my-5">
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
              <div key={member.id} className="flex items-center justify-between mb-2 space-x-2">
                <Label htmlFor={`exact-${member.id}`} className="w-1/3 truncate">
                  {member.username} {member.id === user?.id ? '(You)' : ''}
                </Label>
                <div className="w-2/3 flex items-center">
                  <span className="mr-1 text-gray-500">$</span>
                  <Input
                    id={`exact-${member.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={splitAmounts[member.id] || ''}
                    onChange={(e) => handleSplitAmountChange(member.id, e.target.value)}
                    disabled={loadingSubmit}
                    className="border border-input bg-background px-3 py-2 h-8 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                  />
                </div>
              </div>
            ))}

            {/* Percentage Inputs */}
            {splitMethod === 'percentage' && (
              <>
                <h4>Enter Percentages:</h4>
                {groupMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between mb-2 space-x-2">
                    <Label htmlFor={`percentage-${member.id}`} className="w-1/3 truncate">
                      {member.username} {member.id === user?.id ? '(You)' : ''}
                    </Label>
                    <div className="w-2/3 flex items-center">
                      <Input
                        id={`percentage-${member.id}`}
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        value={splitPercentages[member.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            const num = parseFloat(value);
                            if (isNaN(num) || num <= 100) {
                              handleSplitPercentageChange(member.id, value);
                            }
                          }
                        }}
                        disabled={loadingSubmit}
                        className="border border-input bg-background px-3 py-2 h-8 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                      />
                      <span className="ml-1 text-gray-500">%</span>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-2 border rounded" style={{
                  backgroundColor: '#f8f9fa',
                  borderColor: Math.abs(calculateSplitSummary() - 100) < 0.01 ? '#28a745' : '#dc3545'
                }}>
                  <p className={Math.abs(calculateSplitSummary() - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                    Total Percentage: {calculateSplitSummary().toFixed(1)}%
                  </p>
                  {Math.abs(calculateSplitSummary() - 100) >= 0.01 && (
                    <p className="text-red-600 text-sm mt-1">
                      Percentages must sum to exactly 100%
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Shares Inputs */}
            {splitMethod === 'shares' && (
              <>
                <h4>Enter Shares:</h4>
                {groupMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between mb-2 space-x-2">
                    <Label htmlFor={`shares-${member.id}`} className="w-1/3 truncate">
                      {member.username} {member.id === user?.id ? '(You)' : ''}
                    </Label>
                    <div className="w-2/3 flex items-center">
                      <Input
                        id={`shares-${member.id}`}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={splitShares[member.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*$/.test(value)) {
                            handleSplitSharesChange(member.id, value);
                          }
                        }}
                        disabled={loadingSubmit}
                        className="h-8 text-right"
                      />
                      <span className="ml-1 text-gray-500">shares</span>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-2 border rounded" style={{
                  backgroundColor: '#f8f9fa',
                  borderColor: calculateSplitSummary() > 0 ? '#28a745' : '#dc3545'
                }}>
                  <p className={calculateSplitSummary() > 0 ? 'text-green-600' : 'text-red-600'}>
                    Total Shares: {calculateSplitSummary()}
                  </p>
                  {calculateSplitSummary() <= 0 && (
                    <p className="text-red-600 text-sm mt-1">
                      Total shares must be greater than 0
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Split Summary */}
            <div className="mt-5 p-2.5 border border-gray-200 rounded">
              <div>Expense Total: ${amount || '0.00'}</div>
              <div>Split Total: ${calculateSplitSummary().toFixed(2)}</div>
              <div className={
                Math.abs(parseFloat(amount || 0) - calculateSplitSummary()) <= 0.01 ? 'text-green-600' :
                calculateSplitSummary() > parseFloat(amount || 0) ? 'text-red-600' : 'text-orange-500'
              }>
                Amount Left: ${(parseFloat(amount || 0) - calculateSplitSummary()).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Submit/Cancel Buttons */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            disabled={loadingSubmit || loadingGroups || loadingMembers}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loadingSubmit || loadingGroups || loadingMembers}
          >
            {loadingSubmit ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : 'Add Expense'}
          </Button>
        </div>
      </form>
      </CardContent>
    </Card>
  </div>
  );
}

export default AddExpensePage;
