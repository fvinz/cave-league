import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { loadAll } from "@/lib/mockData";
import "./styles.css";

// Start fetching data before React mounts so it arrives as early as possible.
// loadAll() is idempotent — the DataBoot useEffect will no-op on the same promise.
loadAll();

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
