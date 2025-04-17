// ==========================================
// SERVER SETUP & IMPORTS
// ==========================================
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
try {
  const dotenvResult = require('dotenv').config();
  if (dotenvResult.error) {
    throw dotenvResult.error;
  }
  console.log("[Initialization] dotenv configured successfully.");
  // Optional: Log loaded env vars (be careful with secrets in real logs)
  // console.log("[Initialization] Loaded .env variables:", dotenvResult.parsed);
} catch (error) {
  console.error("[FATAL ERROR] Failed to configure dotenv:", error);
  // Don't exit immediately, let JWT_SECRET check handle it, but log the error
}
const authenticateToken = require('./middleware/authenticateToken');

// Initialize Prisma Client
let prisma;
try {
  prisma = new PrismaClient();
  console.log("[Initialization] Prisma Client instantiated successfully.");
} catch (error) {
  console.error("[FATAL ERROR] Failed to instantiate Prisma Client:", error);
  process.exit(1); // Exit if Prisma Client cannot be created
}

// Initialize Express App
const app = express();
console.log('Express app initialized');
console.log('Express app initialized');

// ==========================================
// MIDDLEWARE
// ==========================================
// --- Request Logger Middleware (Add this FIRST) ---
app.use((req, res, next) => {
  console.log(`[Request Received] ${req.method} ${req.path} from ${req.ip}`);
  console.log('Request headers:', req.headers);
  next(); // Pass control to the next middleware
});
// --- End Request Logger ---

// Enable CORS with appropriate restrictions for security
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*', // Consider being more specific than '*' for production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable Express to parse JSON request bodies
app.use(express.json());

// ==========================================
// CONSTANTS & CONFIG
// ==========================================
const PORT = process.env.PORT || 3001;
// Secret key for JWT - MUST be in your .env file for security
const JWT_SECRET = process.env.JWT_SECRET;
console.log(`[Initialization] Checking JWT_SECRET: ${JWT_SECRET ? 'Found' : 'MISSING!'}`);
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file or dotenv failed to load/parse.");
  process.exit(1); // Exit if secret is missing
}
console.log("[Initialization] JWT_SECRET check passed.");
const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '24h'; // Configurable token expiry

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================
const errorHandler = (err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  
  // Handle Prisma-specific errors
  if (err.code && err.code.startsWith('P')) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Resource not found' });
    }
    return res.status(400).json({ message: 'Database operation failed' });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
};

// ==========================================
// ROUTES
// ==========================================

// --- Payments API ---
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { payeeId, payerId, amount, groupId } = req.body;
    
    // Validate input
    if (!payeeId || !payerId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment data' });
    }
    if (payeeId === payerId) {
      return res.status(400).json({ message: 'Cannot make payment to yourself' });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        amount,
        payer: { connect: { id: payerId } },
        payee: { connect: { id: payeeId } },
        ...(groupId && { group: { connect: { id: groupId } } })
      },
      include: {
        payer: { select: { id: true, username: true } },
        payee: { select: { id: true, username: true } }
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ message: 'Failed to record payment' });
  }
});

// --- Simple Base Route ---
app.get('/', (req, res) => {
  res.send('Hello from the Splitwise Clone Backend!');
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// SIGNUP ROUTE
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  // Basic Validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email }, { username: username }] }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email or username already taken' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
      },
    });

    // Prepare response (exclude password)
    const userForResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email
    };

    res.status(201).json({ message: 'User created successfully', user: userForResponse });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: 'Internal server error during signup' });
  }
});

// LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email
    console.log(`[Login Attempt] Finding user with email: ${email}`); // Log start
    const user = await prisma.user.findUnique({
      where: { email: email }
    });
    console.log(`[Login Attempt] Prisma findUnique completed. User found: ${!!user}`); // Log end

    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare provided password with stored hash
    console.log(`[Login Attempt] Comparing password for user: ${user.id}`); // Log start
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`[Login Attempt] bcrypt compare completed. Password valid: ${isPasswordValid}`); // Log end

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // --- Password is valid - Generate JWT ---
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email
    };

    console.log(`[Login Attempt] Generating JWT for user: ${user.id}`); // Log start
    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    console.log(`[Login Attempt] JWT generated successfully.`); // Log end

    // Prepare response (exclude password)
    const userForResponse = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    // Respond with success message, token, and user info
    console.log(`[Login Attempt] Sending success response for user: ${user.id}`); // Log before sending response
    res.status(200).json({
      message: 'Login successful',
      token: token,
      user: userForResponse
    });
    console.log(`[Login Attempt] Success response sent for user: ${user.id}`); // Log after sending response (might not show if connection closes immediately)

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// ==========================================
// EXPENSE ROUTES (PROTECTED)
// ==========================================

// GET EXPENSES ROUTE (Gets splits involving the user)
app.get('/api/expenses', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId;
  const { groupId } = req.query;
  
  if (groupId) {
    console.log(`Fetching expense splits for user ID: ${loggedInUserId} in group: ${groupId}`);
  } else {
    console.log(`Fetching all expense splits for user ID: ${loggedInUserId}`);
  }
  
  try {
    const userSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: loggedInUserId,
        ...(groupId && { expense: { groupId: groupId } })
      },
      include: {
        expense: {
          include: {
            paidBy: { select: { id: true, username: true } },
            group: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { expense: { date: 'desc' } }
    });
    
    res.status(200).json(userSplits);
  } catch (error) {
    console.error("Error fetching expense splits:", error);
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// CREATE EXPENSE ROUTE
app.post('/api/expenses', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId;
  const { description, amount, groupId, splits } = req.body;

  console.log(`Attempting to add expense by user ${loggedInUserId} for group ${groupId}:`, req.body);

  // Input Validation
  if (!description || !amount || !groupId || !splits) {
    return res.status(400).json({ message: 'Missing required fields (description, amount, groupId, splits)' });
  }
  
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Invalid amount provided' });
  }

  // Validate splits array
  if (!splits) {
    return res.status(400).json({ message: 'Splits array is required.' });
  }
  if (!Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ message: 'Splits must be a non-empty array' });
  }

  // Validate each split
  for (const split of splits) {
    if (!split.userId || typeof split.amountOwed !== 'number') {
      return res.status(400).json({ message: 'Each split must have userId and amountOwed' });
    }
    if (split.amountOwed < 0) {
      return res.status(400).json({ message: 'Split amounts must be non-negative' });
    }
  }

  // Verify splits sum equals expense amount
  const splitsSum = splits.reduce((sum, split) => sum + parseFloat(split.amountOwed), 0);
  if (Math.abs(splitsSum - numericAmount) > 0.01) {
    return res.status(400).json({
      message: `Sum of splits ($${splitsSum.toFixed(2)}) does not match expense amount ($${numericAmount.toFixed(2)})`
    });
  }

  try {
    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify group exists and user is a member
      const groupMembership = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: groupId, userId: loggedInUserId } }
      });

      if (!groupMembership) {
        throw new Error('User is not a member of the specified group or group does not exist.');
      }

      // 2. Create the main Expense record
      const newExpense = await tx.expense.create({
        data: {
          description: description,
          amount: numericAmount,
          groupId: groupId,
          paidById: loggedInUserId,
        }
      });

      // 3. Create ExpenseSplit records from provided splits
      await Promise.all(
        splits.map(split =>
          tx.expenseSplit.create({
            data: {
              expenseId: newExpense.id,
              userId: split.userId,
              amountOwed: parseFloat(split.amountOwed),
            }
          })
        )
      );

      console.log(`Expense ${newExpense.id} created with ${splits.length} custom splits`);
      return newExpense;
    }); // End transaction

    // Transaction Successful
    res.status(201).json({ message: 'Expense created successfully', expense: result });

  } catch (error) {
    console.error("Error creating expense:", error);
    if (error.message.includes('User is not a member')) {
      return res.status(403).json({ message: error.message }); // Forbidden
    }
    res.status(500).json({ message: 'Internal server error while creating expense' });
  }
});

// ==========================================
// GROUP ROUTES (PROTECTED)
// ==========================================

// GET USER'S GROUPS ROUTE
app.get('/api/groups', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId;
  console.log(`Fetching groups for user ID: ${loggedInUserId}`);
  
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: loggedInUserId },
      include: {
        group: {
          include: {
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { group: { name: 'asc' } }
    });
    
    const groups = memberships.map(membership => ({
      ...membership.group,
      members: membership.group.members
    }));
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// CREATE NEW GROUP ROUTE
app.post('/api/groups', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId;
  const { name } = req.body; // Expecting { name: "New Group Name" } in request body

  console.log(`User ${loggedInUserId} attempting to create group: ${name}`);

  // Basic Validation
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Group name is required.' });
  }
  
  const groupName = name.trim();

  try {
    // Use a transaction to create the group and add the creator as the first member
    const newGroup = await prisma.$transaction(async (tx) => {
      // 1. Create the group
      const createdGroup = await tx.group.create({
        data: {
          name: groupName,
        }
      });
      console.log(`Group "${createdGroup.name}" created with ID: ${createdGroup.id}`);

      // 2. Add the creator as the first member
      await tx.groupMember.create({
        data: {
          groupId: createdGroup.id,
          userId: loggedInUserId,
        }
      });
      console.log(`User ${loggedInUserId} added as first member to group ${createdGroup.id}`);

      return createdGroup; // Return the newly created group object
    }); // End transaction

    res.status(201).json({ message: 'Group created successfully', group: newGroup });

  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: 'Internal server error while creating group.' });
  }
});

// ADD MEMBER TO GROUP ROUTE
app.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const loggedInUserId = req.user.userId;
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  try {
    // Verify requesting user is a group member
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: loggedInUserId
        }
      }
    });

    if (!requesterMembership) {
      return res.status(403).json({ message: 'You must be a group member to add others' });
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email }
    });

    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already in group
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: userToAdd.id
        }
      }
    });

    if (existingMembership) {
      return res.status(409).json({ message: 'User is already in this group' });
    }

    // Add user to group
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: userToAdd.id
      }
    });

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: 'Failed to add member' });
  }
});

// GET SINGLE GROUP DETAILS ROUTE
app.get('/api/groups/:groupId', authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const loggedInUserId = req.user.userId;
  
  console.log(`Fetching group ${groupId} details for user ${loggedInUserId}`);
  
  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: loggedInUserId
        }
      },
      include: {
        group: {
          include: {
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!membership) {
      console.log(`Group ${groupId} not found or user ${loggedInUserId} is not a member`);
      return res.status(404).json({
        message: 'Group not found or you are not a member.'
      });
    }

    // Transform members array to simplify response
    const transformedGroup = {
      ...membership.group,
      members: membership.group.members.map(m => m.user)
    };

    console.log(`Successfully fetched group ${groupId} details`);
    res.status(200).json(transformedGroup);
  } catch (error) {
    console.error(`Error fetching group ${groupId} details:`, error);
    res.status(500).json({ message: 'Error fetching group details' });
  }
});

// PAYMENT ROUTES
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { payeeId, amount, groupId } = req.body;
    const payerId = req.user.userId;

    // Validate input
    if (!payeeId || !amount) {
      return res.status(400).json({ message: 'Payee ID and amount are required' });
    }
    if (payeeId === payerId) {
      return res.status(400).json({ message: 'Cannot make payment to yourself' });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    // Verify payee exists
    const payee = await prisma.user.findUnique({ where: { id: payeeId } });
    if (!payee) {
      return res.status(404).json({ message: 'Payee not found' });
    }

    // Optional: Verify both users are in group if groupId provided
    if (groupId) {
      const [payerInGroup, payeeInGroup] = await Promise.all([
        prisma.groupMember.findFirst({ where: { groupId, userId: payerId } }),
        prisma.groupMember.findFirst({ where: { groupId, userId: payeeId } })
      ]);
      if (!payerInGroup || !payeeInGroup) {
        return res.status(400).json({ message: 'Both users must be group members' });
      }
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        amount,
        payer: { connect: { id: payerId } },
        payee: { connect: { id: payeeId } },
        ...(groupId && { group: { connect: { id: groupId } } })
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ message: 'Failed to record payment' });
  }
});

// ADD MEMBER TO GROUP ROUTE
app.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId; // User performing the action
  const { groupId } = req.params; // Get groupId from URL parameter
  const { emailToAdd } = req.body; // Get email of the user to add from request body

  console.log(`User ${loggedInUserId} attempting to add user with email ${emailToAdd} to group ${groupId}`);

  // Basic validation
  if (!emailToAdd) {
    return res.status(400).json({ message: 'Email of the user to add is required.' });
  }

  try {
    // Use a transaction for multiple checks and the final insert
    await prisma.$transaction(async (tx) => {
      // 1. Check if the requesting user is actually a member of the group
      const requestingMembership = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: groupId, userId: loggedInUserId } }
      });
      
      if (!requestingMembership) {
        throw new Error('Forbidden: You are not a member of this group.');
      }

      // 2. Find the user to be added by their email
      const userToAdd = await tx.user.findUnique({
        where: { email: emailToAdd }
      });
      
      if (!userToAdd) {
        throw new Error(`User with email ${emailToAdd} not found.`);
      }

      // 3. Check if the target user is the same as the requesting user (cannot add self again)
      if (userToAdd.id === loggedInUserId) {
        throw new Error('You are already a member of this group.');
      }

      // 4. Check if the target user is ALREADY a member of the group
      const existingMembership = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: groupId, userId: userToAdd.id } }
      });
      
      if (existingMembership) {
        throw new Error(`User ${userToAdd.username} is already a member of this group.`);
      }

      // 5. If all checks pass, add the new member
      await tx.groupMember.create({
        data: {
          groupId: groupId,
          userId: userToAdd.id,
        }
      });
      
      console.log(`Successfully added user ${userToAdd.username} (ID: ${userToAdd.id}) to group ${groupId}`);
    }); // End Transaction

    res.status(200).json({ message: `User with email ${emailToAdd} added successfully to the group.` });

  } catch (error) {
    console.error(`Error adding member to group ${groupId}:`, error);
    
    // Handle specific errors thrown from the transaction
    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ message: error.message });
    }
    
    if (error.message.includes('not found') || error.message.includes('already a member') || error.message.includes('already in this group')) {
      return res.status(409).json({ message: error.message }); // Using 409 Conflict for already member
    }
    
    // Handle potential Prisma errors (e.g., group doesn't exist due to invalid groupId)
    if (error.code === 'P2025') { // Prisma code for record not found potentially on group itself
      return res.status(404).json({ message: 'Group not found or invalid group ID.' });
    }

    res.status(500).json({ message: 'Internal server error while adding member.' });
  }
});

// ==========================================
// BALANCE ROUTES (PROTECTED)
// ==========================================

// GET OVERALL BALANCE FOR LOGGED-IN USER
app.get('/api/balance/overall', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId;
  console.log(`Calculating overall balance for user ID: ${loggedInUserId}`);

  try {
    // Get all balance data in parallel
    const [
      totalPaidResult,
      totalOwedResult,
      paymentsMadeResult,
      paymentsReceivedResult
    ] = await Promise.all([
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { paidById: loggedInUserId }
      }),
      prisma.expenseSplit.aggregate({
        _sum: { amountOwed: true },
        where: { userId: loggedInUserId }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { payerId: loggedInUserId }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { payeeId: loggedInUserId }
      })
    ]);

    const totalPaid = totalPaidResult._sum.amount || 0;
    const totalOwed = totalOwedResult._sum.amountOwed || 0;
    const totalPaymentsMade = paymentsMadeResult._sum.amount || 0;
    const totalPaymentsReceived = paymentsReceivedResult._sum.amount || 0;

    // Calculate Net Balance including payments
    // Payments received increase your effective balance
    // Payments made decrease your effective balance
    const netBalance = (totalPaid + totalPaymentsReceived) - (totalOwed + totalPaymentsMade);

    console.log(`User ${loggedInUserId}:
      Total Paid = ${totalPaid},
      Total Owed = ${totalOwed},
      Payments Made = ${totalPaymentsMade},
      Payments Received = ${totalPaymentsReceived},
      Net Balance = ${netBalance}`);

    // Respond with the calculated values
    res.status(200).json({
      totalPaid: totalPaid,
      totalOwed: totalOwed,
      netBalance: netBalance,
    });

  } catch (error) {
    console.error("Error calculating overall balance:", error);
    res.status(500).json({ message: 'Error calculating balance' });
  }
});

