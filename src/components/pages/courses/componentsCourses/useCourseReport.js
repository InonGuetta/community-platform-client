import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { coursesApi } from "../../../../api/coursesApi";
import { notify } from "../../../../store/slicesAndThunks/snackbarSlice";
import { reportCsv, reportFileName } from "../../../../utilities/courseReport";
import { CSV_BOM } from "../../../../utilities/rosterCsv";
import { saveBlob } from "../../../../utilities/saveBlob";
import { useTranslation } from "react-i18next";

// The course report's data (PRD CRS-4) and its CSV export — local to the
// report, like the AI cost panel's: nothing else reads it. See CourseReport.jsx.

export const useCourseReport = (courseId) => {
  const { t } = useTranslation("courses");
  const dispatch = useDispatch();
  const [state, setState] = useState({ status: "loading", report: null });
  useEffect(() => {
    let current = true;
    coursesApi.getReport(courseId)
      .then((report) => { if (current) setState({ status: "succeeded", report }); })
      .catch(() => { if (current) setState({ status: "failed", report: null }); });
    return () => { current = false; };
  }, [courseId]);

  const exportCsv = (courseTitle) => {
    try {
      saveBlob(new Blob([CSV_BOM + reportCsv(state.report)], { type: "text/csv;charset=utf-8" }), reportFileName(courseTitle));
    } catch {
      dispatch(notify({ message: t("report.exportFailed"), severity: "error" }));
    }
  };
  return { ...state, exportCsv };
};
