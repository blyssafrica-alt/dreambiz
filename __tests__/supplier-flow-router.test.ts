/**
 * Unit tests for supplier flow state → route mapping.
 * Run with: npx jest __tests__/supplier-flow-router.test.ts
 * (Requires Jest to be added to the project.)
 */

import { getExpectedRouteForState, isSupplierFlowPath } from '../lib/supplier-flow';

describe('getExpectedRouteForState', () => {
  it('NOT_LOGGED_IN → /landing', () => {
    expect(getExpectedRouteForState('NOT_LOGGED_IN')).toBe('/landing');
  });

  it('LOGGED_IN_EMAIL_UNVERIFIED → /verify-email', () => {
    expect(getExpectedRouteForState('LOGGED_IN_EMAIL_UNVERIFIED')).toBe('/verify-email');
  });

  it('ONBOARDING_INCOMPLETE → /onboarding', () => {
    expect(getExpectedRouteForState('ONBOARDING_INCOMPLETE')).toBe('/onboarding');
  });

  it('NO_APPLICATION → /supplier-apply', () => {
    expect(getExpectedRouteForState('NO_APPLICATION')).toBe('/supplier-apply');
  });

  it('DRAFT_IN_PROGRESS → /suppliers-marketplace/become-a-supplier', () => {
    expect(getExpectedRouteForState('DRAFT_IN_PROGRESS')).toBe('/suppliers-marketplace/become-a-supplier');
  });

  it('SUBMITTED_PENDING → /suppliers-marketplace/my-application', () => {
    expect(getExpectedRouteForState('SUBMITTED_PENDING')).toBe('/suppliers-marketplace/my-application');
  });

  it('APPROVED → /supplier', () => {
    expect(getExpectedRouteForState('APPROVED')).toBe('/supplier');
  });

  it('REJECTED → /suppliers-marketplace/my-application', () => {
    expect(getExpectedRouteForState('REJECTED')).toBe('/suppliers-marketplace/my-application');
  });
});

describe('isSupplierFlowPath', () => {
  it('returns true for supplier-apply', () => {
    expect(isSupplierFlowPath('/supplier-apply')).toBe(true);
    expect(isSupplierFlowPath('supplier-apply')).toBe(true);
  });

  it('returns true for supplier-login', () => {
    expect(isSupplierFlowPath('/supplier-login')).toBe(true);
  });

  it('returns true for become-a-supplier', () => {
    expect(isSupplierFlowPath('/suppliers-marketplace/become-a-supplier')).toBe(true);
  });

  it('returns true for my-application', () => {
    expect(isSupplierFlowPath('/suppliers-marketplace/my-application')).toBe(true);
  });

  it('returns true for supplier dashboard', () => {
    expect(isSupplierFlowPath('/supplier')).toBe(true);
    expect(isSupplierFlowPath('/supplier/')).toBe(true);
  });

  it('returns false for landing', () => {
    expect(isSupplierFlowPath('/landing')).toBe(false);
  });

  it('returns false for tabs', () => {
    expect(isSupplierFlowPath('/(tabs)')).toBe(false);
  });
});
