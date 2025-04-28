import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

function EditExpensePage() {
  const { expenseId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [groupId, setGroupId] = useState('');
  const [payerId, setPayerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`http://localhost:3001/api/expenses/${expenseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        setDescription(data.description);
        setAmount(data.amount.toString());
        setGroupId(data.group?.id || '');
        setPayerId(data.paidBy?.id || '');
      } catch (error) {
        // Log error to error reporting service in production
        setError(error.message || 'Failed to load expense');
        toast.error(error.message || 'Failed to load expense');
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [expenseId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!description.trim() || !amount) {
      setError('Please fill out all fields');
      return;
    }
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }
    
    try {
      setError('');
      setLoadingSubmit(true);
      const response = await fetch(`http://localhost:3001/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: numericAmount
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success('Expense updated successfully!');
      navigate('/');
    } catch (error) {
      // Log error to error reporting service in production
      toast.error(error.message || 'Failed to update expense');
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loading) {
    return <div>Loading expense data...</div>;
  }

  return (
  <div className="p-4 max-w-4xl mx-auto">
    <h1 className="text-2xl font-bold text-gray-800 mb-4">Edit Expense</h1>
    
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="mb-4">
        <label htmlFor="description" className="block text-gray-700 mb-2">Description:</label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-input bg-background px-3 py-2 h-10 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="amount" className="block text-gray-700 mb-2">Amount ($):</label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.01"
          step="0.01"
          className="w-full border border-input bg-background px-3 py-2 h-10 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          required
        />
      </div>

      {/* Disabled fields for non-editable properties */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Group:</label>
        <input
          type="text"
          value={groupId}
          disabled
          className="w-full border border-input bg-gray-100 px-3 py-2 h-10 text-sm rounded-md disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Paid By:</label>
        <input
          type="text"
          value={payerId}
          disabled
          className="w-full border border-input bg-gray-100 px-3 py-2 h-10 text-sm rounded-md disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loadingSubmit}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center ${
              loadingSubmit ? 'opacity-80' : ''
            }`}
          >
            {loadingSubmit ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Update Expense'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditExpensePage;