import { useState } from "react";
import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import AddIcon from "@mui/icons-material/Add";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import EventIcon from "@mui/icons-material/Event";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DialogTitle from "../../features/Dialogs/DialogTitle";
import DialogContent from "../../features/Dialogs/DialogContent";
import DialogActions from "../../features/Dialogs/DialogActions";
import NoDataDialog from "../../features/NoDataDialog/NoDataDialog";
import useSessionsPageController from "./useSessionsPageController";
import { selectUser } from "../../../store/selectors/authSelectors";
import { sessionTypes, sessionTypeLabels } from "../../../utilities/constant";
import { isPrivileged } from "../../../utilities/permissions";

// Enough of a lead that the default is a plan rather than "now", which is what
// the unscheduled button next to it is already for.
const defaultScheduledAt = () => {
  const when = new Date(Date.now() + 60 * 60 * 1000);
  when.setSeconds(0, 0);
  // datetime-local wants the value in LOCAL time with no zone suffix, so
  // toISOString — which converts to UTC — would silently shift the default by
  // the offset. Subtracting it back is the standard workaround.
  return new Date(when.getTime() - when.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const formatWhen = (value) =>
  value
    ? new Date(value).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
    : "";

const SessionsPage = () => {
  const {
    rooms, upcoming, createDialogOpen, setCreateDialogOpen,
    handleJoinRoom, handleStartSession, handleCreateSession,
  } = useSessionsPageController();
  const user = useSelector(selectUser);
  const [form, setForm] = useState({
    title: "",
    sessionType: "group",
    maxParticipants: 10,
    // Empty means "start it now", which is what this dialog has always done.
    scheduledAt: "",
  });

  const canCreate = isPrivileged(user);
  const isHost = (room) => Number(room.host_id) === Number(user?.id);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>מפגשים חיים</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            מפגש חדש
          </Button>
        )}
      </Box>

      {rooms.length === 0 ? (
        <NoDataDialog
          message="אין מפגשים פעילים כרגע"
          actionLabel={canCreate ? "מפגש חדש" : undefined}
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : (
        <Grid container spacing={2}>
          {rooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>{room.title || "מפגש ללא כותרת"}</Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                    <Chip label={sessionTypeLabels[room.session_type] || room.session_type} size="small" color="primary" />
                    <Chip label={`מארח: ${room.host_name}`} size="small" variant="outlined" />
                  </Box>
                </CardContent>
                <CardActions>
                  {/* By id. The room token is no longer something the client
                      holds — SessionRoom asks the server for one on arrival. */}
                  <Button startIcon={<MeetingRoomIcon />} variant="contained" size="small" onClick={() => handleJoinRoom(room.id)} fullWidth>
                    הצטרפות
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Scheduled and not yet opened. Shown only when there is something in it:
          an empty "coming up" heading on a platform that has never scheduled
          anything is a permanent reminder of a feature nobody used. */}
      {upcoming.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>מפגשים קרובים</Typography>
          <Grid container spacing={2}>
            {upcoming.map((room) => (
              <Grid item xs={12} sm={6} md={4} key={room.id}>
                <Card sx={{ opacity: 0.92 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600}>{room.title || "מפגש ללא כותרת"}</Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                      <Chip icon={<EventIcon />} label={formatWhen(room.scheduled_at)} size="small" color="secondary" />
                      <Chip label={`מארח: ${room.host_name}`} size="small" variant="outlined" />
                    </Box>
                  </CardContent>
                  <CardActions>
                    {/* Only the host can open it, and only the host is offered
                        the button — the server refuses anyone else, and showing
                        a control that always fails is a worse way to say so. */}
                    {isHost(room) ? (
                      <Button startIcon={<PlayArrowIcon />} variant="contained" size="small" onClick={() => handleStartSession(room.id)} fullWidth>
                        פתיחת המפגש
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                        המפגש ייפתח על ידי המארח
                      </Typography>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle onClose={() => setCreateDialogOpen(false)}>יצירת מפגש</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="כותרת" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} fullWidth />
            <TextField label="סוג" value={form.sessionType} onChange={(e) => setForm((p) => ({ ...p, sessionType: e.target.value }))} select fullWidth>
              {Object.values(sessionTypes).map((t) => <MenuItem key={t} value={t}>{sessionTypeLabels[t] || t}</MenuItem>)}
            </TextField>
            <TextField label="מספר משתתפים מרבי" type="number" value={form.maxParticipants} onChange={(e) => setForm((p) => ({ ...p, maxParticipants: Number(e.target.value) }))} fullWidth />

            {/* Empty is the default and means "open it now" — the behaviour this
                dialog has always had. Filling it in makes the session exist
                before it begins, which is the whole point of scheduling. */}
            <TextField
              label="מועד (ריק = להתחיל עכשיו)"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            {!form.scheduledAt && (
              <Button size="small" onClick={() => setForm((p) => ({ ...p, scheduledAt: defaultScheduledAt() }))}>
                לקבוע למועד עתידי
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} variant="outlined">ביטול</Button>
          <Button onClick={() => handleCreateSession(form)} variant="contained">
            {form.scheduledAt ? "קביעת מפגש" : "יצירה והתחלה"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsPage;
