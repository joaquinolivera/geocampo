/**
 * @fileoverview TDD tests for WeightEntryModal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeightEntryModal from '@/components/WeightEntryModal';

// Mock the weights DB layer so we don't need localStorage/Supabase in these tests
const mockWeightsAdd = jest.fn();
jest.mock('@/lib/db/weights', () => ({
  weightsDb: { add: (...args: unknown[]) => mockWeightsAdd(...args) },
}));

// Mock useFarmData — WeightEntryModal needs the active farm id + herd info
jest.mock('@/lib/FarmDataContext', () => ({
  useFarmData: () => ({
    DEMO_FARM: { id: 'farm-1' },
    HERDS: [
      {
        id: 'herd-1',
        name: 'Lote 4a',
        cattleCount: 35,
        pastureId: 'pasture-1',
      },
    ],
  }),
}));

const defaultProps = {
  herdId: 'herd-1',
  herdName: 'Lote 4a',
  onClose: jest.fn(),
  onSaved: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWeightsAdd.mockResolvedValue({ id: 'w1' });
});

describe('WeightEntryModal', () => {
  it('renders without crashing', () => {
    render(<WeightEntryModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the herd name in the title', () => {
    render(<WeightEntryModal {...defaultProps} />);
    expect(screen.getByText(/Lote 4a/i)).toBeInTheDocument();
  });

  it('has date, headCount, avgWeight, and notes fields', () => {
    render(<WeightEntryModal {...defaultProps} />);
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cabezas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/peso promedio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notas|observaciones/i)).toBeInTheDocument();
  });

  it('submit button is disabled when required fields are empty', () => {
    render(<WeightEntryModal {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: /guardar/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submit button enables when date, headCount and avgWeight are filled', async () => {
    render(<WeightEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/cabezas/i), '35');
    await user.type(screen.getByLabelText(/peso promedio/i), '320');

    expect(screen.getByRole('button', { name: /guardar/i })).not.toBeDisabled();
  });

  it('calls weightsDb.add with correct arguments on submit', async () => {
    render(<WeightEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/cabezas/i), '35');
    await user.type(screen.getByLabelText(/peso promedio/i), '320');
    await user.type(screen.getByLabelText(/notas|observaciones/i), 'Test note');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(mockWeightsAdd).toHaveBeenCalledWith(
      'farm-1',
      expect.objectContaining({
        herdId: 'herd-1',
        cattleCount: 35,
        averageWeightKg: 320,
        notes: 'Test note',
      })
    );
  });

  it('calls onSaved and onClose after successful submit', async () => {
    render(<WeightEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/cabezas/i), '35');
    await user.type(screen.getByLabelText(/peso promedio/i), '320');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    render(<WeightEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an error when weightsDb.add fails', async () => {
    mockWeightsAdd.mockRejectedValue(new Error('no farm'));
    render(<WeightEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/cabezas/i), '10');
    await user.type(screen.getByLabelText(/peso promedio/i), '200');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
