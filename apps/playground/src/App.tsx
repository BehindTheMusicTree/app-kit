import { useCallback, useState } from "react";
import {
  PopupProvider,
  usePopup,
  BasePopup,
  GenreTreeView,
  CriteriaMinimum,
  PlayerProvider,
  PlayerTrack,
  TrackListProvider,
  TrackListSidebarVisibilityProvider,
  useFetchWrapper,
  libraryEndpoints,
  libraryQueryKeys,
  YoutubeTrackDetailed,
  YoutubeTrackDetailedSchema,
  makeCriteriaPlaylistDetailedSchema,
} from "@behindthemusictree/app-kit";
import { Button, RingLoader, Skeleton } from "@behindthemusictree/ui";
import GenreCreationPopup from "./GenreCreationPopup";
import GenreRenamePopup from "./GenreRenamePopup";

const getBackendBaseUrl = () => "/api/grow-prototype-proxy/";

function useLoadTrack(): (trackId: string) => Promise<PlayerTrack> {
  const { fetch } = useFetchWrapper(getBackendBaseUrl);

  return useCallback(
    async (trackId: string): Promise<PlayerTrack> => {
      const track = await fetch<YoutubeTrackDetailed>(
        libraryEndpoints.reference.youtube.detail(trackId),
        true,
        false,
      );
      if (!track) {
        throw new Error(`Failed to load track ${trackId}`);
      }
      return {
        id: trackId,
        kind: "youtube",
        youtubeVideoId: track.youtubeVideoId,
        title: track.title,
        artists: track.artists?.map((artist) => ({ name: artist.name })),
      };
    },
    [fetch],
  );
}

const criteriaPlaylistDetailedSchema = makeCriteriaPlaylistDetailedSchema(
  YoutubeTrackDetailedSchema,
);

function ReferenceGenreTree() {
  const { showPopup, hidePopup } = usePopup();

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
    <GenreTreeView
      scope="reference"
      handleGenreCreationAction={showCriteriaCreationPopup}
      handleGenreRenameAction={showGenreRenamePopup}
      getBackendBaseUrl={getBackendBaseUrl}
      criteriaPlaylistDetailedSchema={criteriaPlaylistDetailedSchema}
    />
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

function AppContent() {
  const [loading, setLoading] = useState(false);

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
        <h1>app-kit playground</h1>
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
      <PopupHost />
    </>
  );
}

export function App() {
  const loadTrack = useLoadTrack();

  return (
    <PlayerProvider loadTrack={loadTrack}>
      <PopupProvider>
        <TrackListSidebarVisibilityProvider>
          <TrackListProvider
            getBackendBaseUrl={getBackendBaseUrl}
            schema={YoutubeTrackDetailedSchema}
            listEndpoint={libraryEndpoints.reference.youtube.list}
            listQueryKey={libraryQueryKeys.reference.youtube.list}
          >
            <AppContent />
          </TrackListProvider>
        </TrackListSidebarVisibilityProvider>
      </PopupProvider>
    </PlayerProvider>
  );
}
