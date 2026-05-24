import { useEffect } from "react";
import { loadAll, startRealtime, stopRealtime } from "@/lib/mockData";

export function DataBoot() {
  useEffect(() => {
    loadAll();
    startRealtime();
    return () => { stopRealtime(); };
  }, []);
  return null;
}
