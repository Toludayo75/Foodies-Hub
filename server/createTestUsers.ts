import bcrypt from 'bcrypt';
import { db } from './drizzle';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export default async function createTestUsers() {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, 'admin@foodapp.com')
    });

    if (!existingAdmin) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.insert(users).values({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@foodapp.com',
        password: hashedPassword,
        phone: '+234567890123',
        role: 'admin'
      });
      console.log('Admin user created with password: admin123');
    } else {
      // Update existing admin password to ensure it's properly hashed
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, 'admin@foodapp.com'));
      console.log('Admin user password updated');
    }

    // Check if rider user already exists
    const existingRider = await db.query.users.findFirst({
      where: eq(users.email, 'rider@foodapp.com')
    });

    if (!existingRider) {
      // Create rider user
      const hashedPassword = await bcrypt.hash('rider123', 10);
      await db.insert(users).values({
        firstName: 'Test',
        lastName: 'Rider',
        email: 'rider@foodapp.com',
        password: hashedPassword,
        phone: '+234567890124',
        role: 'rider'
      });
      console.log('Rider user created with password: rider123');
    } else {
      // Update existing rider password to ensure it's properly hashed
      const hashedPassword = await bcrypt.hash('rider123', 10);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, 'rider@foodapp.com'));
      console.log('Rider user password updated');
    }

    // Check if customer user already exists
    const existingCustomer = await db.query.users.findFirst({
      where: eq(users.email, 'test@example.com')
    });

    if (!existingCustomer) {
      // Create customer user
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db.insert(users).values({
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        password: hashedPassword,
        phone: '+234567890125',
        role: 'customer'
      });
      console.log('Test customer created with password: password123');
    } else {
      // Update existing customer password to ensure it's properly hashed
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, 'test@example.com'));
      console.log('Test customer password updated');
    }

    console.log('Test users setup complete');
    console.log('Login credentials:');
    console.log('- Admin: admin@foodapp.com / admin123');
    console.log('- Rider: rider@foodapp.com / rider123');
    console.log('- Customer: test@example.com / password123');
  } catch (error) {
    console.error('Error creating test users:', error);
  }
}