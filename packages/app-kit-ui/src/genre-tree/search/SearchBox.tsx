"use client";

import { useState, type ReactNode } from "react";
import { SearchCombobox } from "@behindthemusictree/ui";

import type { SearchGroup } from "./SearchGroup";

export type SearchBoxProps = {
  /** Accessible name of the input and the list. */
  label: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  groups: SearchGroup[];
  /** Called after the group item is picked and the list closed. */
  onPicked?: (groupKey: string, itemKey: string) => void;
  /** Shows the clear button when set. */
  onClear?: () => void;
  clearLabel?: string;
  /** An action left of the text, e.g. a Previous button. */
  leading?: ReactNode;
  className?: string;
  /** Called when the input gains focus, e.g. to load an index lazily. */
  onFocus?: () => void;
};

/** A search pill over any number of result groups; picking an item calls that item's `onSelect`. */
export default function SearchBox({
  label,
  placeholder,
  value,
  onValueChange,
  groups,
  onPicked,
  onClear,
  clearLabel,
  leading,
  className,
  onFocus,
}: SearchBoxProps) {
  const [open, setOpen] = useState(false);
  const loading = groups.some((group) => group.loading);
  const status = groups
    .map((group) => group.status)
    .filter(Boolean)
    .join(". ");

  const handlePick = (groupKey: string, itemKey: string) => {
    setOpen(false);
    groups.find((group) => group.key === groupKey)?.items.find((item) => item.key === itemKey)?.onSelect();
    onPicked?.(groupKey, itemKey);
  };

  return (
    <div className={className} onFocusCapture={onFocus}>
      <SearchCombobox
        ariaLabel={label}
        listLabel={`${label} results`}
        value={value}
        placeholder={placeholder ?? `${label}…`}
        groups={groups.map((group) => ({
          key: group.key,
          label: group.label,
          options: group.items.map((item) => ({ key: item.key, content: item.content })),
        }))}
        open={open}
        onOpenChange={setOpen}
        onValueChange={onValueChange}
        onPick={handlePick}
        status={status}
        loading={loading}
        onClear={onClear}
        clearLabel={clearLabel}
        leading={leading}
        inputClassName="focus-visible:ring-0"
      />
    </div>
  );
}
