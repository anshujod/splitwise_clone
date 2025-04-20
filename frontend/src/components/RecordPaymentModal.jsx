import React, { useState } from 'react';

const RecordPaymentModal = ({
  isOpen,
  onClose,
  onSubmit,
  targetUser,
  balanceDirection,
  currentBalance,
  processing
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [modalError, setModalError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setModalError('');

    // Validate input
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setModalError('Please enter a valid positive amount');
      return;
    }

    onSubmit(amount);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'black',
        padding: '25px',
        borderRadius: '8px',
        width: '450px',
        maxWidth: '90%',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ color: '#333', marginBottom: '15px' }}>Record Payment</h3>
        
        <div style={{ marginBottom: '20px', color: '#555' }}>
          <p>Record payment between You and {targetUser.username}</p>
          {currentBalance && (
            <p style={{ marginTop: '8px', fontSize: '0.9em' }}>
              Current balance: {balanceDirection === 'owesYou'
                ? `${targetUser.username} owes you $${currentBalance.toFixed(2)}`
                : `You owe ${targetUser.username} $${currentBalance.toFixed(2)}`}
            </p>
          )}
          <p style={{ marginTop: '15px' }}>Enter payment amount:</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ margin: '20px 0' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Amount ($)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '16px'
              }}
              required
            />
          </div>

          {modalError && <p style={{ color: 'red', marginBottom: '15px' }}>{modalError}</p>}

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              type="button" 
              onClick={onClose}
              disabled={processing}
              style={{
                padding: '8px 16px',
                background: '#f1f1f1',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={processing}
              style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {processing ? 'Processing...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;