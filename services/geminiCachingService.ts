/**
 * Google Gemini Context Caching Service
 * 
 * This service implements explicit context caching for Gemini API calls.
 * Use this to cache system instructions, large documents, or any repeated content
 * to reduce costs by 90% and improve response times.
 * 
 * Benefits:
 * - 90% cost reduction on cached tokens (Gemini 2.5+ models)  
 * - Faster response times
 * - Minimum 2,048 tokens required for caching
 * - Default 60-minute TTL (can be extended)
 * 
 * Usage Pattern:
 * 1. Create cache once with system instructions + context
 * 2. Reuse cache for multiple requests (up to 60 minutes)
 * 3. Update cache TTL if needed
 * 4. Delete cache when done
 */

import { GoogleGenAI } from "@google/genai";

export interface CacheConfig {
  model: string;
  systemInstruction: string;
  contents?: any[];
  displayName?: string;
  ttl?: string;  // Default: "3600s" (60 minutes)
}

export class GeminiCachingService {
  private ai: GoogleGenAI;
  private activeCache: any | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Create a new context cache
   * 
   * @example
   * const cache = await cachingService.createCache({
   *   model: "gemini-2.5-flash",
   *   systemInstruction: "You are a helpful AI assistant...",
   *   displayName: "my-app-cache",
   *   ttl: "7200s" // 2 hours
   * });
   */
  async createCache(config: CacheConfig) {
    try {
      const cache = await this.ai.caches.create({
        model: config.model,
        config: {
          systemInstruction: config.systemInstruction,
          contents: config.contents || [],
          displayName: config.displayName || "app-cache",
          ttl: config.ttl || "3600s", // 60 minutes default
        },
      });

      this.activeCache = cache;
      
      console.log("✅ Cache created:", {
        name: cache.name,
        tokens: cache.usageMetadata?.totalTokenCount,
        expireTime: cache.expireTime
      });

      return cache;
    } catch (error) {
      console.error("❌ Failed to create cache:", error);
      throw error;
    }
  }

  /**
   * Generate content using the active cache
   * 
   * @example
   * const response = await cachingService.generateWithCache(
   *   "What can you help me with?"
   * );
   */
  async generateWithCache(message: string, model?: string) {
    if (!this.activeCache) {
      throw new Error("No active cache. Call createCache() first.");
    }

    try {
      const response = await this.ai.models.generateContent({
        model: model || this.activeCache.model,
        contents: message,
        config: {
          cachedContent: this.activeCache.name,
        },
      });

      // Log cache hit statistics
      if (response.usageMetadata) {
        console.log("📊 Cache stats:", {
          cachedTokens: response.usageMetadata.cachedContentTokenCount,
          newTokens: response.usageMetadata.promptTokenCount,
          outputTokens: response.usageMetadata.candidatesTokenCount,
        });
      }

      return response;
    } catch (error) {
      console.error("❌ Failed to generate with cache:", error);
      throw error;
    }
  }

  /**
   * Retrieve an existing cache by name
   * Useful for recovering cache after app restart
   */
  async getCache(cacheName: string) {
    try {
      const cache = await this.ai.caches.get({ name: cacheName });
      this.activeCache = cache;
      return cache;
    } catch (error) {
      console.error("❌ Failed to retrieve cache:", error);
      throw error;
    }
  }

  /**
   * Update cache expiration time
   * Useful for extending cache lifetime
   */
  async updateCacheExpiration(ttl: string) {
    if (!this.activeCache) {
      throw new Error("No active cache");
    }

    try {
      const updated = await this.ai.caches.update({
        name: this.activeCache.name,
        config: { ttl },
      });
      
      this.activeCache = updated;
      console.log("✅ Cache expiration updated:", updated.expireTime);
      return updated;
    } catch (error) {
      console.error("❌ Failed to update cache:", error);
      throw error;
    }
  }

  /**
   * Delete the active cache
   * Call this when you're done to avoid storage costs
   */
  async deleteCache() {
    if (!this.activeCache) {
      return;
    }

    try {
      await this.ai.caches.delete({ name: this.activeCache.name });
      console.log("✅ Cache deleted:", this.activeCache.name);
      this.activeCache = null;
    } catch (error) {
      console.error("❌ Failed to delete cache:", error);
      throw error;
    }
  }

  /**
   * Get the current active cache info
   */
  getActiveCacheInfo() {
    return this.activeCache;
  }

  /**
   * Check if cache is about to expire (within 5 minutes)
   */
  isCacheExpiringSoon(): boolean {
    if (!this.activeCache?.expireTime) return true;
    
    const expireTime = new Date(this.activeCache.expireTime);
    const now = new Date();
    const diff = expireTime.getTime() - now.getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    return diff < fiveMinutes;
  }
}

export const createCachingService = (apiKey: string) => {
  return new GeminiCachingService(apiKey);
};
