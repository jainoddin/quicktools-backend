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

export function validateRuntimeEnvironment() {
  if (!isProd) return;

  mustGet('RAZORPAY_KEY_ID');
  mustGet('RAZORPAY_KEY_SECRET');

  if (process.env.CLOUDFLARE_AI_ENABLED === 'true') {
    mustGet('CLOUDFLARE_ACCOUNT_ID');
    mustGet('CLOUDFLARE_AI_API_TOKEN');
  }

  if (process.env.CONTENT_AUTOMATION_ENABLED === 'true') {
    if (!process.env.GEMINI_API_KEYS && !process.env.GEMINI_API_KEY) {
      throw new Error('Content automation is enabled but GEMINI_API_KEYS/GEMINI_API_KEY is missing');
    }
    for (const name of ['R2_ENDPOINT_URL', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']) {
      mustGet(name);
    }
  }
}
