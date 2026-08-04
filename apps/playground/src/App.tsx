import { useState } from "react";
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  RingLoader,
  Skeleton,
  PopupProvider,
  usePopup,
  BasePopup,
} from "@behindthemusictree/app-kit";

const rows = [
  { id: "1", name: "Rock" },
  { id: "2", name: "Electronic" },
];

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
        <p>Minimal harness exercising `ui` + `popup` exports to confirm the package builds and renders.</p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0" }}>
          <Button onClick={() => setLoading((v) => !v)}>Toggle loading</Button>
          <DemoPopupButton />
          {loading ? <RingLoader size={20} /> : null}
        </div>

        {loading ? (
          <Skeleton style={{ height: 32, width: 240 }} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Genre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </PopupProvider>
  );
}
