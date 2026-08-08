import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, SessionProvider, ConnectivityErrorProvider } from "@behindthemusictree/app-kit";
import { App } from "./App";
import "./index.css";
import "@behindthemusictree/genre-tree-view/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ConnectivityErrorProvider>
          <App />
        </ConnectivityErrorProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
