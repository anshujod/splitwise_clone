import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
      toast.success('Group created successfully!');
    } catch (error) {
      console.error('Group creation error:', error);
      setCreateError(error.message || 'Failed to create group');
      toast.error(error.message || 'Failed to create group.');
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
      toast.success('Member added successfully!');
    } catch (error) {
      console.error('Add member error:', error);
      setAddMemberData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to add member'
      }));
      toast.error(error.message || 'Failed to add member.');
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
          <div className="flex-1 space-y-2">
            <Input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="border border-input bg-background px-3 py-2 h-10 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {createError && (
              <Alert variant="destructive" className="p-2 text-sm">
                {createError}
              </Alert>
            )}
          </div>
          <Button
            onClick={handleCreateGroup}
            disabled={creatingGroup}
            className="px-4 py-2"
          >
            {creatingGroup ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {groups.map(group => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle>
                <Link to={`/groups/${group.id}`} className="text-blue-600 hover:text-blue-800">
                  {group.name}
                </Link>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Created: {new Date(group.createdAt).toLocaleDateString()}</p>
              
              {/* Member list */}
              {group.members.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Members:</h4>
                  <div className="flex flex-wrap gap-2">
                    {group.members?.map((member) => {
                      const username = member?.user?.username ||
                                     member?.username ||
                                     member?.name ||
                                     'Member';
                      const initials = username.split(' ').map(n => n[0]).join('').toUpperCase();
                       
                      return (
                        <div key={member?.user?.id || member?.id || Math.random()} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 text-xs">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600">{username}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <div className="w-full space-y-2">
                <h4 className="font-medium text-gray-700">Add Member</h4>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={addMemberData.groupId === group.id ? addMemberData.email : ''}
                    onChange={(e) => setAddMemberData({
                      groupId: group.id,
                      email: e.target.value,
                      loading: false,
                      error: ''
                    })}
                    placeholder="Member's email"
                    className="border border-input bg-background px-3 py-2 h-10 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1"
                  />
                  <Button
                    onClick={() => handleAddMember(group.id)}
                    disabled={addMemberData.loading && addMemberData.groupId === group.id}
                    size="sm"
                  >
                    {addMemberData.loading && addMemberData.groupId === group.id ? 'Adding...' : 'Add'}
                  </Button>
                </div>
                {addMemberData.groupId === group.id && addMemberData.error && (
                  <p className="text-red-500 text-xs">{addMemberData.error}</p>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroupsPage;