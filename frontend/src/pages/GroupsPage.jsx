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
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Groups</h1>
      
      {/* Group creation form */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Group</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Enter group name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
          <button
            onClick={handleCreateGroup}
            disabled={creatingGroup}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50"
          >
            {creatingGroup ? 'Creating...' : 'Create Group'}
          </button>
        </div>
        {createError && <p className="text-red-500 text-sm mt-2">{createError}</p>}
      </div>

      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <Link to={`/groups/${group.id}`} className="text-blue-600 hover:text-blue-800">
              <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
            </Link>
            <p className="text-sm text-gray-500">Created: {new Date(group.createdAt).toLocaleDateString()}</p>
            
            {/* Member list */}
            {group.members.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Members:</h4>
                <ul className="space-y-1">
                  {group.members?.map(member => {
                    const username = member?.user?.username ||
                                   member?.username ||
                                   member?.name ||
                                   'Member';
                    return (
                      <li key={member?.user?.id || member?.id || Math.random()} className="text-sm text-gray-600">
                        {username}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Add member form */}
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Add Member</h4>
              <div className="flex gap-2">
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
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  onClick={() => handleAddMember(group.id)}
                  disabled={addMemberData.loading && addMemberData.groupId === group.id}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded transition-colors disabled:opacity-50"
                >
                  {addMemberData.loading && addMemberData.groupId === group.id ? 'Adding...' : 'Add'}
                </button>
              </div>
              {addMemberData.groupId === group.id && addMemberData.error && (
                <p className="text-red-500 text-xs mt-1">{addMemberData.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupsPage;