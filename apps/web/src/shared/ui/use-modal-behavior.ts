"use client";

import { useEffect, useRef, type RefObject } from "react";

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
let scrollLockCount = 0;
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

  useEffect(() => {
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
  const restoreInert = makeBackgroundInert(element);
  const restoreScroll = lockBodyScroll();
  modalStack.push(entry);
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
    restoreInert();
    restoreScroll();
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

function lockBodyScroll(): () => void {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
  return () => {
    scrollLockCount -= 1;
    if (scrollLockCount === 0) document.body.style.overflow = previousBodyOverflow;
  };
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
