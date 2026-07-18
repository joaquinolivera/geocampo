/**
 * @fileoverview TDD tests for MoveHerdModal component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoveHerdModal from '@/components/MoveHerdModal';

const mockHerdsMove = jest.fn();
jest.mock('@/lib/db/herds', () => ({
  herdsDb: { move: (...args: unknown[]) => mockHerdsMove(...args) },
}));

// Provide pasture list via FarmDataContext
jest.mock('@/lib/FarmDataContext', () => ({
  useFarmData: () => ({
    PASTURES: [
      { id: 'pasture-1', name: 'Lote 1' },
      { id: 'pasture-2', name: 'Lote 2' },
      { id: 'pasture-3', name: 'Lote 3' },
    ],
  }),
}));

const defaultProps = {
  herdId: 'herd-1',
  herdName: 'Lote 4a',
  currentPastureId: 'pasture-1',
  onClose: jest.fn(),
  onSaved: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHerdsMove.mockResolvedValue({ id: 'herd-1' });
});

describe('MoveHerdModal', () => {
  it('renders without crashing', () => {
    render(<MoveHerdModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the herd name in the title', () => {
    render(<MoveHerdModal {...defaultProps} />);
    expect(screen.getByText(/Lote 4a/i)).toBeInTheDocument();
  });

  it('has destination pasture select, date, and movedBy fields', () => {
    render(<MoveHerdModal {...defaultProps} />);
    expect(screen.getByLabelText(/destino/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/movido por/i)).toBeInTheDocument();
  });

  it('does not list the current pasture as a destination option', () => {
    render(<MoveHerdModal {...defaultProps} />);
    const select = screen.getByLabelText(/destino/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).not.toContain('pasture-1');
    expect(options).toContain('pasture-2');
    expect(options).toContain('pasture-3');
  });

  it('submit button is disabled when movedBy is empty', () => {
    render(<MoveHerdModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /mover/i })).toBeDisabled();
  });

  it('submit button enables when movedBy is filled', async () => {
    render(<MoveHerdModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/movido por/i), 'Jose');
    expect(screen.getByRole('button', { name: /mover/i })).not.toBeDisabled();
  });

  it('calls herdsDb.move with correct arguments on submit', async () => {
    render(<MoveHerdModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/movido por/i), 'Jose');
    await user.click(screen.getByRole('button', { name: /mover/i }));

    expect(mockHerdsMove).toHaveBeenCalledWith(
      'herd-1',
      expect.objectContaining({
        toPastureId: expect.any(String),
        movedBy: 'Jose',
        movedAt: expect.any(Date),
      })
    );
  });

  it('calls onSaved and onClose after successful move', async () => {
    render(<MoveHerdModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/movido por/i), 'Ana');
    await user.click(screen.getByRole('button', { name: /mover/i }));

    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    render(<MoveHerdModal {...defaultProps} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /cancelar/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an error when herdsDb.move fails', async () => {
    mockHerdsMove.mockRejectedValue(new Error('no farm'));
    render(<MoveHerdModal {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/movido por/i), 'Jose');
    await user.click(screen.getByRole('button', { name: /mover/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
