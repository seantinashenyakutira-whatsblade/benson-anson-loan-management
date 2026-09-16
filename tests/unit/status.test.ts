import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getValidTransitions,
  determineHealth,
  isTerminal,
  isActive,
  canDisburse,
  canRecordPayment,
  getStatusLabel,
  getStatusColor,
} from '@/lib/loan/status';

describe('status', () => {
  describe('canTransition', () => {
    it('allows draft → submitted', () => {
      expect(canTransition('draft', 'submitted')).toBe(true);
    });

    it('allows submitted → approved', () => {
      expect(canTransition('submitted', 'approved')).toBe(true);
    });

    it('allows approved → disbursed', () => {
      expect(canTransition('approved', 'disbursed')).toBe(true);
    });

    it('allows disbursed → performing', () => {
      expect(canTransition('disbursed', 'performing')).toBe(true);
    });

    it('allows performing → fully_paid', () => {
      expect(canTransition('performing', 'fully_paid')).toBe(true);
    });

    it('disallows draft → disbursed', () => {
      expect(canTransition('draft', 'disbursed')).toBe(false);
    });

    it('disallows rejected → anything', () => {
      expect(canTransition('rejected', 'submitted')).toBe(false);
    });

    it('disallows collateral_released → anything', () => {
      expect(canTransition('collateral_released', 'closed')).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('returns valid transitions for draft', () => {
      expect(getValidTransitions('draft')).toEqual(['submitted']);
    });

    it('returns valid transitions for disbursed', () => {
      const transitions = getValidTransitions('disbursed');
      expect(transitions).toContain('performing');
      expect(transitions).toContain('at_risk');
      expect(transitions).toContain('overdue');
      expect(transitions).toContain('defaulted');
      expect(transitions).toContain('fully_paid');
    });
  });

  describe('determineHealth', () => {
    it('returns performing when not overdue', () => {
      expect(determineHealth(0, 3, 30)).toBe('performing');
    });

    it('returns at_risk within grace period', () => {
      expect(determineHealth(2, 3, 30)).toBe('at_risk');
    });

    it('returns overdue past grace period', () => {
      expect(determineHealth(15, 3, 30)).toBe('overdue');
    });

    it('returns defaulted at threshold', () => {
      expect(determineHealth(30, 3, 30)).toBe('defaulted');
    });
  });

  describe('isTerminal', () => {
    it('returns true for rejected', () => {
      expect(isTerminal('rejected')).toBe(true);
    });

    it('returns true for closed', () => {
      expect(isTerminal('closed')).toBe(true);
    });

    it('returns false for active statuses', () => {
      expect(isTerminal('disbursed')).toBe(false);
      expect(isTerminal('performing')).toBe(false);
    });
  });

  describe('isActive', () => {
    it('returns true for active statuses', () => {
      expect(isActive('disbursed')).toBe(true);
      expect(isActive('performing')).toBe(true);
      expect(isActive('at_risk')).toBe(true);
      expect(isActive('overdue')).toBe(true);
      expect(isActive('defaulted')).toBe(true);
    });

    it('returns false for inactive statuses', () => {
      expect(isActive('draft')).toBe(false);
      expect(isActive('fully_paid')).toBe(false);
    });
  });

  describe('canDisburse', () => {
    it('returns true for approved', () => {
      expect(canDisburse('approved')).toBe(true);
    });

    it('returns false for other statuses', () => {
      expect(canDisburse('draft')).toBe(false);
      expect(canDisburse('disbursed')).toBe(false);
    });
  });

  describe('canRecordPayment', () => {
    it('returns true for active statuses', () => {
      expect(canRecordPayment('disbursed')).toBe(true);
      expect(canRecordPayment('performing')).toBe(true);
      expect(canRecordPayment('fully_paid')).toBe(true);
    });

    it('returns false for draft', () => {
      expect(canRecordPayment('draft')).toBe(false);
    });
  });

  describe('getStatusLabel', () => {
    it('returns human-readable labels', () => {
      expect(getStatusLabel('fully_paid')).toBe('Fully Paid');
      expect(getStatusLabel('at_risk')).toBe('At Risk');
    });
  });

  describe('getStatusColor', () => {
    it('returns appropriate colors', () => {
      expect(getStatusColor('performing')).toBe('text-success');
      expect(getStatusColor('overdue')).toBe('text-orange');
      expect(getStatusColor('defaulted')).toBe('text-danger');
    });
  });
});
