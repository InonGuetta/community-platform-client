import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { sessionsApi } from "../../../api/sessionsApi";
import Paper from "@mui/material/Paper";
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
import PageHeader from "../../features/PageHeader/PageHeader";
import EmptyState from "../../features/EmptyState/EmptyState";
import StatusBadge from "../../features/StatusBadge/StatusBadge";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import { RADIUS } from "../../../theme/tokens";
import useSessionsPageController from "./useSessionsPageController";
import { sessionTypes, sessionTypeLabels } from "../../../utilities/constant";
import { formatDateTime } from "../../../utilities/formatDate";
import { useTranslation } from "react-i18next";

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

// A session's card: its title, its badges, and what can be done with it.
const SessionCard = ({ title, badges, actions }) => (
  <Paper sx={{ p: 3, borderRadius: `${RADIUS.card}px`, display: "flex", flexDirection: "column", gap: 2 }}>
    <Typography variant="subtitle1" fontWeight={800} dir="auto">{title}</Typography>
    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>{badges}</Box>
    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mt: "auto" }}>{actions}</Box>
  </Paper>
);

const cardsGrid = { display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" } };

const SessionsPage = () => {
  const { t } = useTranslation(["sessions", "common"]);
  const {
    rooms, upcoming, createDialogOpen, setCreateDialogOpen,
    handleJoinRoom, handleStartSession, handleCreateSession, canCreate, isHost, courses,
  } = useSessionsPageController();
  const [form, setForm] = useState({
    title: "",
    sessionType: "group",
    maxParticipants: 10,
    // Empty means "start it now", which is what this dialog has always done.
    scheduledAt: "",
    // Empty is a general session (PRD D8).
    courseId: "",
  });

  return (
    <Box>
      <PageHeader
        title={t("title")}
        actions={canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            {t("new")}
          </Button>
        )}
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={MicNoneOutlinedIcon}
          title={t("noneActive")}
          action={canCreate ? { label: t("new"), onClick: () => setCreateDialogOpen(true) } : null}
        />
      ) : (
        <Box sx={cardsGrid}>
          {rooms.map((room) => (
            <SessionCard
              key={room.id}
              title={room.title || t("untitled")}
              badges={
                <>
                  <StatusBadge tone="indigo">{sessionTypeLabels[room.session_type] || room.session_type}</StatusBadge>
                  <StatusBadge tone="neutral">{t("host", { name: room.host_name })}</StatusBadge>
                  {room.course_title && <StatusBadge tone="neutral">{room.course_title}</StatusBadge>}
                </>
              }
              actions={
                /* By id. The room token is no longer something the client
                   holds — SessionRoom asks the server for one on arrival. */
                <Button startIcon={<MeetingRoomIcon />} variant="contained" size="small" onClick={() => handleJoinRoom(room.id)} fullWidth>
                  {t("join")}
                </Button>
              }
            />
          ))}
        </Box>
      )}

      {/* Scheduled and not yet opened. Shown only when there is something in it:
          an empty "coming up" heading on a platform that has never scheduled
          anything is a permanent reminder of a feature nobody used. */}
      {upcoming.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="display" component="h2" sx={{ fontSize: { xs: 24, md: 28 }, mb: 3 }}>{t("upcoming")}</Typography>
          <Box sx={cardsGrid}>
            {upcoming.map((room) => (
              <SessionCard
                key={room.id}
                title={room.title || t("untitled")}
                badges={
                  <>
                    <StatusBadge tone="warning" icon={<EventIcon sx={{ fontSize: 14 }} />}>{formatDateTime(room.scheduled_at)}</StatusBadge>
                    <StatusBadge tone="neutral">{t("host", { name: room.host_name })}</StatusBadge>
                    {room.course_title && <StatusBadge tone="neutral">{room.course_title}</StatusBadge>}
                  </>
                }
                actions={
                  <>
                    {/* Only the host can open it, and only the host is offered
                        the button — the server refuses anyone else, and showing
                        a control that always fails is a worse way to say so. */}
                    {isHost(room) ? (
                      <Button startIcon={<PlayArrowIcon />} variant="contained" size="small" onClick={() => handleStartSession(room.id)} sx={{ flex: 1 }}>
                        {t("open")}
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                        {t("hostOpens")}
                      </Typography>
                    )}
                    {/* NOTIF-3 — for everyone, host included: the session goes
                        into whatever calendar the reader uses. Only a session
                        with a time has anything to put there. */}
                    {room.scheduled_at && (
                      <Button
                        component="a"
                        href={sessionsApi.calendarUrl(room.id)}
                        download
                        startIcon={<EventAvailableIcon />}
                        size="small"
                        variant="soft"
                        sx={{ flexShrink: 0 }}
                      >
                        {t("addToCalendar")}
                      </Button>
                    )}
                  </>
                }
              />
            ))}
          </Box>
        </Box>
      )}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle onClose={() => setCreateDialogOpen(false)}>{t("create.title")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label={t("create.name")} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} fullWidth />
            <TextField label={t("create.type")} value={form.sessionType} onChange={(e) => setForm((p) => ({ ...p, sessionType: e.target.value }))} select fullWidth>
              {Object.values(sessionTypes).map((t) => <MenuItem key={t} value={t}>{sessionTypeLabels[t] || t}</MenuItem>)}
            </TextField>
            <TextField label={t("create.maxParticipants")} type="number" value={form.maxParticipants} onChange={(e) => setForm((p) => ({ ...p, maxParticipants: Number(e.target.value) }))} fullWidth />

            {/* Who is TOLD about the session (PRD D8) — not who may join, which
                stays everyone. Hidden for somebody who teaches no course. */}
            {courses.length > 0 && (
              <TextField
                label={t("create.course")}
                value={form.courseId}
                onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
                select
                fullWidth
                // Show "ללא קורס" rather than an empty box: no course is a real
                // choice with its own consequence, stated in the helper below.
                SelectProps={{ displayEmpty: true }}
                InputLabelProps={{ shrink: true }}
                helperText={form.courseId ? t("create.courseNotified") : t("create.allNotified")}
              >
                <MenuItem value="">{t("create.noCourse")}</MenuItem>
                {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>)}
              </TextField>
            )}

            {/* Empty is the default and means "open it now" — the behaviour this
                dialog has always had. Filling it in makes the session exist
                before it begins, which is the whole point of scheduling. */}
            <TextField
              label={t("create.when")}
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            {!form.scheduledAt && (
              <Button size="small" onClick={() => setForm((p) => ({ ...p, scheduledAt: defaultScheduledAt() }))}>
                {t("create.schedule")}
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} variant="outlined">{t("common:actions.cancel")}</Button>
          <Button onClick={() => handleCreateSession(form)} variant="contained">
            {form.scheduledAt ? t("create.scheduleSubmit") : t("create.createStart")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsPage;
