import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import NoDataDialog from "../../features/NoDataDialog/NoDataDialog";
import { fetchMyCourses } from "../../../store/slicesAndThunks/coursesSlice/coursesSliceGet";
import { statuses } from "../../../utilities/constant";
import { countLabel } from "../../../utilities/countLabel";

// What a student is enrolled in.
//
// Until now there was no such screen, while everything behind it already
// existed: the enrollments table, the admin's roster controls, the /courses/my
// endpoint and even the thunk that calls it. Being enrolled was something done TO
// a student that they could not see, and — until the visibility rule was wired —
// something that changed nothing for them either.
//
// Deliberately not CoursesPage with the controls hidden. That page is a
// management screen: it creates, edits, deletes and enrols, and its every row is
// an Accordion holding a roster. A student's answer to "what am I in" is a short
// list, and building it out of a management screen would mean every future change
// there having to remember a mode it was not designed for.
const MyCoursesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const courses = useSelector((state) => state.courses.myCourses);
  const status = useSelector((state) => state.courses.myCoursesStatus);

  useEffect(() => { dispatch(fetchMyCourses()); }, [dispatch]);

  if (status === statuses.loading && courses.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="primary">הקורסים שלי</Typography>
        {courses.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {countLabel(courses.length, "קורס אחד", "קורסים")}
          </Typography>
        )}
      </Box>

      {courses.length === 0 ? (
        // The archive is the honest place to send them: it holds the general
        // library, which is everything not attached to a course and is what a
        // student with no enrolments can still read.
        <NoDataDialog
          message="עדיין לא שויכת לאף קורס"
          actionLabel="לארכיון"
          onAction={() => navigate("/archive")}
        />
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" } }}>
          {courses.map((course) => (
            <Card key={course.id} sx={{ borderRadius: 2 }}>
              <CardActionArea onClick={() => navigate("/archive")} sx={{ p: 2, textAlign: "start", height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <SchoolOutlinedIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={800} color="primary">
                    {course.title}
                  </Typography>
                </Box>

                {course.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", mb: 1 }}
                  >
                    {course.description}
                  </Typography>
                )}

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {course.lecturer_name && (
                    <Chip label={course.lecturer_name} size="small" variant="outlined" />
                  )}
                  {/* The count comes back with the row — see LIST_COLUMNS in
                      servicesCourses — so no request per card is needed. */}
                  {course.media_count > 0 && (
                    <Chip
                      label={countLabel(course.media_count, "שיעור אחד", "שיעורים")}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default MyCoursesPage;
