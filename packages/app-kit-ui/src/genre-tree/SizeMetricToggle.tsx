"use client";

import { MdMusicNote, MdVisibility } from "react-icons/md";
import { SegmentedControl } from "@behindthemusictree/ui";

import type { GenreTreeSizeMetric } from "./playlist-tree/size-metric";

export function SizeMetricToggle({
  value,
  onChange,
}: {
  value: GenreTreeSizeMetric;
  onChange: (value: GenreTreeSizeMetric) => void;
}) {
  return (
    <SegmentedControl
      aria-label="Size nodes by"
      value={value}
      onChange={onChange}
      options={[
        { value: "songs", label: <MdMusicNote size={18} aria-hidden />, "aria-label": "Size by songs", title: "Node size by song count" },
        { value: "views", label: <MdVisibility size={18} aria-hidden />, "aria-label": "Size by views", title: "Node size by song views" },
      ]}
    />
  );
}
