import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import useModalAccessibility from './useModalAccessibility';

const ModalHarness = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef(null);
  const closeDialog = () => {
    onClose();
    setIsOpen(false);
  };
  useModalAccessibility({ isOpen, onClose: closeDialog, dialogRef });

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open dialog</button>
      {isOpen && (
        <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}>
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </div>
      )}
    </>
  );
};

describe('useModalAccessibility', () => {
  it('wraps keyboard focus and restores the opener when Escape closes the dialog', async () => {
    const onClose = vi.fn();
    render(<ModalHarness onClose={onClose} />);

    const user = userEvent.setup();
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(opener);
    const firstAction = screen.getByRole('button', { name: 'First action' });
    const lastAction = screen.getByRole('button', { name: 'Last action' });

    expect(firstAction).toHaveFocus();
    fireEvent.keyDown(lastAction, { key: 'Tab' });
    expect(firstAction).toHaveFocus();
    fireEvent.keyDown(firstAction, { key: 'Tab', shiftKey: true });
    expect(lastAction).toHaveFocus();

    fireEvent.keyDown(lastAction, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
