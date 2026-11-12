import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../../api/adminApi";

// The AI cost panel's data (PRD ADM-1) — its own load, like the tag proposals,
// outside the dashboard's 30-second refresh: a month's spend does not move in
// half a minute, and summing it every 30s on every open dashboard is waste.
// Refreshed by hand from the panel.
const useAiUsage = () => {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");

  const load = useCallback(() => {
    setStatus("loading");
    adminApi
      .aiUsage()
      .then((data) => { setReport(data); setStatus("ready"); })
      .catch(() => setStatus("failed"));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { report, status, reload: load };
};

export default useAiUsage;
