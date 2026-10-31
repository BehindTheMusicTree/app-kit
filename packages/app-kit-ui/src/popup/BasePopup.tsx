"use client";

import { createPortal } from "react-dom";
import { ReactNode, useEffect, useRef } from "react";
import { PopupTitle } from "./PopupTitle";
import { PopupButtons } from "./PopupButtons";
import { Button } from "@behindthemusictree/ui";
import { LucideIcon } from "lucide-react";

export interface BasePopupProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  type?: "default" | "success" | "error" | "warning" | "info" | "spotify" | "auth";
  icon?: LucideIcon;
  isDismissable?: boolean;
  className?: string;
  overlayClassName?: string;
  titleClassName?: string;
  titleTextClassName?: string;
  closeButtonClassName?: string;
  /** Sizes the popup to its content (up to the type's max width) instead of filling it. */
  fitContent?: boolean;
  contentClassName?: string;
  showOkButton?: boolean;
  showCancelButton?: boolean;
  okButtonText?: string;
  okButtonDisabled?: boolean;
  cancelButtonText?: string;
  onOk?: () => void;
  onCancel?: () => void;
  buttonAlignment?: "left" | "center" | "right";
  /**
   * Distance (in px) reserved at the top of the viewport, e.g. for a fixed app header/banner.
   * Each consuming app passes its own value. Defaults to 0.
   */
  topOffset?: number;
  /** Keeps keyboard focus within the popup and restores it to the opener when dismissed. */
  trapFocus?: boolean;
  /** Closes a dismissable popup on Escape. */
  closeOnEscape?: boolean;
  /** Closes a dismissable popup when the backdrop is clicked. */
  closeOnBackdrop?: boolean;
}

const typeClasses: Record<string, string> = {
  default: "w-full max-w-lg",
  success: "w-full max-w-lg",
  error: "w-full max-w-lg",
  warning: "w-full max-w-lg",
  info: "w-full max-w-lg",
  spotify: "w-full max-w-md",
  auth: "w-full max-w-md",
};

const contentBgClasses: Record<string, string> = {
  spotify: "bg-green-500",
  auth: "bg-gray-800",
};

export function BasePopup(props: BasePopupProps) {
  const {
    title,
    children,
    onClose,
    type = "default",
    icon,
    isDismissable = true,
    className,
    overlayClassName = "",
    titleClassName = "",
    titleTextClassName = "",
    closeButtonClassName = "",
    fitContent = false,
    contentClassName = "",
    showOkButton = false,
    showCancelButton = false,
    okButtonText = "OK",
    cancelButtonText = "Cancel",
    onOk,
    okButtonDisabled = false,
    onCancel,
    buttonAlignment = "center",
    topOffset = 0,
    trapFocus = false,
    closeOnEscape = false,
    closeOnBackdrop = false,
  } = props;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter(
        (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true",
      );

    if (trapFocus) (getFocusable()[0] ?? dialog)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape && isDismissable) {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (!trapFocus || event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    if (trapFocus || closeOnEscape) document.addEventListener("keydown", handleKeyDown);
    return () => {
      if (trapFocus || closeOnEscape) document.removeEventListener("keydown", handleKeyDown);
      if (trapFocus && previousFocus?.isConnected) previousFocus.focus();
    };
  }, [closeOnEscape, isDismissable, onClose, trapFocus]);

  const baseClasses = "bg-white rounded-lg";

  const renderButtons = () => {
    if (!showOkButton && !showCancelButton) return null;

    return (
      <div className="mt-4 pt-4 border-t">
        <PopupButtons alignment={buttonAlignment}>
          {showCancelButton && (
            <Button onClick={onCancel || onClose || (() => {})} variant="secondary">
              {cancelButtonText}
            </Button>
          )}
          {showOkButton && (
            <Button onClick={onOk || onClose || (() => {})} disabled={okButtonDisabled}>
              {okButtonText}
            </Button>
          )}
        </PopupButtons>
      </div>
    );
  };

  const popupComponent = (
    <div
      className={`fixed z-50 flex items-center justify-center bg-transparent ${overlayClassName}`}
      style={{
        top: topOffset,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-title"
      onClick={closeOnBackdrop && isDismissable ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        tabIndex={trapFocus ? -1 : undefined}
        className={`${baseClasses} ${fitContent ? typeClasses[type].replace("w-full", "w-fit") : typeClasses[type]} ${className || ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <PopupTitle
          title={title}
          onClose={onClose ?? (() => {})}
          isDismissable={isDismissable}
          icon={icon}
          className={titleClassName}
          titleClassName={titleTextClassName}
          closeButtonClassName={closeButtonClassName}
        />
        <div className={`popup-content rounded-b-lg p-4 ${contentBgClasses[type] ?? ""} ${contentClassName}`}>
          {children}
          {renderButtons()}
        </div>
      </div>
    </div>
  );

  return createPortal(popupComponent, document.body);
}

export default BasePopup;
