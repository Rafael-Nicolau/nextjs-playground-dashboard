const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Placeholder data
const {
  invoices,
  customers,
  revenue,
  users,
} = require('../app/lib/placeholder-data.js');

async function seedUsers(connection) {
  try {
    // Create the "users" table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        UNIQUE KEY email_idx (email(255))
      );
    `);

    console.log(`Created "users" table`);

    // Insert data into the "users" table
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return connection.execute(
          `
          INSERT INTO users (id, name, email, password)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id=id;
        `,
          [user.id, user.name, user.email, hashedPassword],
        );
      }),
    );

    console.log(`Seeded ${insertedUsers.length} users`);

    return {
      users: insertedUsers,
    };
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function seedInvoices(connection) {
  try {
    // Create the "invoices" table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id CHAR(36) PRIMARY KEY,
        customer_id CHAR(36) NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `);

    console.log(`Created "invoices" table`);

    // Insert data into the "invoices" table
    const insertedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        return connection.execute(
          `
          INSERT INTO invoices (id, customer_id, amount, status, date)
          VALUES (UUID(), ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id=id;
        `,
          [invoice.customer_id, invoice.amount, invoice.status, invoice.date],
        );
      }),
    );

    console.log(`Seeded ${insertedInvoices.length} invoices`);

    return {
      invoices: insertedInvoices,
    };
  } catch (error) {
    console.error('Error seeding invoices:', error);
    throw error;
  }
}

async function seedCustomers(connection) {
  try {
    // Create the "customers" table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL
      );
    `);

    console.log(`Created "customers" table`);

    // Insert data into the "customers" table
    const insertedCustomers = await Promise.all(
      customers.map(async (customer) =>
        connection.execute(
          `
          INSERT INTO customers (id, name, email, image_url)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id=id;
        `,
          [customer.id, customer.name, customer.email, customer.image_url],
        ),
      ),
    );

    console.log(`Seeded ${insertedCustomers.length} customers`);

    return {
      customers: insertedCustomers,
    };
  } catch (error) {
    console.error('Error seeding customers:', error);
    throw error;
  }
}

async function seedRevenue(connection) {
  try {
    // Create the "revenue" table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS revenue (
        month VARCHAR(4) PRIMARY KEY,
        revenue INT NOT NULL
      );
    `);

    console.log(`Created "revenue" table`);

    // Insert data into the "revenue" table
    const insertedRevenue = await Promise.all(
      revenue.map(async (rev) =>
        connection.execute(
          `
          INSERT INTO revenue (month, revenue)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE month=month;
        `,
          [rev.month, rev.revenue],
        ),
      ),
    );

    console.log(`Seeded ${insertedRevenue.length} revenue`);

    return {
      revenue: insertedRevenue,
    };
  } catch (error) {
    console.error('Error seeding revenue:', error);
    throw error;
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'nextjs_dashboard_mysql',
  });

  try {
    await seedUsers(connection);
    await seedCustomers(connection);
    await seedInvoices(connection);
    await seedRevenue(connection);
  } catch (error) {
    console.error(
      'An error occurred while attempting to seed the database:',
      error,
    );
  } finally {
    await connection.end();
  }
}

main();
