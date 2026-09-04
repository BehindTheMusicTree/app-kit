"use client";

import { CriteriaDetailed } from "./schemas/criteria/detailed";

export interface GenreDetailPanelProps {
  criteria: CriteriaDetailed | null;
  isLoading: boolean;
  onClose: () => void;
  className?: string;
}

export default function GenreDetailPanel({
  criteria,
  isLoading,
  onClose,
  className = "",
}: GenreDetailPanelProps) {
  return (
    <div
      className={`genre-detail-panel flex flex-col h-full overflow-y-auto rounded-lg bg-gray-50 p-4 ${className}`}
    >
      <div className="header flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900">
          {criteria?.name ?? (isLoading ? "Loading…" : "")}
        </h3>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          &#10005;
        </button>
      </div>
      {isLoading ? (
        <div className="mt-4 text-sm text-gray-500">Loading genre details…</div>
      ) : criteria ? (
        <div className="mt-4 flex flex-col gap-3 text-sm text-gray-700">
          <div>
            <span className="font-semibold">Tracks: </span>
            {criteria.tracksCount}
            {criteria.tracksArchivedCount > 0
              ? ` (${criteria.tracksArchivedCount} archived)`
              : ""}
          </div>
          <div>
            <span className="font-semibold">Children: </span>
            {criteria.children.length}
          </div>
          {criteria.essentialTracks.length > 0 && (
            <div>
              <div className="font-semibold mb-1">Essential tracks</div>
              <ul className="list-disc pl-5">
                {criteria.essentialTracks.map((track) => (
                  <li key={track.uuid}>{track.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 text-sm text-gray-500">No details available.</div>
      )}
    </div>
  );
}
