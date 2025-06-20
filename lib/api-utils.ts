import { cacheManager } from "./cache";

export interface RequestOptions extends RequestInit {
  /** Number of retry attempts for the request (default: 2) */
  retries?: number;
  
  /** Time to wait between retries in seconds (default: 1) */
  retryDelay?: number;
  
  /** Whether to bypass cache and force a fresh request (default: false) */
  skipCache?: boolean;
  
  /** Cache TTL in milliseconds (default: 3 hours) */
  cacheTTL?: number;
  
  /** Cache key for storing the response (required if using cache) */
  cacheKey?: string;
  
  /** Maximum age of cached data in milliseconds before attempting a refresh (default: 1 hour) */
  staleWhileRevalidateAge?: number;
  
  /** Callback to generate mock data if the request fails */
  mockDataGenerator?: () => any;
}

// Singleton to track rate limits across the application
export class RateLimitTracker {
  private static instance: RateLimitTracker;
  
  // Track API endpoints that have been rate limited
  private rateLimitedEndpoints: Map<string, number> = new Map();
  
  // Keep track of when we can retry different rate-limited resources
  private retryAfterTimestamps: Map<string, number> = new Map();
  
  private constructor() {}
  
  public static getInstance(): RateLimitTracker {
    if (!RateLimitTracker.instance) {
      RateLimitTracker.instance = new RateLimitTracker();
    }
    return RateLimitTracker.instance;
  }
  
  /**
   * Check if an endpoint is currently rate-limited
   */
  public isRateLimited(endpoint: string): boolean {
    const key = this.getEndpointKey(endpoint);
    const retryAfter = this.retryAfterTimestamps.get(key);
    
    if (!retryAfter) return false;
    
    // If the current time is past the retry time, we can try again
    if (Date.now() > retryAfter) {
      this.retryAfterTimestamps.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get the time remaining until we can retry a rate-limited endpoint (in seconds)
   */
  public getRetryAfterSeconds(endpoint: string): number {
    const key = this.getEndpointKey(endpoint);
    const retryAfter = this.retryAfterTimestamps.get(key);
    
    if (!retryAfter) return 0;
    
    const secondsRemaining = Math.ceil((retryAfter - Date.now()) / 1000);
    return secondsRemaining > 0 ? secondsRemaining : 0;
  }
  
  /**
   * Mark an endpoint as rate-limited
   */
  public setRateLimited(endpoint: string, retryAfterSeconds: number = 3600): void {
    const key = this.getEndpointKey(endpoint);
    
    // Set retry timestamp (current time + retry seconds)
    const retryTimestamp = Date.now() + (retryAfterSeconds * 1000);
    this.retryAfterTimestamps.set(key, retryTimestamp);
    
    // Increment rate limit counter for this endpoint
    const currentCount = this.rateLimitedEndpoints.get(key) || 0;
    this.rateLimitedEndpoints.set(key, currentCount + 1);
    
    console.log(`🛑 Rate limit hit for ${key}, retry after ${retryAfterSeconds} seconds (${new Date(retryTimestamp).toLocaleTimeString()})`);
  }
  
  /**
   * Get a simplified key for the endpoint
   */
  private getEndpointKey(url: string): string {
    try {
      // Extract base endpoint path from URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Generate a key based on the first few path segments
      // e.g., "/v3/application/shops/123456/listings" -> "v3:application:shops:listings"
      const relevantParts = pathParts.filter(part => part && !part.match(/^\d+$/)).slice(0, 4);
      return relevantParts.join(':');
    } catch (error) {
      // Fallback if URL parsing fails
      return url.split('?')[0];
    }
  }
}

// Global rate limit tracking
let globalRateLimitInfo = {
  maxRequestsPerDay: 5000,
  currentRequests: 0,
  dailyReset: Date.now() + (24 * 60 * 60 * 1000), // Default to 24 hours from now
  lastUpdated: Date.now()
};

/**
 * Gets the current rate limit status
 */
export function getRateLimitStatus(): {
  maxRequestsPerDay: number;
  currentRequests: number;
  remainingRequests: number;
  percentageUsed: number;
  dailyReset: number;
  lastUpdated: number;
} {
  // Check if we need to reset the counter (new day)
  const now = Date.now();
  if (now > globalRateLimitInfo.dailyReset) {
    globalRateLimitInfo = {
      ...globalRateLimitInfo,
      currentRequests: 0,
      dailyReset: now + (24 * 60 * 60 * 1000),
      lastUpdated: now
    };
  }

  return {
    ...globalRateLimitInfo,
    remainingRequests: Math.max(0, globalRateLimitInfo.maxRequestsPerDay - globalRateLimitInfo.currentRequests),
    percentageUsed: (globalRateLimitInfo.currentRequests / globalRateLimitInfo.maxRequestsPerDay) * 100
  };
}

/**
 * Updates the rate limit tracking information after an API call
 */
export async function updateRateLimitInfo(requestCount: number = 1): Promise<void> {
  const now = Date.now();
  
  // If we're past the reset time, reset the counter
  if (now > globalRateLimitInfo.dailyReset) {
    globalRateLimitInfo = {
      ...globalRateLimitInfo,
      currentRequests: requestCount,
      dailyReset: now + (24 * 60 * 60 * 1000),
      lastUpdated: now
    };
  } else {
    // Otherwise increment the counter
    globalRateLimitInfo = {
      ...globalRateLimitInfo,
      currentRequests: globalRateLimitInfo.currentRequests + requestCount,
      lastUpdated: now
    };
  }
  
  try {
    // TODO: Firebase geçişi sonrası rate limit tracking Firebase'e taşınacak
    console.log("Rate limit tracking - Firebase geçişi sonrası güncellenecek");
  } catch (error) {
    console.error("Failed to update rate limit info in database:", error);
    // Continue even if database update fails - we still have in-memory tracking
  }
}

/**
 * Enhanced fetch with caching, rate limiting, and retry functionality
 */
export async function fetchWithCache<T>(
  url: string, 
  options: RequestOptions = {}
): Promise<T> {
  const {
    retries = 2,
    retryDelay = 1,
    skipCache = false,
    cacheTTL = 3 * 60 * 60 * 1000, // 3 hours
    cacheKey,
    staleWhileRevalidateAge = 60 * 60 * 1000, // 1 hour
    mockDataGenerator,
    ...fetchOptions
  } = options;
  
  const rateLimitTracker = RateLimitTracker.getInstance();
  
  // Check if this endpoint is rate-limited
  if (rateLimitTracker.isRateLimited(url)) {
    const retrySeconds = rateLimitTracker.getRetryAfterSeconds(url);
    console.log(`⏳ Endpoint ${url} is rate-limited, retry after ${retrySeconds} seconds`);
    
    // If we have cached data, return it even if stale
    if (cacheKey) {
      const cachedData = cacheManager.get<T>(cacheKey);
      if (cachedData) {
        console.log(`📦 Using stale cached data for ${cacheKey} due to rate limiting`);
        return cachedData;
      }
    }
    
    // If we have a mock data generator, use it
    if (mockDataGenerator) {
      console.log(`🔄 Generating mock data for ${url} due to rate limiting`);
      const mockData = mockDataGenerator();
      
      // Cache the mock data with a short TTL
      if (cacheKey) {
        cacheManager.set(cacheKey, mockData, { ttl: 5 * 60 * 1000 }); // 5 minutes
      }
      
      return mockData as T;
    }
    
    // Throw a rate limit error if we can't serve cached or mock data
    throw new Error(`Rate limited: Retry after ${retrySeconds} seconds`);
  }
  
  // Try to get from cache first
  if (cacheKey && !skipCache) {
    const cachedData = cacheManager.get<T>(cacheKey);
    if (cachedData) {
      console.log(`📦 Using cached data for ${cacheKey}`);
      
      // If the data is stale, trigger a background refresh
      const cacheMetadata = cacheManager.getMetadata(cacheKey);
      if (cacheMetadata && Date.now() - cacheMetadata.timestamp > staleWhileRevalidateAge) {
        console.log(`🔄 Data is stale, triggering background refresh for ${cacheKey}`);
        fetchAndUpdateCache(url, fetchOptions, cacheKey, cacheTTL, 0, retryDelay, mockDataGenerator)
          .catch(error => console.error(`Background refresh failed for ${cacheKey}:`, error));
      }
      
      return cachedData;
    }
  }
  
  // If no cache or skipCache is true, fetch fresh data
  return fetchAndUpdateCache(url, fetchOptions, cacheKey, cacheTTL, retries, retryDelay, mockDataGenerator);
}

/**
 * Helper function to fetch data and update cache
 */
async function fetchAndUpdateCache<T>(
  url: string,
  fetchOptions: RequestInit,
  cacheKey?: string,
  cacheTTL: number = 3 * 60 * 60 * 1000,
  retries: number = 2,
  retryDelay: number = 1,
  mockDataGenerator?: () => any
): Promise<T> {
  const rateLimitTracker = RateLimitTracker.getInstance();
  let lastError: Error | null = null;
  
  // Try the fetch with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${retries} for ${url}`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
      }
      
      // Update the rate limit tracking before making a request
      updateRateLimitInfo(1);
      
      const response = await fetch(url, fetchOptions);
      
      // Handle rate limiting
      if (response.status === 429) {
        // Get retry-after header or default to 1 hour
        const retryAfter = parseInt(response.headers.get('Retry-After') || '3600', 10);
        rateLimitTracker.setRateLimited(url, retryAfter);
        
        // If we have a mock data generator, use it
        if (mockDataGenerator) {
          console.log(`🔄 Generating mock data for ${url} due to rate limiting`);
          const mockData = mockDataGenerator();
          
          // Cache the mock data with a short TTL
          if (cacheKey) {
            cacheManager.set(cacheKey, mockData, { ttl: 5 * 60 * 1000 }); // 5 minutes
          }
          
          return mockData as T;
        }
        
        throw new Error(`Rate limited: Retry after ${retryAfter} seconds`);
      }
      
      // Handle authorization errors
      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`⛔ Authorization error for ${url}:`, errorData);
        
        // If we have a mock data generator, use it
        if (mockDataGenerator) {
          console.log(`🔄 Generating mock data for ${url} due to auth error`);
          const mockData = mockDataGenerator();
          return mockData as T;
        }
        
        throw new Error(`Authorization error: ${errorData.error || response.statusText}`);
      }
      
      // Handle general errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API error for ${url}:`, errorData);
        throw new Error(`API error: ${errorData.error || response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Update cache if we have a cache key
      if (cacheKey) {
        cacheManager.set(cacheKey, data, { ttl: cacheTTL });
        console.log(`📦 Updated cache for ${cacheKey}`);
      }
      
      return data as T;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Fetch error for ${url} (attempt ${attempt + 1}/${retries + 1}):`, error);
      
      // If it's the last attempt, we'll handle it outside the loop
      if (attempt === retries) {
        break;
      }
    }
  }
  
  // All retries failed, try to use mock data
  if (mockDataGenerator) {
    console.log(`🔄 Generating mock data for ${url} after all fetch attempts failed`);
    const mockData = mockDataGenerator();
    
    // Cache the mock data with a short TTL
    if (cacheKey) {
      cacheManager.set(cacheKey, mockData, { ttl: 5 * 60 * 1000 }); // 5 minutes
    }
    
    return mockData as T;
  }
  
  // No mock data generator, rethrow the last error
  throw lastError || new Error(`Failed to fetch ${url}`);
} 