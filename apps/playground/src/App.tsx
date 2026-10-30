import { useCallback, useState } from "react";
import {
  PopupProvider,
  usePopup,
  useConnectivityErrorPopup,
  CriteriaMinimum,
  PlayerProvider,
  usePlayer,
  PlayerTrack,
  TrackListProvider,
  TrackListSidebarVisibilityProvider,
  TrackNounProvider,
  useFetchWrapper,
  libraryEndpoints,
  SongDetailed,
  SongDetailedSchema,
} from "@behindthemusictree/app-kit";
import { BasePopup, InternalErrorPopup, NetworkErrorPopup } from "@behindthemusictree/app-kit-ui/popup";
import { GenreTreeView, PlayerPanel } from "@behindthemusictree/app-kit-ui/genre-tree";
import { Button, RingLoader, Skeleton } from "@behindthemusictree/ui";
import GenreCreationPopup from "./GenreCreationPopup";
import GenreRenamePopup from "./GenreRenamePopup";

const getBackendBaseUrl = () => "/api/grow-prototype-proxy/";

function useLoadTrack(): (trackId: string) => Promise<PlayerTrack> {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  return useCallback(
    async (trackId: string): Promise<PlayerTrack> => {
      const track = await fetch<SongDetailed>(
        libraryEndpoints.reference.songs.detail(trackId),
        true,
        false,
      );
      if (!track) {
        throw new Error(`Failed to load track ${trackId}`);
      }
      if (!track.youtubeVideo) {
        throw new Error(`Song ${trackId} has no YouTube video`);
      }
      return {
        id: trackId,
        kind: "youtube",
        youtubeVideoId: track.youtubeVideo.id,
        title: track.title,
        artists: track.artists?.map((artist) => ({ uuid: artist.uuid, name: artist.name })),
      };
    },
    [fetch],
  );
}

const VIEW_MODES = [
  { mode: "pop-core", label: "Pop/Core" },
  { mode: "wheel", label: "Wheel" },
  { mode: "stacked", label: "Stacked" },
  { mode: "outline", label: "Outline" },
] as const;

function ReferenceGenreTree() {
  const { showPopup, hidePopup } = usePopup();
  const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]["mode"]>("pop-core");
  const [allowWheelRotation, setAllowWheelRotation] = useState(false);
  const [focusGenreUuid, setFocusGenreUuid] = useState<string | null>(null);

  const showCriteriaCreationPopup = useCallback(
    (parent: CriteriaMinimum | null = null) => {
      showPopup(
        <GenreCreationPopup
          parent={parent}
          scope="reference"
          getBackendBaseUrl={getBackendBaseUrl}
          onClose={hidePopup}
        />,
      );
    },
    [hidePopup, showPopup],
  );

  const showGenreRenamePopup = useCallback(
    (genre: CriteriaMinimum) => {
      showPopup(
        <GenreRenamePopup
          genre={genre}
          scope="reference"
          getBackendBaseUrl={getBackendBaseUrl}
          onClose={hidePopup}
        />,
      );
    },
    [hidePopup, showPopup],
  );

  return (
    <>
      <div className="flex items-center gap-1 mb-2" role="group" aria-label="Tree view mode">
        {VIEW_MODES.map(({ mode, label }) => (
          <Button key={mode} variant={viewMode === mode ? "default" : "outline"} size="sm" onClick={() => setViewMode(mode)}>
            {label}
          </Button>
        ))}
        {viewMode !== "stacked" && viewMode !== "outline" && (
          <Button
            variant={allowWheelRotation ? "default" : "outline"}
            size="sm"
            onClick={() => setAllowWheelRotation((allowed) => !allowed)}
          >
            Rotation
          </Button>
        )}
        <Button size="sm" onClick={() => showCriteriaCreationPopup(null)}>
          Add root
        </Button>
      </div>
      <GenreTreeView
        scope="reference"
        placement="regions"
        viewMode={viewMode}
        allowWheelRotation={allowWheelRotation}
        floatingControlsLeading={
          <Button
            size="sm"
            variant="outline"
            aria-label={viewMode === "outline" ? "Show wheel view" : "Show outline view"}
            onClick={() => setViewMode(viewMode === "outline" ? "pop-core" : "outline")}
          >
            {viewMode === "outline" ? "◉" : "☰"}
          </Button>
        }
        showAddRoot={false}
        focusGenreUuid={focusGenreUuid}
        onFocusGenreChange={setFocusGenreUuid}
        handleGenreCreationAction={showCriteriaCreationPopup}
        handleGenreRenameAction={showGenreRenamePopup}
        getBackendBaseUrl={getBackendBaseUrl}
      />
    </>
  );
}

