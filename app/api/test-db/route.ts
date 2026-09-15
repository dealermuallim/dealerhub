import { NextResponse } from 'next/server';
import oracledb from 'oracledb';

import { requireAdminSession } from '@/lib/admin-auth';

export async function GET(req: Request) {
  const adminSession = await requireAdminSession(req);
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let connection;

  try {
    const user = process.env.ORACLE_USER;
    const password = process.env.ORACLE_PASSWORD;
    const connectString = process.env.ORACLE_CONNECT_STRING;

    if (!user || !password || !connectString) {
      return NextResponse.json(
        { success: false, error: 'Database configuration is incomplete.' },
        { status: 500 }
      );
    }

    connection = await oracledb.getConnection({
      user,
      password,
      connectString,
    });

    const result = await connection.execute(`
      SELECT
        USER AS SESSION_USER,
        SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS CURRENT_SCHEMA
      FROM DUAL
    `);

    return NextResponse.json({
      success: true,
      rows: result.rows ?? [],
    });
  } catch (error) {
    console.error('Oracle direct connection test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Database connection test failed.',
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}