import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ParticipantGrid from "./ParticipantGrid";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const VideoRoom = ({ roomToken, userId, role, onEnd }) => {
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const [streams, setStreams] = useState([]);
  const [connected, setConnected] = useState(false);

  const addStream = useCallback((id, stream, label) => {
    setStreams((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev;
      return [...prev, { id, stream, label }];
    });
  }, []);

  const removeStream = useCallback((id) => {
    setStreams((prev) => prev.filter((s) => s.id !== id));
    if (peersRef.current[id]) {
      peersRef.current[id].close();
      delete peersRef.current[id];
    }
  }, []);

  const createPeer = useCallback((targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));

    pc.ontrack = (e) => addStream(targetId, e.streams[0], targetId);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit("ice-candidate", { roomToken, candidate: e.candidate, to: targetId });
      }
    };

    peersRef.current[targetId] = pc;
    return pc;
  }, [roomToken, addStream]);

  useEffect(() => {
    const socket = io("/", { path: "/socket.io" });
    socketRef.current = socket;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStreamRef.current = stream;
      addStream("local", stream, "You");
      socket.emit("join-room", { roomToken, userId, role });
      setConnected(true);
    });

    socket.on("user-joined", async ({ userId: remoteId }) => {
      const pc = createPeer(remoteId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomToken, offer, to: remoteId });
    });

    socket.on("offer", async ({ offer, from }) => {
      const pc = createPeer(from);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { roomToken, answer, to: from });
    });

    socket.on("answer", async ({ answer, from }) => {
      await peersRef.current[from]?.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async ({ candidate, from }) => {
      await peersRef.current[from]?.addIceCandidate(candidate);
    });

    socket.on("user-left", ({ userId: leftId }) => removeStream(leftId));
    socket.on("session-ended", () => onEnd?.());

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(peersRef.current).forEach((pc) => pc.close());
      socket.disconnect();
    };
  }, [roomToken, userId, role, createPeer, addStream, removeStream, onEnd]);

  const handleEnd = () => {
    socketRef.current?.emit("end-session", { roomToken });
    onEnd?.();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "grey.950" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "grey.900" }}>
        <Typography variant="body2" color="grey.400">Room: {roomToken}</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {connected && <Typography variant="body2" color="success.main">{streams.length} participant(s)</Typography>}
          {role === "lecturer" || role === "admin" ? (
            <Button size="small" variant="contained" color="error" onClick={handleEnd}>End Session</Button>
          ) : (
            <Button size="small" variant="outlined" color="warning" onClick={onEnd}>Leave</Button>
          )}
        </Box>
      </Box>
      <Box sx={{ flex: 1, p: 1 }}>
        <ParticipantGrid streams={streams} />
      </Box>
    </Box>
  );
};

export default VideoRoom;
