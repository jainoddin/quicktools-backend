export const NODE_ENV = process.env.NODE_ENV || 'development';
export const isProd = NODE_ENV === 'production';

function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

// Critical secrets
export const JWT_SECRET = isProd ? mustGet('JWT_SECRET') : (process.env.JWT_SECRET || 'dev_only_change_me');

// URLs / ports
export const PORT = Number(process.env.PORT || 5000);
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Optional (validated only in production)
export const MONGODB_URI = isProd ? mustGet('MONGODB_URI') : process.env.MONGODB_URI;

