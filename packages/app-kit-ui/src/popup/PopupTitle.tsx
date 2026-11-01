"use client";

import { X } from "lucide-react";
import { Button } from "@behindthemusictree/ui";
import { LucideIcon } from "lucide-react";

interface PopupTitleProps {
  title: string;
  onClose: () => void;
  isDismissable?: boolean;
  icon?: LucideIcon;
  className?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
}

export function PopupTitle({
  title,
  onClose,
  isDismissable,
  icon: Icon,
  className = "",
  titleClassName = "",
  closeButtonClassName = "",
}: PopupTitleProps) {
  return (
    <div className={`popup-title flex items-center justify-between bg-black p-4 rounded-t-lg ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-white" />}
        <h3 id="popup-title" className={`text-white font-semibold ${titleClassName}`}>
          {title}
        </h3>
      </div>
      {isDismissable && (
        <Button
          onClick={onClose}
          className={`h-8 w-8 text-white hover:text-white/80 ${closeButtonClassName}`}
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
