import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      setError('');

      const API_BASE = 'http://localhost:3001'; // Updated to port 3001
      const [groupRes, expensesRes] = await Promise.all([
        fetch(`${API_BASE}/api/groups/${groupId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE}/api/groups/${groupId}/expenses`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!groupRes.ok || !expensesRes.ok) {
        throw new Error('Failed to fetch group data');
      }

      const [groupData, expensesData] = await Promise.all([
        groupRes.json(),
        expensesRes.json()
      ]);

      setGroup(groupData);
      setExpenses(expensesData);
    } catch (err) {
      console.error('Error fetching group data:', err);
      setError('Failed to load group data');
      toast.error('Failed to load group data');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId, token, navigate]);

  if (loading) {
    return <div>Loading group details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{group?.name} Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Members</h3>
            <div className="flex flex-wrap gap-2">
              {group?.members.map(member => (
                <div key={member.id} className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>
                      {member.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">Expenses</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid by</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id} onClick={() => navigate(`/expenses/${expense.id}`)}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>${expense.amount.toFixed(2)}</TableCell>
                    <TableCell>{expense.paidBy?.name}</TableCell>
                    <TableCell>
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupDetailPage;