import { adminDb } from '@/lib/firebase-admin';

// Types
interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price: string;
  currency_code: string;
  state: string;
  creation_timestamp: number;
  last_modified_timestamp: number;
  num_favorers: number;
  views: number;
  url: string;
  images: EtsyImage[];
  tags: string[];
  taxonomy_id: number;
  category_path: string[];
  materials: string[];
  shop_section_id?: number;
  featured_rank?: number;
  processing_min?: number;
  processing_max?: number;
  shipping_profile_id?: number;
}

interface EtsyImage {
  listing_image_id: number;
  hex_code?: string;
  red?: number;
  green?: number;
  blue?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  is_black_and_white?: boolean;
  creation_timestamp: number;
  created_timestamp: number;
  rank: number;
  url_570xN: string;
  url_170x135: string;
  url_680x540: string;
  url_fullxfull: string;
  alt_text?: string;
}

interface StoredListing {
  // Basic Info
  listing_id: number;
  title: string;
  description: string;
  
  // Pricing
  price: number;
  currency_code: string;
  
  // Status
  state: string; // active, inactive, draft
  
  // Timestamps  
  created_at: Date;
  updated_at: Date;
  last_modified: Date;
  
  // Analytics
  views: number;
  favorites: number;
  featured_rank?: number;
  
  // SEO Data
  tags: string[];
  category_path: string[];
  materials: string[];
  taxonomy_id: number;
  
  // Images
  images: {
    listing_image_id: number;
    url_570xN: string;
    url_170x135: string; 
    url_680x540: string;
    url_fullxfull: string;
    rank: number;
    alt_text?: string;
    colors?: {
      hex_code?: string;
      red?: number;
      green?: number; 
      blue?: number;
    };
  }[];
  
  // URLs
  etsy_url: string;
  
  // Processing
  processing_time?: {
    min: number;
    max: number;
  };
  
  // Sync Info
  synced_at: Date;
  data_source: 'etsy_api';
}

interface SyncStatus {
  shop_id: string;
  user_id: string;
  last_sync: Date;
  next_sync: Date;
  total_listings: number;
  synced_listings: number;
  failed_listings: number;
  sync_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  sync_duration_ms?: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

interface StoreAnalytics {
  shop_id: string;
  total_listings: number;
  active_listings: number;
  draft_listings: number;
  inactive_listings: number;
  total_views: number;
  total_favorites: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  most_viewed_listing: {
    listing_id: number;
    title: string;
    views: number;
  };
  most_favorited_listing: {
    listing_id: number;
    title: string;
    favorites: number;
  };
  top_tags: {
    tag: string;
    count: number;
  }[];
  calculated_at: Date;
}

class StoreDataSystem {
  
  // Firebase Collections
  private STORE_LISTINGS_COLLECTION = 'store_listings';
  private SYNC_STATUS_COLLECTION = 'store_sync_status';
  private STORE_ANALYTICS_COLLECTION = 'store_analytics';
  
  /**
   * Sync all store data from Etsy API
   */
  async syncStoreData(shopId: string, userId: string): Promise<SyncStatus> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting store sync for shop: ${shopId}`);
      
      // Create initial sync status
      const syncStatus: SyncStatus = {
        shop_id: shopId,
        user_id: userId,
        last_sync: new Date(),
        next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next sync in 24h
        total_listings: 0,
        synced_listings: 0,
        failed_listings: 0,
        sync_status: 'in_progress',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await this.updateSyncStatus(syncStatus);
      
      // Get API credentials
      const { api_key, access_token } = await this.getApiCredentials(shopId);
      
      // Fetch all listings from Etsy
      const allListings = await this.fetchAllListings(shopId, api_key, access_token);
      console.log(`📋 Found ${allListings.length} listings to sync`);
      
      syncStatus.total_listings = allListings.length;
      await this.updateSyncStatus(syncStatus);
      
      // Process listings in batches
      const batchSize = 10;
      let synced = 0;
      let failed = 0;
      
      for (let i = 0; i < allListings.length; i += batchSize) {
        const batch = allListings.slice(i, i + batchSize);
        
        for (const listing of batch) {
          try {
            await this.storeListing(shopId, listing);
            synced++;
            
            // Update AI title library
            await this.updateTitleLibrary(listing.title);
            await this.updateTagLibrary(listing.tags);
            
          } catch (error) {
            console.error(`❌ Failed to store listing ${listing.listing_id}:`, error);
            failed++;
          }
        }
        
        // Update progress
        syncStatus.synced_listings = synced;
        syncStatus.failed_listings = failed;
        await this.updateSyncStatus(syncStatus);
        
        console.log(`⚡ Progress: ${synced}/${allListings.length} listings synced`);
      }
      
      // Finalize sync status
      const duration = Date.now() - startTime;
      syncStatus.sync_status = failed === 0 ? 'completed' : 'completed';
      syncStatus.sync_duration_ms = duration;
      syncStatus.updated_at = new Date();
      
      await this.updateSyncStatus(syncStatus);
      
      // Calculate analytics
      await this.calculateStoreAnalytics(shopId);
      
      console.log(`✅ Store sync completed in ${duration}ms`);
      console.log(`📊 ${synced} synced, ${failed} failed`);
      
      return syncStatus;
      
    } catch (error) {
      console.error('❌ Store sync failed:', error);
      
      const errorStatus: SyncStatus = {
        shop_id: shopId,
        user_id: userId,
        last_sync: new Date(),
        next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000),
        total_listings: 0,
        synced_listings: 0,
        failed_listings: 0,
        sync_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await this.updateSyncStatus(errorStatus);
      throw error;
    }
  }
  
  /**
   * Get API credentials from Firebase
   */
  private async getApiCredentials(shopId: string) {
    const keyDoc = await adminDb!.collection('etsy_api_keys').doc(shopId).get();
    if (!keyDoc.exists) {
      throw new Error('API keys not found');
    }
    
    const data = keyDoc.data()!;
    return {
      api_key: data.api_key,
      access_token: data.access_token
    };
  }
  
  /**
   * Fetch all listings from Etsy API with pagination
   */
  private async fetchAllListings(shopId: string, apiKey: string, accessToken: string): Promise<EtsyListing[]> {
    const allListings: EtsyListing[] = [];
    let offset = 0;
    const limit = 100; // Etsy API max limit
    
    while (true) {
      const url = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings?limit=${limit}&offset=${offset}&includes=Images`;
      
