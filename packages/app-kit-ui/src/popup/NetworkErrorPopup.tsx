"use client";

import { AlertTriangle } from "lucide-react";
import { BasePopup, BasePopupProps } from "./BasePopup";
import { ErrorCode } from "@behindthemusictree/app-kit/transport";

type NetworkErrorPopupProps = Omit<BasePopupProps, "title" | "children" | "icon" | "isDismissable"> & {
  errorCode: ErrorCode;
};

const OFFLINE_MESSAGE = "It seems that you are not connected to the internet. Please check your connection and try again.";
const UNREACHABLE_MESSAGE = "We couldn't reach the server. Please try again in a moment.";

export default function NetworkErrorPopup({ errorCode, ...rest }: NetworkErrorPopupProps) {
  return (
    <BasePopup
      {...rest}
      title="Network Error"
      isDismissable={false}
      icon={AlertTriangle}
      children={
        <div className="flex flex-col items-center space-y-6 py-4">
          <AlertTriangle className="h-16 w-16 text-[var(--color-neutral-600)]" strokeWidth={1.5} />
          <p className="text-center text-[var(--color-neutral-700)]">
            {errorCode === ErrorCode.NETWORK_OFFLINE ? OFFLINE_MESSAGE : UNREACHABLE_MESSAGE}
          </p>
        </div>
      }
    />
  );
}
