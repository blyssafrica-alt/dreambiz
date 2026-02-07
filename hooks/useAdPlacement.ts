import { useMemo, useRef } from 'react';
import type { Advertisement } from '@/types/super-admin';

interface UseAdPlacementOptions {
  ads: Advertisement[];
  itemsCount: number;
  minGap?: number; // Minimum items between ads (default: 5)
  maxAds?: number; // Maximum ads to show (default: unlimited)
}

interface AdPlacementResult {
  shouldShowAd: (index: number) => boolean;
  getAdForIndex: (index: number) => Advertisement | null;
  adPositions: number[]; // All positions where ads will be shown
}

/**
 * Hook to manage ad placement with proper spacing
 * Prevents consecutive ads and enforces minimum gap between ads
 * 
 * @example
 * const { shouldShowAd, getAdForIndex } = useAdPlacement({
 *   ads: customersAds,
 *   itemsCount: filteredCustomers.length,
 *   minGap: 5
 * });
 * 
 * {items.map((item, index) => (
 *   <>
 *     <ItemComponent item={item} />
 *     {shouldShowAd(index) && <AdCard ad={getAdForIndex(index)!} location="customers" />}
 *   </>
 * ))}
 */
export function useAdPlacement({
  ads,
  itemsCount,
  minGap = 5,
  maxAds,
}: UseAdPlacementOptions): AdPlacementResult {
  // Calculate optimal ad positions with proper spacing
  const adPositions = useMemo(() => {
    if (ads.length === 0 || itemsCount === 0) return [];
    
    const positions: number[] = [];
    let currentPosition = minGap; // Start after first minGap items
    
    // Calculate positions ensuring minimum gap
    while (currentPosition < itemsCount && (maxAds === undefined || positions.length < maxAds)) {
      positions.push(currentPosition);
      currentPosition += minGap + 1; // Move forward by minGap + 1 (the ad itself)
      
      // If we've used all ads, cycle back to start
      if (positions.length >= ads.length) {
        // Continue spacing but we'll cycle through ads
        break;
      }
    }
    
    return positions;
  }, [ads.length, itemsCount, minGap, maxAds]);

  // Check if we should show an ad at this index
  const shouldShowAd = (index: number): boolean => {
    return adPositions.includes(index);
  };

  // Get the ad to show at this index (rotates through available ads)
  const getAdForIndex = (index: number): Advertisement | null => {
    if (!shouldShowAd(index) || ads.length === 0) return null;
    
    const positionIndex = adPositions.indexOf(index);
    if (positionIndex === -1) return null;
    
    // Rotate through ads
    return ads[positionIndex % ads.length];
  };

  return {
    shouldShowAd,
    getAdForIndex,
    adPositions,
  };
}

