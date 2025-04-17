import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GroupsPage = () => {
  const { token } = useAuth();
  
  // State management
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createError, setCreateError] = useState('');
  const [addMemberData, setAddMemberData] = useState({
    groupId: '',
    email: '',
    loading: false,
    error: ''
  });

  // Fetch groups function
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!token) return;

      const API_BASE = 'http://localhost:3001';
      
      const groupsRes = await fetch(`${API_BASE}/api/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!groupsRes.ok) {
        throw new Error(await groupsRes.text());
      }
      const groupsData = await groupsRes.json();

      const groupsWithMembers = await Promise.all(
        groupsData.map(async group => {
          const detailsRes = await fetch(`${API_BASE}/api/groups/${group.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!detailsRes.ok) {
            console.error('Failed to fetch group details:', await detailsRes.text());
            return group;
          }
          
          const details = await detailsRes.json();
          return {
            ...group,
            members: details.members || [],
            memberUsers: details.members?.map(m => m.user) || []
          };
        })
      );

      setGroups(groupsWithMembers);
    } catch (err) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial data fetch
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Group creation handler
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setCreateError('Group name cannot be empty');
      return;
    }

    try {
      setCreatingGroup(true);
      setCreateError('');
      
      const response = await fetch('http://localhost:3001/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newGroupName })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setNewGroupName('');
      fetchGroups();
    } catch (error) {
      console.error('Group creation error:', error);
      setCreateError(error.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Add member handler
  const handleAddMember = async (groupId) => {
    const email = addMemberData.email.trim();
    
    if (!email) {
      setAddMemberData(prev => ({...prev, error: 'Email is required'}));
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setAddMemberData(prev => ({...prev, error: 'Please enter a valid email address'}));
      return;
    }

    try {
      setAddMemberData(prev => ({...prev, loading: true, error: ''}));
      
      const response = await fetch(`http://localhost:3001/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: addMemberData.email })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setAddMemberData({
        groupId: '',
        email: '',
        loading: false,
        error: ''
      });
      fetchGroups();
    } catch (error) {
      console.error('Add member error:', error);
      setAddMemberData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to add member'
      }));
    }
  };

  if (loading) {
    return <div>Loading groups...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="groups-page">
      <h1>Your Groups</h1>
      
      {/* Group creation form */}
      <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h3>Create New Group</h3>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Enter group name"
            style={{ flex: 1, padding: '8px' }}
          />
          <button 
            onClick={handleCreateGroup}
            disabled={creatingGroup}
          >
            {creatingGroup ? 'Creating...' : 'Create Group'}
          </button>
        </div>
        {createError && <p style={{ color: 'red', marginTop: '5px' }}>{createError}</p>}
      </div>

      <div className="groups-list">
        {groups.map(group => (
          <div key={group.id} className="group-card" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee' }}>
            <Link to={`/groups/${group.id}`}>
              <h3>{group.name}</h3>
            </Link>
            <p>Created: {new Date(group.createdAt).toLocaleDateString()}</p>
            
            {/* Member list */}
            {group.members.length > 0 && (
              <div className="group-members" style={{ marginTop: '10px' }}>
                <h4>Members:</h4>
                <ul>
                  {group.members?.map(member => {
                    const username = member?.user?.username ||
                                   member?.username ||
                                   member?.name ||
                                   'Member';
                    return (
                      <li key={member?.user?.id || member?.id || Math.random()}>
                        {username}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Add member form */}
            <div style={{ marginTop: '15px' }}>
              <h4>Add Member</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="email"
                  value={addMemberData.groupId === group.id ? addMemberData.email : ''}
                  onChange={(e) => setAddMemberData({
                    groupId: group.id,
                    email: e.target.value,
                    loading: false,
                    error: ''
                  })}
                  placeholder="Member's email"
                  style={{ flex: 1, padding: '8px' }}
                />
                <button
                  onClick={() => handleAddMember(group.id)}
                  disabled={addMemberData.loading && addMemberData.groupId === group.id}
                >
                  {addMemberData.loading && addMemberData.groupId === group.id ? 'Adding...' : 'Add'}
                </button>
              </div>
              {addMemberData.groupId === group.id && addMemberData.error && (
                <p style={{ color: 'red', marginTop: '5px' }}>{addMemberData.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupsPage;