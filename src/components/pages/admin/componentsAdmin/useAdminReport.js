import { useCallback, useEffect, useState } from "react";

// A dashboard panel's own report (AI cost, SMS cost): loaded once, outside the
// dashboard's 30-second refresh — a month's spend does not move in half a
// minute — and refreshed by hand. A failed refresh keeps the last report and
// says so (status "failed" with a report).
const useAdminReport = (fetcher) => {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");

  const load = useCallback(() => {
    setStatus("loading");
    fetcher()
      .then((data) => { setReport(data); setStatus("ready"); })
      .catch(() => setStatus("failed"));
  }, [fetcher]);

  useEffect(() => { load(); }, [load]);

  return { report, status, reload: load };
};

export default useAdminReport;
