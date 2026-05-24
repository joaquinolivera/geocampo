/**
 * @fileoverview Phase 2 TDD: Herd Movement Service Tests
 */

import { recordHerdMovement, MovementRecord } from './movements';

// Mock PowerSyncDatabase
const mockExecute = jest.fn().mockResolvedValue(undefined);
const mockDb = {
  execute: mockExecute,
} as any;

describe('Herd Movement Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should record a herd movement', async () => {
    await recordHerdMovement(
      mockDb,
      'herd-1',
      'pasture-1',
      'pasture-2',
      'user@example.com'
    );

    // Should insert into movements table
    expect(mockExecute).toHaveBeenCalledTimes(2);
    
    // First call: insert movement
    const firstCall = mockExecute.mock.calls[0];
    expect(firstCall[0]).toContain('INSERT INTO movements');
    expect(firstCall[1]).toContain('herd-1');
    expect(firstCall[1]).toContain('pasture-1');
    expect(firstCall[1]).toContain('pasture-2');

    // Second call: update herd pasture
    const secondCall = mockExecute.mock.calls[1];
    expect(secondCall[0]).toContain('UPDATE herds');
    expect(secondCall[1]).toContain('pasture-2');
    expect(secondCall[1]).toContain('herd-1');
  });

  it('should handle movement from unassigned pasture', async () => {
    await recordHerdMovement(
      mockDb,
      'herd-1',
      null,
      'pasture-2',
      'system'
    );

    const firstCall = mockExecute.mock.calls[0];
    expect(firstCall[1][2]).toBeNull(); // from_pasture_id should be null
  });

  it('should mark movement as verified by Turf.js', async () => {
    await recordHerdMovement(
      mockDb,
      'herd-1',
      'pasture-1',
      'pasture-2'
    );

    const firstCall = mockExecute.mock.calls[0];
    expect(firstCall[1][6]).toBe(1); // verified_by_turf = 1
  });

  it('should include movement notes', async () => {
    await recordHerdMovement(
      mockDb,
      'herd-1',
      'pasture-1',
      'pasture-2'
    );

    const firstCall = mockExecute.mock.calls[0];
    expect(firstCall[1][7]).toContain('MapCanvas drag & drop');
  });
});
