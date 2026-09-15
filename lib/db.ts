import oracledb from 'oracledb';

let pool: oracledb.Pool | null = null;
let poolPromise: Promise<oracledb.Pool> | null = null;

export async function getOraclePool() {
  if (pool) {
    return pool;
  }
  if (poolPromise) return poolPromise;

  const user = process.env.ORACLE_USER;
  const password = process.env.ORACLE_PASSWORD;
  const connectString = process.env.ORACLE_CONNECT_STRING;

  if (!user) {
    throw new Error('ORACLE_USER is missing from .env.local');
  }

  if (!password) {
    throw new Error('ORACLE_PASSWORD is missing from .env.local');
  }

  if (!connectString) {
    throw new Error('ORACLE_CONNECT_STRING is missing from .env.local');
  }

  poolPromise = oracledb.createPool({
    user,
    password,
    connectString,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
    // Check idle connections before reuse; the remote database can close them.
    poolPingInterval: 0,
  });

  try {
    pool = await poolPromise;
    return pool;
  } finally {
    poolPromise = null;
  }
}

export async function getOracleConnection() {
  try {
    const dbPool = await getOraclePool();
    return await dbPool.getConnection();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (!['NJS-500', 'NJS-501', 'ORA-03113', 'ORA-03114'].includes(code || '')) throw error;
    // Retry acquisition once only. No SQL statement or vehicle mutation is replayed.
    const dbPool = await getOraclePool();
    return dbPool.getConnection();
  }
}
