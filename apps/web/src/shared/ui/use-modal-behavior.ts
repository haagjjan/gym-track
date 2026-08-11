"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

type InitialFocus = "dialog" | "first";

interface ModalBehaviorOptions {
  closeOnEscape?: boolean;
  initialFocus?: InitialFocus;
  isOpen: boolean;
  onClose: () => void;
}

interface ModalEntry {
  element: HTMLElement;
  onClose: () => void;
}

const modalStack: ModalEntry[] = [];
const inertElements = new Map<HTMLElement, { count: number; wasInert: boolean }>();
let inertObserver: MutationObserver | null = null;
let restoreBackgroundInert: (() => void) | null = null;
let scrollLocked = false;
let previousBodyOverflow = "";

export function useModalBehavior<T extends HTMLElement>({
  closeOnEscape = true,
  initialFocus = "first",
  isOpen,
  onClose
}: ModalBehaviorOptions): RefObject<T | null> {
  const dialogRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  onCloseRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;

  useLayoutEffect(() => {
    const element = dialogRef.current;
    if (!isOpen || !element) return;
    return activateModal(
      element,
      initialFocus,
      () => onCloseRef.current(),
      () => closeOnEscapeRef.current
    );
  }, [initialFocus, isOpen]);

  return dialogRef;
}

function activateModal(
  element: HTMLElement,
  initialFocus: InitialFocus,
  onClose: () => void,
  mayCloseOnEscape: () => boolean
): () => void {
  const entry: ModalEntry = { element, onClose };
  const restoreFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  modalStack.push(entry);
  syncBodyScrollLock();
  refreshBackgroundInert();
  const frame = window.requestAnimationFrame(() => focusInitialElement(element, initialFocus));
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (topModal() !== entry) return;
    if (event.key === "Escape" && mayCloseOnEscape() && !event.repeat) {
      event.preventDefault();
      event.stopPropagation();
      entry.onClose();
    } else if (event.key === "Tab") trapFocus(event, element);
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => {
    window.cancelAnimationFrame(frame);
    document.removeEventListener("keydown", handleKeyDown);
    removeModal(entry);
    syncBodyScrollLock();
    refreshBackgroundInert();
    if (restoreFocus?.isConnected) restoreFocus.focus();
  };
}

function focusInitialElement(dialog: HTMLElement, initialFocus: InitialFocus): void {
  if (initialFocus === "dialog") {
    dialog.focus();
    return;
  }
  const marked = dialog.querySelector<HTMLElement>("[data-modal-initial-focus]");
  const target = marked && isFocusable(marked) ? marked : focusableElements(dialog)[0];
  (target ?? dialog).focus();
}

function trapFocus(event: KeyboardEvent, dialog: HTMLElement): void {
  const focusable = focusableElements(dialog);
  if (focusable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  const outsideCycle = active === dialog || !dialog.contains(active);
  if (event.shiftKey && (active === first || outsideCycle)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (active === last || outsideCycle)) {
    event.preventDefault();
    first?.focus();
  }
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[contenteditable='true']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  return [...dialog.querySelectorAll<HTMLElement>(selector)].filter(isFocusable);
}

function isFocusable(element: HTMLElement): boolean {
  return element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== "hidden"
    && !element.closest("[inert]");
}

function topModal(): ModalEntry | undefined {
  return modalStack[modalStack.length - 1];
}

function removeModal(entry: ModalEntry): void {
  const index = modalStack.lastIndexOf(entry);
  if (index >= 0) modalStack.splice(index, 1);
}

function refreshBackgroundInert(): void {
  inertObserver?.disconnect();
  restoreBackgroundInert?.();
  restoreBackgroundInert = null;

  // This already runs on every relevant DOM mutation while a modal is open, so
  // it is the cheapest place to re-assert the scroll lock. Anything that
  // clobbers body styles mid-modal is corrected on the next mutation instead of
  // persisting for the modal's lifetime.
  syncBodyScrollLock();

  const dialog = topModal()?.element;
  if (dialog?.isConnected) restoreBackgroundInert = makeBackgroundInert(dialog);
  if (modalStack.length === 0) {
    inertObserver = null;
    return;
  }

  inertObserver ??= new MutationObserver(refreshBackgroundInert);
  inertObserver.observe(document.body, {
    attributeFilter: ["inert"],
    attributes: true,
    childList: true,
    subtree: true
  });
}

/**
 * Derives the scroll lock from `modalStack` rather than from a separate counter.
 *
 * The previous implementation only wrote `overflow: hidden` on the 0 → 1
 * transition of its own counter. That made the lock unrecoverable: if the
 * counter ever drifted from reality — a leaked increment, or any other writer
 * touching `document.body.style` — every later modal assumed the page was
 * already locked and never re-asserted it, leaving the background scrollable
 * with no way to self-correct.
 *
 * Re-asserting on every sync costs one style write and removes that whole class
 * of failure. `modalStack` is the single source of truth and is maintained on
 * both activation and teardown, so the lock cannot outlive the last modal.
 */
function syncBodyScrollLock(): void {
  if (modalStack.length > 0) {
    if (!scrollLocked) {
      previousBodyOverflow = document.body.style.overflow;
      scrollLocked = true;
    }
    if (document.body.style.overflow !== "hidden") {
      document.body.style.overflow = "hidden";
    }
    return;
  }
  if (scrollLocked) {
    document.body.style.overflow = previousBodyOverflow;
    scrollLocked = false;
  }
}

function makeBackgroundInert(dialog: HTMLElement): () => void {
  const acquired: HTMLElement[] = [];
  let current: HTMLElement = dialog;
  while (current.parentElement) {
    for (const sibling of current.parentElement.children) {
      if (sibling instanceof HTMLElement && sibling !== current) {
        acquireInert(sibling);
        acquired.push(sibling);
      }
    }
    current = current.parentElement;
    if (current === document.body) break;
  }
  return () => acquired.reverse().forEach(releaseInert);
}

function acquireInert(element: HTMLElement): void {
  const state = inertElements.get(element);
  if (state) {
    state.count += 1;
    return;
  }
  inertElements.set(element, { count: 1, wasInert: element.inert });
  element.inert = true;
}

function releaseInert(element: HTMLElement): void {
  const state = inertElements.get(element);
  if (!state) return;
  state.count -= 1;
  if (state.count > 0) return;
  element.inert = state.wasInert;
  inertElements.delete(element);
}
