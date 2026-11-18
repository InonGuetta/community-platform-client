import useAdminReport from "./useAdminReport";
import { adminApi } from "../../../../api/adminApi";

// The AI cost panel's data (PRD ADM-1) — see useAdminReport for why it loads
// on its own.
const useAiUsage = () => useAdminReport(adminApi.aiUsage);

export default useAiUsage;