// GET DETAILED BALANCES PER PERSON
app.get('/api/balance/detailed', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId;
  const { groupId } = req.query;
  
  if (groupId) {
    console.log(`Calculating detailed balances for user ID: ${loggedInUserId} in group: ${groupId}`);
  } else {
    console.log(`Calculating detailed balances for user ID: ${loggedInUserId} across all groups`);
  }

  try {
    let groupIds;
    
    if (groupId) {
      // Verify user is member of specified group
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: loggedInUserId
          }
        }
      });

      if (!membership) {
        console.log(`User ${loggedInUserId} is not a member of group ${groupId}`);
        return res.status(403).json({
          message: 'You are not a member of the specified group.'
        });
      }
      groupIds = [groupId];
    } else {
      // Find all groups the user is a member of
      const memberships = await prisma.groupMember.findMany({
        where: { userId: loggedInUserId },
        select: { groupId: true }
      });
      groupIds = memberships.map(m => m.groupId);
    }
    

    if (groupIds.length === 0) {
      return res.status(200).json([]); // No groups, no balances
    }

    // 2. Find all expenses in those groups, including splits and payer
    const expenses = await prisma.expense.findMany({
      where: {
        groupId: { in: groupIds } // Expenses in user's groups
      },
      include: {
        paidBy: { // Who paid for the expense
          select: { id: true, username: true }
        },
        splits: { // All splits for this expense
          include: {
            user: { // User associated with the split
              select: { id: true, username: true }
            }
          }
        }
      }
    });

    // 3. Calculate direct balances between logged-in user and others
    // This is a more efficient approach than the previous implementation
    const userBalances = new Map(); // Map<userId, { username: string, balance: number }>

    // Process each expense
    expenses.forEach(expense => {
      const payerId = expense.paidById;
      const payerUsername = expense.paidBy.username;
      
      // Skip expenses not involving the logged-in user
      const userSplit = expense.splits.find(split => split.userId === loggedInUserId);
      if (payerId !== loggedInUserId && !userSplit) return;
      
      // Process each split in the expense
      expense.splits.forEach(split => {
        const debtorId = split.userId;
        const debtorUsername = split.user.username;
        const amountOwed = split.amountOwed;
        
        // Skip self-entries
        if (debtorId === loggedInUserId) return;
        
        // Case 1: Logged-in user paid, other user owes them
        if (payerId === loggedInUserId) {
          // Initialize entry if it doesn't exist
          if (!userBalances.has(debtorId)) {
            userBalances.set(debtorId, { username: debtorUsername, balance: 0 });
          }
          // Add to balance (positive means they owe logged-in user)
          userBalances.get(debtorId).balance += amountOwed;
        }
        
        // Case 2: Other user paid, logged-in user owes them
        else if (payerId !== loggedInUserId && debtorId === loggedInUserId) {
          // Initialize entry if it doesn't exist
          if (!userBalances.has(payerId)) {
            userBalances.set(payerId, { username: payerUsername, balance: 0 });
          }
          // Subtract from balance (negative means logged-in user owes them)
          userBalances.get(payerId).balance -= amountOwed;
        }
      });
    });

    // 4. Convert map to array and filter out zero balances
    const detailedBalances = Array.from(userBalances.entries())
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        balance: Math.round(data.balance * 100) / 100 // Round to 2 decimal places
      }))
      .filter(item => Math.abs(item.balance) > 0.001); // Filter out negligible balances

    console.log(`Detailed balances for user ${loggedInUserId}:`, detailedBalances);
    res.status(200).json(detailedBalances);

  } catch (error) {
    console.error("Error calculating detailed balances:", error);
    res.status(500).json({ message: 'Error calculating detailed balances' });
  }
});

// Apply error handling middleware
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});