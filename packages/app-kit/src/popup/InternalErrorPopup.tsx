"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import { BasePopup, BasePopupProps } from "./BasePopup";
import { ErrorCode } from "../transport/app-errors/app-error-codes";

type InternalErrorPopupProps = Omit<BasePopupProps, "title" | "children" | "icon" | "isDismissable"> & {
  errorCode: ErrorCode;
  /**
   * Support contact email shown in the "if the problem persists" message. Grow's original
   * hardcoded `process.env.NEXT_PUBLIC_CONTACT_EMAIL` directly; the consuming app now passes
   * its own value (from whatever env var / config it uses) so this package doesn't assume that name.
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
          <AlertCircle className="h-16 w-16 text-red-500" strokeWidth={1.5} />
          <div>
            <p className="text-center text-gray-600">
              Please try again. If the problem persists, contact us at{" "}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:text-blue-800">
                {contactEmail}
              </a>
            </p>
          </div>
          {errorCode && (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
              Error Code: {errorCode}
            </div>
          )}
        </div>
      }
    />
  );
}
