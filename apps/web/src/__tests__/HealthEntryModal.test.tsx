/**
 * @fileoverview TDD tests for HealthEntryModal component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthEntryModal from '@/components/HealthEntryModal';

const mockAddHealthRecord = jest.fn();
jest.mock('@/lib/farm-store', () => ({
  addHealthRecord: (...args: unknown[]) => mockAddHealthRecord(...args),
}));

const defaultProps = {
  herdId: 'herd-1',
  herdName: 'Lote 4a',
  onClose: jest.fn(),
  onSaved: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAddHealthRecord.mockReturnValue({ healthRecords: [] });
});

describe('HealthEntryModal', () => {
  it('renders without crashing', () => {
    render(<HealthEntryModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the herd name in the title', () => {
    render(<HealthEntryModal {...defaultProps} />);
    expect(screen.getByText(/Lote 4a/i)).toBeInTheDocument();
  });

  it('has treatmentType, date, administeredBy, and notes fields', () => {
    render(<HealthEntryModal {...defaultProps} />);
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aplicado por/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notas|observaciones/i)).toBeInTheDocument();
  });

  it('submit button is disabled when administeredBy is empty', async () => {
    render(<HealthEntryModal {...defaultProps} />);
    // treatmentType has a default, date has a default — only administeredBy is required input
    const submitBtn = screen.getByRole('button', { name: /guardar/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submit button enables once administeredBy is filled', async () => {
    render(<HealthEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/aplicado por/i), 'Dr. García');
    expect(screen.getByRole('button', { name: /guardar/i })).not.toBeDisabled();
  });

  it('calls addHealthRecord with correct arguments on submit', async () => {
    render(<HealthEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/aplicado por/i), 'Dr. García');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(mockAddHealthRecord).toHaveBeenCalledWith(
      'herd-1',
      expect.objectContaining({
        administeredBy: 'Dr. García',
        treatmentType: expect.any(String),
      })
    );
  });

  it('calls onSaved and onClose after successful submit', async () => {
    render(<HealthEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/aplicado por/i), 'Jose');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    render(<HealthEntryModal {...defaultProps} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /cancelar/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an error when addHealthRecord returns null', async () => {
    mockAddHealthRecord.mockReturnValue(null);
    render(<HealthEntryModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/aplicado por/i), 'Jose');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
