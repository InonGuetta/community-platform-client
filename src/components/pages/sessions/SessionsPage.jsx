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
import { roles, sessionTypes, sessionTypeLabels } from "../../../utilities/constant";

const SessionsPage = () => {
  const { rooms, createDialogOpen, setCreateDialogOpen, handleJoinRoom, handleCreateSession } = useSessionsPageController();
  const user = useSelector(selectUser);
  const [form, setForm] = useState({ title: "", sessionType: "group", maxParticipants: 10 });

  const canCreate = user?.role === roles.lecturer || user?.role === roles.admin;

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
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Chip label={sessionTypeLabels[room.session_type] || room.session_type} size="small" color="primary" />
                    <Chip label={`מארח: ${room.host_name}`} size="small" variant="outlined" />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button startIcon={<MeetingRoomIcon />} variant="contained" size="small" onClick={() => handleJoinRoom(room.room_token)} fullWidth>
                    הצטרפות
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} variant="outlined">ביטול</Button>
          <Button onClick={() => handleCreateSession(form)} variant="contained">יצירה</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsPage;
