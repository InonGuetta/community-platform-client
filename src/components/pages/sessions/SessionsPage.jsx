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
import DialogTitle from "../../features/Dialogs/DialogTitle";
import DialogContent from "../../features/Dialogs/DialogContent";
import DialogActions from "../../features/Dialogs/DialogActions";
import NoDataDialog from "../../features/NoDataDialog/NoDataDialog";
import useSessionsPageController from "./useSessionsPageController";
import { selectUser } from "../../../store/selectors/authSelectors";
import { roles, sessionTypes } from "../../../utilities/constant";

const SessionsPage = () => {
  const { rooms, createDialogOpen, setCreateDialogOpen, handleJoinRoom, handleCreateSession } = useSessionsPageController();
  const user = useSelector(selectUser);
  const [form, setForm] = useState({ title: "", sessionType: "group", maxParticipants: 10 });

  const canCreate = user?.role === roles.lecturer || user?.role === roles.admin;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Live Sessions</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            New Session
          </Button>
        )}
      </Box>

      {rooms.length === 0 ? (
        <NoDataDialog message="No active sessions right now" />
      ) : (
        <Grid container spacing={2}>
          {rooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>{room.title || "Untitled Session"}</Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Chip label={room.session_type} size="small" color="primary" />
                    <Chip label={`Host: ${room.host_name}`} size="small" variant="outlined" />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button startIcon={<MeetingRoomIcon />} variant="contained" size="small" onClick={() => handleJoinRoom(room.room_token)} fullWidth>
                    Join
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle onClose={() => setCreateDialogOpen(false)}>Create Session</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} fullWidth />
            <TextField label="Type" value={form.sessionType} onChange={(e) => setForm((p) => ({ ...p, sessionType: e.target.value }))} select fullWidth>
              {Object.values(sessionTypes).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Max Participants" type="number" value={form.maxParticipants} onChange={(e) => setForm((p) => ({ ...p, maxParticipants: Number(e.target.value) }))} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={() => handleCreateSession(form)} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsPage;
