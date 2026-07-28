import { useDispatch, useSelector } from "react-redux";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { selectNotification } from "../../../store/selectors/notificationSelectors";
import { closeNotification } from "../../../store/slicesAndThunks/notificationSlice";

// The single app-wide toast host. Rendered once in App (outside <Routes>) so a
// message survives navigation and any page can trigger it via the notify()
// action — directly or, in most cases, automatically through the notification
// middleware.
const GlobalSnackbar = () => {
  const dispatch = useDispatch();
  const { open, message, severity, key } = useSelector(selectNotification);

  const handleClose = (_event, reason) => {
    // Don't dismiss on an incidental click elsewhere — only on timeout or the X.
    if (reason === "clickaway") return;
    dispatch(closeNotification());
  };

  return (
    <Snackbar
      key={key}
      open={open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default GlobalSnackbar;
