import { useEffect, useState } from "react";
import { adminApi } from "../../../api/adminApi";

// What the admin dashboard does — its overview, loaded on arrival and every 30
// seconds, and the reconcile sweep — so that AdminDashboard.jsx is layout only.
//
// Local state, not a slice: nothing else on any screen reads these numbers, and
// they are thrown away when the page is left. See "Where state lives" in
// CLAUDE.md.
export const useAdminDashboardController = () => {
  const [stats, setStats] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [trouble, setTrouble] = useState(null);
  const [donations, setDonations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Declared outside the effect so the reconcile button can refresh with it: the
  // whole point of pressing it is to watch the stranded list empty out, and a
  // panel that keeps showing the old one for thirty seconds reads as a button
  // that did nothing.
  const load = async () => {
    try {
      // Renamed on the way out so they do not shadow the state variables of
      // the same name declared above.
      const {
        stats: nextStats, queueStatus: nextQueue, health: nextHealth,
        trouble: nextTrouble, donations: nextDonations,
      } = await adminApi.overview();
      setStats(nextStats);
      setQueueStatus(nextQueue);
      setHealth(nextHealth);
      setTrouble(nextTrouble);
      setDonations(nextDonations);
      setError(null);
    } catch (err) {
      // This used to be swallowed entirely, which was worse than it sounds:
      // with no data, the health panel renders "לא זמין" for both Postgres
      // and Redis — so a request that merely failed looks exactly like an
      // outage, and sends an admin off investigating a database that is fine.
      setError(err.response?.data?.message || "לא ניתן לטעון את נתוני הניהול");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // `load` is deliberately absent from the deps. It is recreated every render,
    // so listing it would restart the 30s timer on each one — which is the
    // opposite of what an auto-refreshing dashboard wants.
  }, []);

  // Runs the sweep, then reloads so the lists reflect what it just did.
  const handleReconcile = async () => {
    const result = await adminApi.reconcile();
    await load();
    return result;
  };

  return { stats, queueStatus, health, trouble, donations, loading, error, handleReconcile };
};
