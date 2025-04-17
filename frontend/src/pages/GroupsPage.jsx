// frontend/src/pages/GroupsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function GroupsPage() {
  // State for the list of groups
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [errorGroups, setErrorGroups] = useState('');

  // State for the 'Create Group' form
  const [newGroupName, setNewGroupName] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [errorCreate, setErrorCreate] = useState('');

  // --- NEW: State for adding members ---
  // Use an object to store email input state per group ID
  const [memberEmailInputs, setMemberEmailInputs] = useState({});
  // Use an object to store loading state per group ID
  const [loadingAddMember, setLoadingAddMember] = useState({});
   // Use an object to store error messages per group ID
  const [errorAddMember, setErrorAddMember] = useState({});
  // --- End New State ---

  // Get token from context
  const { token } = useAuth();

  // --- Fetch User's Groups ---
  const fetchGroups = async () => {
      if (!token) return;
      setLoadingGroups(true);
      setErrorGroups('');
      try {
          const response = await fetch('http://localhost:3001/api/groups', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `HTTP Error ${response.status}`);
          }
          const data = await response.json();
          setGroups(data);
      } catch (err) {
          setErrorGroups(err.message || 'Failed to fetch groups.');
          console.error("Fetch Groups Error:", err);
      } finally {
          setLoadingGroups(false);
      }
  };

  // Fetch groups when component mounts or token changes
  useEffect(() => {
      fetchGroups();
  }, [token]);


  // --- Handle Create Group Form Submission ---
  const handleCreateGroup = async (event) => {
      event.preventDefault();
      if (!newGroupName.trim()) {
          setErrorCreate('Please enter a group name.');
          return;
      }
      setLoadingCreate(true);
      setErrorCreate('');

      try {
          const response = await fetch('http://localhost:3001/api/groups', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: newGroupName.trim() }),
          });

          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.message || `HTTP Error ${response.status}`);
          }

          console.log('Group created:', data.group);
          setNewGroupName(''); // Clear the input field
          // Re-fetch the groups list to include the new one
          fetchGroups(); // <-- Refresh the list
          alert('Group created successfully!');

      } catch (err) {
          setErrorCreate(err.message || 'Failed to create group.');
          console.error("Create Group Error:", err);
      } finally {
          setLoadingCreate(false);
      }
  };

  // --- NEW: Handle Add Member Form Submission ---
const handleAddMember = async (event, groupId) => {
    event.preventDefault();
    const emailToAdd = memberEmailInputs[groupId] || ''; // Get email for this specific group form
  
    if (!emailToAdd.trim()) {
        setErrorAddMember(prev => ({ ...prev, [groupId]: 'Please enter an email to add.' }));
        return;
    }
  
    setLoadingAddMember(prev => ({ ...prev, [groupId]: true })); // Set loading for this specific group
    setErrorAddMember(prev => ({ ...prev, [groupId]: '' })); // Clear error for this group
  
    try {
        // Fix: Use full URL with localhost:3001 instead of relative path
        const response = await fetch(`http://localhost:3001/api/groups/${groupId}/members`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emailToAdd: emailToAdd.trim() }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
            throw new Error(data.message || `HTTP Error ${response.status}`);
        }
  
        // Success
        alert(data.message || `User added successfully to group!`);
        // Clear the input field for this specific group
        setMemberEmailInputs(prev => ({ ...prev, [groupId]: '' }));
        // TODO: Ideally, refresh group members list here if displaying them
  
    } catch (err) {
        console.error("Add Member Error:", err);
        setErrorAddMember(prev => ({ ...prev, [groupId]: err.message || 'Failed to add member.' }));
    } finally {
        setLoadingAddMember(prev => ({ ...prev, [groupId]: false })); // Clear loading for this specific group
    }
  };

// Helper to update email input state for a specific group
const handleEmailInputChange = (groupId, value) => {
  setMemberEmailInputs(prev => ({
      ...prev,
      [groupId]: value
  }));
};
// --- End New Handlers ---



  // --- Render Component ---
  return (
    <div>
      <h1>Your Groups</h1>

      {/* Create New Group Section (remains the same) */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
          {/* ... create group form ... */}
          <h3>Create New Group</h3> <form onSubmit={handleCreateGroup}> <div> <label htmlFor="new-group-name">Group Name:</label> <input type="text" id="new-group-name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} disabled={loadingCreate} required /> </div> {errorCreate && <p style={{ color: 'red' }}>{errorCreate}</p>} <button type="submit" disabled={loadingCreate}> {loadingCreate ? 'Creating...' : 'Create Group'} </button> </form>
      </div>

      {/* List Existing Groups Section */}
      <div>
          <h3>Existing Groups</h3>
          {loadingGroups && <p>Loading groups...</p>}
          {errorGroups && <p style={{ color: 'red' }}>{errorGroups}</p>}
          {!loadingGroups && !errorGroups && groups.length === 0 && ( <p>You are not a member of any groups yet.</p> )}
          {!loadingGroups && !errorGroups && groups.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                  {groups.map(group => (
                      <li key={group.id} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '15px' }}>
                                <h4>
                                    {group.name}
                                </h4>

                           {/* Display Group Members (from Phase 30) */}
          <div style={{ marginTop: '5px', marginBottom: '15px' }}> <strong>Members:</strong> {group.members && group.members.length > 0 ? ( <ul style={{ listStyle: 'disc inside', paddingLeft: '5px', margin: '5px 0 0 0' }}> {group.members.map(member => ( <li key={member.user.id}> {member.user.username} </li> ))} </ul> ) : ( <p style={{ fontStyle: 'italic', margin: '5px 0 0 0' }}>Just you.</p> )} </div>

{/* Add Member Form (from Phase 29) */}
<form onSubmit={(e) => handleAddMember(e, group.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}> <label htmlFor={`add-member-${group.id}`} style={{ marginRight: '5px' }}>Add Member (Email):</label> <input type="email" id={`add-member-${group.id}`} placeholder="user@example.com" value={memberEmailInputs[group.id] || ''} onChange={(e) => handleEmailInputChange(group.id, e.target.value)} disabled={loadingAddMember[group.id]} required size="30" /> <button type="submit" disabled={loadingAddMember[group.id]}> {loadingAddMember[group.id] ? 'Adding...' : 'Add'} </button> {errorAddMember[group.id] && <p style={{ color: 'red', marginLeft: '10px', marginBlock: 0 }}>{errorAddMember[group.id]}</p>} </form>
</li> ))} </ul> )}
</div>
</div> );
}
export default GroupsPage;