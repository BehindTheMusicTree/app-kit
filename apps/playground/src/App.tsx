import { useCallback, useState } from "react";
import {
  Button,
  RingLoader,
  Skeleton,
  PopupProvider,
  usePopup,
  BasePopup,
  GenreTreeView,
  useCreateGenre,
  CriteriaMinimum,
} from "@behindthemusictree/app-kit";
import GenreCreationPopup from "./GenreCreationPopup";

const getBackendBaseUrl = () =>
  import.meta.env.VITE_VERCEL_ENV === "production"
    ? "https://hear-api.themusictree.org/v2/"
    : "https://hear-api-staging.themusictree.org/v2/";
const uploadTimeoutMs = 5 * 60 * 1000;

function ReferenceGenreTree() {
  const { showPopup, hidePopup } = usePopup();
  const { mutate: createGenre, formErrors } = useCreateGenre("reference", getBackendBaseUrl);

  const showCriteriaCreationPopup = useCallback(
    (parent: CriteriaMinimum | null = null) => {
      showPopup(
        <GenreCreationPopup
          parent={parent}
          onSubmit={({ name, parent }) => {
            createGenre({ name, parent });
            hidePopup();
          }}
          onClose={hidePopup}
          formErrors={formErrors}
        />,
      );
    },
    [formErrors, createGenre, hidePopup, showPopup],
  );

  return (
    <GenreTreeView
      scope="reference"
      handleGenreCreationAction={showCriteriaCreationPopup}
      getBackendBaseUrl={getBackendBaseUrl}
      uploadTimeoutMs={uploadTimeoutMs}
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
            <p>This confirms `popup` + `ui` subpath exports render correctly together.</p>
          </BasePopup>,
        )
      }
    >
      Open popup
    </Button>
  );
}

export function App() {
  const [loading, setLoading] = useState(false);

  return (
    <PopupProvider>
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1>app-kit playground</h1>
        <p>
          Minimal harness exercising `ui` + `popup` exports, and `genre-tree`'s `GenreTreeView` against the
          reference scope on the staging backend.
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0" }}>
          <Button onClick={() => setLoading((v) => !v)}>Toggle loading</Button>
          <DemoPopupButton />
          {loading ? <RingLoader size={20} /> : null}
        </div>

        {loading ? <Skeleton style={{ height: 32, width: 240 }} /> : <ReferenceGenreTree />}
      </div>
    </PopupProvider>
  );
}
