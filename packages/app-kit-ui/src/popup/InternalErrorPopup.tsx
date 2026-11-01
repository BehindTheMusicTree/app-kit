"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import { BasePopup, BasePopupProps } from "./BasePopup";
import { ErrorCode } from "@behindthemusictree/app-kit/transport";

type InternalErrorPopupProps = Omit<BasePopupProps, "title" | "children" | "icon" | "isDismissable"> & {
  errorCode: ErrorCode;
  /**
   * Support contact email shown in the "if the problem persists" message. Passed by the
   * consuming app (from whatever env var / config it uses) so this package doesn't assume a
   * specific env var name.
   */
  contactEmail?: string | null;
};

export default function InternalErrorPopup({ errorCode, contactEmail, ...rest }: InternalErrorPopupProps) {
  return (
    <BasePopup
      {...rest}
      title="Internal Error"
      isDismissable={false}
      icon={AlertTriangle}
      children={
        <div className="flex flex-col items-center space-y-6 py-4">
          <AlertCircle className="h-16 w-16 text-[var(--color-red-500)]" strokeWidth={1.5} />
          <div>
            <p className="text-center text-[var(--color-neutral-600)]">
              Please try again. If the problem persists, contact us at{" "}
              <a href={`mailto:${contactEmail}`} className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">
                {contactEmail}
              </a>
            </p>
          </div>
          {errorCode && (
            <div className="text-sm text-[var(--color-neutral-500)] bg-[var(--color-neutral-100)] p-3 rounded-lg border border-[var(--color-neutral-100)]">
              Error Code: {errorCode}
            </div>
          )}
        </div>
      }
    />
  );
}