function DemoPopupButton() {
  const { showPopup, hidePopup } = usePopup();

  return (
    <Button
      onClick={() =>
        showPopup(
          <BasePopup title="Demo popup" onClose={hidePopup} isDismissable>
            <p>
              This confirms `popup` exports render correctly alongside
              `@behindthemusictree/ui`.
            </p>
          </BasePopup>,
        )
      }
    >
      Open popup
    </Button>
  );
}

function PopupHost() {
  const { activePopup } = usePopup();
  return <>{activePopup}</>;
}

// Mirrors grow's Player panel: the YouTube player needs a mounted PlayerVideoSurface.
function AppContent() {
  useConnectivityErrorPopup({
    isAccountPage: false,
    routeRequiresAuth: false,
    routeRequiresSpotify: false,
    renderers: {
      renderAuthPopup: () => null,
      renderSpotifyOnlyAuthPopup: () => null,
      renderInternalErrorPopup: (errorCode) => <InternalErrorPopup errorCode={errorCode} />,
      renderSpotifyAuthErrorPopup: () => null,
      renderGoogleAuthErrorPopup: () => null,
      renderNetworkErrorPopup: () => <NetworkErrorPopup />,
    },
  });
  const [loading, setLoading] = useState(false);
  const { playerTrackObject } = usePlayer();
  const [dismissedTrackId, setDismissedTrackId] = useState<string | null>(null);
  const playerTrackId = playerTrackObject?.track.id ?? null;

  return (
    <>
      <div
        style={{
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <h1>
          app-kit playground{" "}
          <span style={{ fontSize: 14, fontWeight: 400, color: "#888" }}>
            v{import.meta.env.VITE_APP_KIT_VERSION}
          </span>
        </h1>
        <p>
          Minimal harness exercising `popup` exports, `@behindthemusictree/ui`
          components, and `genre-tree`'s `GenreTreeView` against the reference
          scope on the staging backend.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            margin: "16px 0",
          }}
        >
          <Button onClick={() => setLoading((v) => !v)}>Toggle loading</Button>
          <DemoPopupButton />
          {loading ? <RingLoader size={20} /> : null}
        </div>

        {loading ? (
          <Skeleton style={{ height: 32, width: 240 }} />
        ) : (
          <div style={{ flex: 1, minHeight: 0 }}>
            <ReferenceGenreTree />
          </div>
        )}
      </div>
      <PlayerPanel
        isVisible={playerTrackId !== null && playerTrackId !== dismissedTrackId}
        onClose={() => setDismissedTrackId(playerTrackId)}
        className="top-3"
      />
      <PopupHost />
    </>
  );
}

export function App() {
  const loadTrack = useLoadTrack();

  return (
    <TrackNounProvider singular="song" plural="songs">
      <PlayerProvider loadTrack={loadTrack}>
        <PopupProvider>
          <TrackListSidebarVisibilityProvider>
            <TrackListProvider getBackendBaseUrl={getBackendBaseUrl} schema={SongDetailedSchema}>
              <AppContent />
            </TrackListProvider>
          </TrackListSidebarVisibilityProvider>
        </PopupProvider>
      </PlayerProvider>
    </TrackNounProvider>
  );
}
