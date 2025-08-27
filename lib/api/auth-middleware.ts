import { createServiceRoleClient } from '@/lib/supabase/service-role';

interface ApiKeyData {
  id: number;
  key_name: string;
  permissions: {
    read: boolean;
    write: boolean;
    admin?: boolean;
  };
  rate_limit_per_hour: number;
  is_active: boolean;
}

interface RateLimitState {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

export async function authenticateApiKey(request: Request): Promise<ApiKeyData> {
  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  
  if (!apiKey) {
    throw new Error('API key required. Include in Authorization header as "Bearer your-api-key"');
  }
  
  // Validate API key format (should be at least 32 characters)
  if (apiKey.length < 32) {
    throw new Error('Invalid API key format');
  }
  
  const keyData = await validateApiKey(apiKey);
  if (!keyData.is_active) {
    throw new Error('API key is inactive');
  }
  
  // Rate limiting check
  await enforceRateLimit(keyData.id.toString(), keyData.rate_limit_per_hour);
  
  // Update last used timestamp
  await updateLastUsed(keyData.id);
  
  return keyData;
}

async function validateApiKey(apiKey: string): Promise<ApiKeyData> {
  const supabase = createServiceRoleClient();
  
  // Hash the API key for lookup (in production, you'd use proper hashing)
  const keyHash = Buffer.from(apiKey).toString('base64');
  
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('id, key_name, permissions, rate_limit_per_hour, is_active')
    .eq('key_hash', keyHash)
    .single();
    
  if (error || !keyData) {
    throw new Error('Invalid API key');
  }
  
  return {
    ...keyData,
    permissions: keyData.permissions as ApiKeyData['permissions']
  };
}

async function enforceRateLimit(keyId: string, limitPerHour: number): Promise<void> {
  const now = Date.now();
  const windowStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000); // Hour window
  
  const currentState = rateLimitStore.get(keyId) || { count: 0, windowStart: 0 };
  
  // Reset count if we're in a new window
  if (currentState.windowStart !== windowStart) {
    currentState.count = 0;
    currentState.windowStart = windowStart;
  }
  
  // Check if limit exceeded
  if (currentState.count >= limitPerHour) {
    const resetTime = new Date(windowStart + 60 * 60 * 1000);
    throw new Error(`Rate limit exceeded. Limit: ${limitPerHour}/hour. Resets at: ${resetTime.toISOString()}`);
  }
  
  // Increment counter
  currentState.count++;
  rateLimitStore.set(keyId, currentState);
}

async function updateLastUsed(keyId: number): Promise<void> {
  const supabase = createServiceRoleClient();
  
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}

export function requirePermission(keyData: ApiKeyData, permission: 'read' | 'write' | 'admin'): void {
  if (permission === 'admin' && !keyData.permissions.admin) {
    throw new Error('Admin permission required');
  }
  
  if (permission === 'write' && !keyData.permissions.write) {
    throw new Error('Write permission required');
  }
  
  if (permission === 'read' && !keyData.permissions.read) {
    throw new Error('Read permission required');
  }
}

export function createApiResponse(data: any, options: { 
  status?: number;
  message?: string;
  metadata?: Record<string, any>;
} = {}) {
  const { status = 200, message, metadata = {} } = options;
  
  return Response.json({
    success: status < 400,
    data,
    message,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }, { status });
}

export function createErrorResponse(error: string | Error, status = 400) {
  const message = error instanceof Error ? error.message : error;
  
  return Response.json({
    success: false,
    error: message,
    metadata: {
      timestamp: new Date().toISOString()
    }
  }, { status });
}