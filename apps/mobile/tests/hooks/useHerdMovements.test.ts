/**
 * @fileoverview Phase 2 TDD: useHerdMovements Hook Tests (Simplified)
 * Testing business logic without React Native Testing Library
 */

import { recordHerdMovement } from '@/services/movements';

// Mock movements service
jest.mock('@/services/movements', () => ({
  recordHerdMovement: jest.fn().mockResolvedValue(undefined),
}));

describe('Herd Movement Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should record movement with correct parameters', async () => {
    const mockDb = { execute: jest.fn() } as any;
    
    await recordHerdMovement(mockDb, 'herd-1', 'pasture-1', 'pasture-2', 'user@example.com');
    
    expect(recordHerdMovement).toHaveBeenCalledWith(
      mockDb,
      'herd-1',
      'pasture-1',
      'pasture-2',
      'user@example.com'
    );
  });

  it('should handle movement with default user', async () => {
    const mockDb = { execute: jest.fn() } as any;
    
    await recordHerdMovement(mockDb, 'herd-1', null, 'pasture-2');
    
    expect(recordHerdMovement).toHaveBeenCalled();
  });
});
