import { renderHook, act } from '@testing-library/react';
import useOutsideClickHandler from 'hooks/useOutsideClickHandler';

describe('useOutsideClickHandler', () => {
  let container;
  let innerElement;
  let ref;
  let onOutsideClick;

  beforeEach(() => {
    container = document.createElement('div');
    innerElement = document.createElement('span');
    container.appendChild(innerElement);
    document.body.appendChild(container);
    ref = { current: container };
    onOutsideClick = vi.fn();
  });

  afterEach(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  test('calls onOutsideClick when mousedown fires outside ref element', () => {
    renderHook(() => useOutsideClickHandler(ref, onOutsideClick));
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => {
      outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
    document.body.removeChild(outside);
  });

  test('does not call onOutsideClick when mousedown fires on ref element itself', () => {
    renderHook(() => useOutsideClickHandler(ref, onOutsideClick));
    act(() => {
      container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  test('does not call onOutsideClick when mousedown fires inside ref element', () => {
    renderHook(() => useOutsideClickHandler(ref, onOutsideClick));
    act(() => {
      innerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  test('does not call onOutsideClick after hook is unmounted', () => {
    const { unmount } = renderHook(() => useOutsideClickHandler(ref, onOutsideClick));
    unmount();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => {
      outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onOutsideClick).not.toHaveBeenCalled();
    document.body.removeChild(outside);
  });

  test('does not call onOutsideClick when ref.current is null', () => {
    const nullRef = { current: null };
    renderHook(() => useOutsideClickHandler(nullRef, onOutsideClick));
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onOutsideClick).not.toHaveBeenCalled();
  });
});
