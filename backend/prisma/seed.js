// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // Needed to hash friend's password
const prisma = new PrismaClient();

// !!! IMPORTANT: Replace with your actual registered email !!!
const YOUR_EMAIL = 'anshuprakash55@gmail.com';
// !!! IMPORTANT: Define an email for the second user !!!
const FRIEND_EMAIL = 'friend@example.com';
const FRIEND_USERNAME = 'FriendUser';
const FRIEND_PASSWORD = 'password123'; // Simple password for seed user
const SALT_ROUNDS = 10;
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

async function main() {
  console.log(`Start seeding multi-user scenario...`);
  console.log(`Your User Email: ${YOUR_EMAIL}`);
  console.log(`Friend User Email: ${FRIEND_EMAIL}`);

  // --- Clean up previous seed data (optional but recommended for consistency) ---
  // Delete in reverse order of dependency (Splits -> Expenses -> Members -> Groups -> Users (carefully))
  // Or simply delete expenses/splits associated with the specific group/users if preferred.
  // For simplicity here, we'll just delete the specific group which cascades deletes.
  // NOTE: This assumes you only have the ONE seeded group. Be careful if you have other data.
  console.log('Attempting to delete previous seed group (if exists)...');
  try {
      await prisma.group.deleteMany({ where: { name: 'Sample Apartment Bills' } });
      console.log('Previous seed group and related data deleted.');
  } catch(e) {
      console.log('Could not delete previous seed group (might not exist yet).', e.message);
  }
  // We won't delete users here, assuming they exist from signup. We'll create/find the friend.

  // --- 1. Find/Verify Your User ---
  let yourUser;
  try {
    yourUser = await prisma.user.findUniqueOrThrow({
      where: { email: YOUR_EMAIL },
    });
    console.log(`Found your user: ${yourUser.username} (ID: ${yourUser.id})`);
  } catch (error) {
    console.error(`Error finding YOUR user with email ${YOUR_EMAIL}. Please sign up first.`);
    return; // Stop if your user isn't found
  }

  // --- 2. Find or Create Friend User ---
  const hashedPassword = await bcrypt.hash(FRIEND_PASSWORD, SALT_ROUNDS);
  let friendUser = await prisma.user.upsert({
      where: { email: FRIEND_EMAIL },
      update: {}, // Nothing to update if found
      create: {
          email: FRIEND_EMAIL,
          username: FRIEND_USERNAME,
          password: hashedPassword,
      },
  });
  console.log(`Found/Created friend user: ${friendUser.username} (ID: ${friendUser.id})`);

  // --- 3. Create the Group ---
  const group = await prisma.group.create({
    data: {
      name: 'Sample Apartment Bills',
    },
  });
  console.log(`Created group: ${group.name} (ID: ${group.id})`);

  // --- 4. Add BOTH users to the group ---
  await prisma.groupMember.createMany({
      data: [
          { userId: yourUser.id, groupId: group.id },
          { userId: friendUser.id, groupId: group.id },
      ]
  });
  console.log(`Added ${yourUser.username} and ${friendUser.username} to group ${group.name}`);

  // --- 5. Create Expense 1 (Groceries) - Paid by YOU, Split Equally ---
  const expense1Amount = 120.50;
  const expense1SplitAmount = Math.round((expense1Amount / 2) * 100) / 100; // Split 2 ways

  await prisma.$transaction(async (tx) => {
      const expense1 = await tx.expense.create({
          data: {
              description: 'Monthly Groceries',
              amount: expense1Amount,
              groupId: group.id,
              paidById: yourUser.id, // You paid
          },
      });
      console.log(`Created expense 1: ${expense1.description} for $${expense1.amount}`);

      // Create splits for expense 1
      await tx.expenseSplit.createMany({
          data: [
              { expenseId: expense1.id, userId: yourUser.id, amountOwed: expense1SplitAmount },
              { expenseId: expense1.id, userId: friendUser.id, amountOwed: expense1SplitAmount },
          ]
      });
      console.log(`Split expense 1 equally ($${expense1SplitAmount} each)`);
  });

  // --- 6. Create Expense 2 (Electricity) - Paid by FRIEND, Split Equally ---
  const expense2Amount = 85.00;
  const expense2SplitAmount = Math.round((expense2Amount / 2) * 100) / 100; // Split 2 ways

  await prisma.$transaction(async (tx) => {
      const expense2 = await tx.expense.create({
          data: {
              description: 'Electricity Bill',
              amount: expense2Amount,
              groupId: group.id,
              paidById: friendUser.id, // Friend paid
          },
      });
      console.log(`Created expense 2: ${expense2.description} for $${expense2.amount}`);

      // Create splits for expense 2
      await tx.expenseSplit.createMany({
          data: [
              { expenseId: expense2.id, userId: yourUser.id, amountOwed: expense2SplitAmount },
              { expenseId: expense2.id, userId: friendUser.id, amountOwed: expense2SplitAmount },
          ]
      });
       console.log(`Split expense 2 equally ($${expense2SplitAmount} each)`);
  });

  console.log('Seeding finished.');
}

// Execute main function
main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Prisma Client disconnected.');
  });