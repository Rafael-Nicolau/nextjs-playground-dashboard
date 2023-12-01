import mysql, { RowDataPacket } from 'mysql2/promise';
import { sql } from '@vercel/postgres';
import {
  CustomerField,
  CustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';

export async function fetchRevenue() {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'nextjs_dashboard_mysql',
    });

    const [rows] = (await connection.query(
      `SELECT * FROM revenue`,
    )) as RowDataPacket[];
    console.log('Data fetch completed after 3 seconds.');
    const data: Revenue[] = rows.map((row: Revenue) => ({
      month: row.month,
      revenue: row.revenue,
    }));

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'nextjs_dashboard_mysql',
    });

    const [rows] = (await connection.execute(`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.customer_id
      ORDER BY invoices.date DESC
      LIMIT 5`)) as RowDataPacket[];

    const data: LatestInvoiceRaw[] = rows.map((row: LatestInvoiceRaw) => ({
      amount: row.amount,
      name: row.name,
      image_url: row.image_url,
      email: row.email,
      id: row.id,
    }));

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'nextjs_dashboard_mysql',
    });

    const [invoiceCountPromise] = (await connection.execute(
      `SELECT COUNT(*) FROM invoices`,
    )) as RowDataPacket[];
    const [customerCountPromise] = (await connection.execute(
      `SELECT COUNT(*) FROM customers`,
    )) as RowDataPacket[];
    const [invoiceStatusPromise] = (await connection.execute(`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`)) as RowDataPacket[];

    const numberOfInvoices = Number(invoiceCountPromise[0]['COUNT(*)'] ?? '0');
    const numberOfCustomers = Number(
      customerCountPromise[0]['COUNT(*)'] ?? '0',
    );
    const totalPaidInvoices = formatCurrency(
      invoiceStatusPromise[0].paid ?? '0',
    );
    const totalPendingInvoices = formatCurrency(
      invoiceStatusPromise[0].pending ?? '0',
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const filteredQuery = !query ? '%' : query;

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'nextjs_dashboard_mysql',
    });
    connection.config.namedPlaceholders = true;

    const [invoices] = await connection.query(
      'SELECT invoices.id, invoices.amount, invoices.date, invoices.status, customers.name, customers.email, customers.image_url FROM invoices JOIN customers ON invoices.customer_id = customers.customer_id WHERE customers.name LIKE :query OR customers.email LIKE :query OR CAST(invoices.amount AS CHAR) LIKE :query OR CAST(invoices.date AS CHAR) LIKE :query OR invoices.status LIKE :query ORDER BY invoices.date DESC LIMIT :limit OFFSET :offset;',
      {
        query: `%${filteredQuery}%`,
        limit: ITEMS_PER_PAGE,
        offset: offset,
      },
    );

    return invoices as InvoicesTable[];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();
  const filteredQuery = !query ? '%' : query;
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'nextjs_dashboard_mysql',
    });
    connection.config.namedPlaceholders = true;

    const [count] = (await connection.query(
      `SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.customer_id
    WHERE
      customers.name LIKE :query OR
      customers.email LIKE :query OR
      CAST(invoices.amount AS CHAR) LIKE :query OR
      CAST(invoices.date AS CHAR) LIKE :query OR
      invoices.status LIKE :query
  `,
      { query: `%${filteredQuery}%` },
    )) as RowDataPacket[];

    const totalPages: number = Math.ceil(
      Number(count[0]['COUNT(*)']) / ITEMS_PER_PAGE,
    );

    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'nextjs_dashboard_mysql',
    });
    //InvoiceForm
    const [data] = (await connection.query(`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `)) as RowDataPacket[];

    const invoice: InvoiceForm[] = data.map((invoice: InvoiceForm) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore();
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'nextjs_dashboard_mysql',
    });
    const [data] = (await connection.query(`
      SELECT
        id,
        customer_id,
        name
      FROM customers
      ORDER BY name ASC
    `)) as RowDataPacket[];

    const customers = data;
    return customers as CustomerField[];
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();
  try {
    const data = await sql<CustomersTable>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  noStore();
  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
