import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../../api/adminApi";

// The SMS cost panel's data (PRD AUTH-13) — its own load, like the AI panel's
// (useAiUsage), outside the dashboard's 30-second refresh. Refreshed by hand.
const useSmsUsage = () => {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");

  const load = useCallback(() => {
    setStatus("loading");
    adminApi
      .smsUsage()
      .then((data) => { setReport(data); setStatus("ready"); })
      .catch(() => setStatus("failed"));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { report, status, reload: load };
};

export default useSmsUsage;