      console.log(`📡 Fetching listings: offset=${offset}, limit=${limit}`);
      
      const response = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Etsy API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const listings = data.results || [];
      
      if (listings.length === 0) {
        break; // No more listings
      }
      
      allListings.push(...listings);
      offset += listings.length;
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return allListings;
  }
  
  /**
   * Store single listing to Firebase
   */
  private async storeListing(shopId: string, listing: EtsyListing): Promise<void> {
    const storedListing: StoredListing = {
      listing_id: listing.listing_id,
      title: listing.title || '',
      description: listing.description || '',
      price: parseFloat(listing.price || '0'),
      currency_code: listing.currency_code || 'USD',
      state: listing.state || 'unknown',
      created_at: new Date((listing.creation_timestamp || 0) * 1000),
      updated_at: new Date(),
      last_modified: new Date((listing.last_modified_timestamp || 0) * 1000),
      views: listing.views || 0,
      favorites: listing.num_favorers || 0,
      featured_rank: listing.featured_rank || null,
      tags: listing.tags || [],
      category_path: listing.category_path || [],
      materials: listing.materials || [],
      taxonomy_id: listing.taxonomy_id || 0,
      images: (listing.images || []).map(img => {
        const imageData: any = {
          listing_image_id: img.listing_image_id || 0,
          url_570xN: img.url_570xN || '',
          url_170x135: img.url_170x135 || '',
          url_680x540: img.url_680x540 || '',
          url_fullxfull: img.url_fullxfull || '',
          rank: img.rank || 0
        };
        
        // Only add fields that have values (not undefined)
        if (img.alt_text) imageData.alt_text = img.alt_text;
        
        if (img.hex_code || img.red || img.green || img.blue) {
          imageData.colors = {};
          if (img.hex_code) imageData.colors.hex_code = img.hex_code;
          if (img.red) imageData.colors.red = img.red;
          if (img.green) imageData.colors.green = img.green;
          if (img.blue) imageData.colors.blue = img.blue;
        }
        
        return imageData;
      }),
      etsy_url: listing.url || '',
      processing_time: (listing.processing_min && listing.processing_max) ? {
        min: listing.processing_min,
        max: listing.processing_max
      } : null,
      synced_at: new Date(),
      data_source: 'etsy_api'
    };
    
    // Store in Firebase
    await adminDb!
      .collection(this.STORE_LISTINGS_COLLECTION)
      .doc(shopId)
      .collection('listings')
      .doc(listing.listing_id.toString())
      .set(storedListing);
  }
  
  /**
   * Update AI title library with new title
   */
  private async updateTitleLibrary(title: string): Promise<void> {
    try {
      // Add to learning collection for AI system
      await adminDb!.collection('ai_learning').add({
        type: 'store_title',
        title: title,
        created_at: new Date(),
        source: 'store_sync'
      });
    } catch (error) {
      console.error('Error updating title library:', error);
    }
  }
  
  /**
   * Update AI tag library with new tags
   */
  private async updateTagLibrary(tags: string[]): Promise<void> {
    try {
      if (tags && tags.length > 0) {
        await adminDb!.collection('ai_learning').add({
          type: 'store_tags',
          tags: tags,
          created_at: new Date(),
          source: 'store_sync'
        });
      }
    } catch (error) {
      console.error('Error updating tag library:', error);
    }
  }
  
  /**
   * Update sync status in Firebase
   */
  private async updateSyncStatus(status: SyncStatus): Promise<void> {
    await adminDb!
      .collection(this.SYNC_STATUS_COLLECTION)
      .doc(status.shop_id)
      .set(status);
  }
  
  /**
   * Get sync status for a shop
   */
  async getSyncStatus(shopId: string): Promise<SyncStatus | null> {
    const doc = await adminDb!
      .collection(this.SYNC_STATUS_COLLECTION)
      .doc(shopId)
      .get();
    
    return doc.exists ? doc.data() as SyncStatus : null;
  }
  
  /**
   * Calculate store analytics
   */
  private async calculateStoreAnalytics(shopId: string): Promise<void> {
    try {
      console.log(`📊 Calculating analytics for shop: ${shopId}`);
      
      const listingsRef = adminDb!
        .collection(this.STORE_LISTINGS_COLLECTION)
        .doc(shopId)
        .collection('listings');
      
      const snapshot = await listingsRef.get();
      const listings = snapshot.docs.map(doc => doc.data() as StoredListing);
      
      if (listings.length === 0) {
        return;
      }
      
      // Calculate analytics
      const analytics: StoreAnalytics = {
        shop_id: shopId,
        total_listings: listings.length,
        active_listings: listings.filter(l => l.state === 'active').length,
        draft_listings: listings.filter(l => l.state === 'draft').length,
        inactive_listings: listings.filter(l => l.state === 'inactive').length,
        total_views: listings.reduce((sum, l) => sum + l.views, 0),
        total_favorites: listings.reduce((sum, l) => sum + l.favorites, 0),
        avg_price: listings.reduce((sum, l) => sum + l.price, 0) / listings.length,
        min_price: Math.min(...listings.map(l => l.price)),
        max_price: Math.max(...listings.map(l => l.price)),
        most_viewed_listing: listings.reduce((max, l) => l.views > max.views ? {
          listing_id: l.listing_id,
          title: l.title,
          views: l.views
        } : max, { listing_id: 0, title: '', views: 0 }),
        most_favorited_listing: listings.reduce((max, l) => l.favorites > max.favorites ? {
          listing_id: l.listing_id,
          title: l.title,
          favorites: l.favorites
        } : max, { listing_id: 0, title: '', favorites: 0 }),
        top_tags: this.calculateTopTags(listings),
        calculated_at: new Date()
      };
      
      // Store analytics
      await adminDb!
        .collection(this.STORE_ANALYTICS_COLLECTION)
        .doc(shopId)
        .set(analytics);
      
      console.log(`✅ Analytics calculated for ${listings.length} listings`);
      
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  }
  
  /**
   * Calculate top tags from listings
   */
  private calculateTopTags(listings: StoredListing[]): { tag: string; count: number; }[] {
    const tagCounts: { [key: string]: number } = {};
    
    listings.forEach(listing => {
      listing.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 tags
  }
  
  /**
   * Get store analytics
   */
  async getStoreAnalytics(shopId: string): Promise<StoreAnalytics | null> {
    const doc = await adminDb!
      .collection(this.STORE_ANALYTICS_COLLECTION)
      .doc(shopId)
      .get();
    
    return doc.exists ? doc.data() as StoreAnalytics : null;
  }
  
  /**
   * Get store listings with pagination
   */
  async getStoreListings(
    shopId: string, 
    options: {
      limit?: number;
      offset?: number;
      orderBy?: 'views' | 'favorites' | 'price' | 'created_at';
      orderDirection?: 'asc' | 'desc';
      state?: 'active' | 'draft' | 'inactive';
    } = {}
  ): Promise<StoredListing[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      state
    } = options;
    
    let query = adminDb!
      .collection(this.STORE_LISTINGS_COLLECTION)
      .doc(shopId)
      .collection('listings')
      .orderBy(orderBy, orderDirection)
      .limit(limit);
    
    if (offset > 0) {
      // For offset, we need to use cursor-based pagination
      // This is a simplified version - for production, use proper cursor pagination
      query = query.offset(offset);
    }
    
    if (state) {
      query = query.where('state', '==', state);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as StoredListing);
  }
  
  /**
   * Schedule automatic sync (24 hours)
   */
  async scheduleAutoSync(shopId: string, userId: string): Promise<void> {
    // This would typically be done with a cron job or cloud function
    // For now, we'll just update the next_sync time
    const status = await this.getSyncStatus(shopId);
    if (status) {
      status.next_sync = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.updateSyncStatus(status);
    }
  }
  
  /**
   * Check if store needs sync
   */
  async needsSync(shopId: string): Promise<boolean> {
    const status = await this.getSyncStatus(shopId);
    if (!status) return true;
    
    return new Date() >= status.next_sync;
  }
}

// Export singleton instance
export const storeDataSystem = new StoreDataSystem();

// Export types
export type { StoredListing, SyncStatus, StoreAnalytics, EtsyListing };