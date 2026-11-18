import useAdminReport from "./useAdminReport";
import { adminApi } from "../../../../api/adminApi";

// The SMS cost panel's data (PRD AUTH-13).
const useSmsUsage = () => useAdminReport(adminApi.smsUsage);

export default useSmsUsage;
