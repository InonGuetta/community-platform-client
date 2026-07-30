import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { createPeerMesh } from "./peerMesh";
import { describeMediaError, mediaDevicesUnavailable } from "./mediaErrors";

const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

// STUN alone cannot get through symmetric NAT — corporate networks and some
// mobile carriers — where the only remedy is a TURN relay. Configurable so that
// adding one is a deployment change rather than a code change. Set
// VITE_ICE_SERVERS to a JSON array to override.
const ICE_SERVERS = (() => {
  const raw = import.meta.env.VITE_ICE_SERVERS;
  if (!raw) return DEFAULT_ICE_SERVERS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_ICE_SERVERS;
  } catch {
    console.warn("[VideoRoom] VITE_ICE_SERVERS is not valid JSON — using the default STUN server");
    return DEFAULT_ICE_SERVERS;
  }
})();

export const useVideoRoom = ({ roomToken, onEnd }) => {
  const [streams, setStreams] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [roomError, setRoomError] = useState(null);

  const socketRef = useRef(null);
  const meshRef = useRef(null);
  const localStreamRef = useRef(null);

  // Held in a ref and read at call time, so the room's lifecycle does not
  // depend on the parent memoising this. It used to sit in the effect's
  // dependency array, which meant any re-render of the page tore the room down
  // — stopping the camera, dropping the socket and closing every peer — and
  // rebuilt it, re-prompting for permission.
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (!roomToken) return undefined;

    let cancelled = false;
    const socket = io("/", { path: "/socket.io", autoConnect: false });
    socketRef.current = socket;

    const upsertStream = (id, stream, label) =>
      setStreams((prev) => (prev.some((s) => s.id === id) ? prev : [...prev, { id, stream, label }]));
    const dropStream = (id) => setStreams((prev) => prev.filter((s) => s.id !== id));

    const mesh = createPeerMesh({
      createConnection: () => new RTCPeerConnection({ iceServers: ICE_SERVERS }),
      emit: (event, payload) => socket.emit(event, payload),
      onStream: (peerId, stream) => upsertStream(peerId, stream, peerId),
      onPeerLost: (peerId) => {
        dropStream(peerId);
        meshRef.current?.removePeer(peerId);
      },
    });
    meshRef.current = mesh;

    // Signalling failures are reported rather than thrown: an unhandled
    // rejection here would leave the room half-built with nothing on screen.
    const guard = (label) => (err) => console.error(`[VideoRoom] ${label} failed:`, err);

    // Joining on every "connect" covers the first connection and every
    // automatic reconnect alike. It used to be emitted once, inside the camera
    // callback, so a brief network drop left the user silently outside the room
    // while their screen still looked perfectly normal.
    socket.on("connect", () => {
      setRoomError(null);
      setConnected(true);
      socket.emit("join-room", { roomToken });
    });
    socket.on("disconnect", () => {
      setConnected(false);
      // Tear the mesh down, because rejoining cannot reuse it. Reconnecting
      // gives us a NEW socket id, so every remaining member treats us as a
      // newcomer and opens a fresh connection — but their own ids are unchanged,
      // so when their offer arrives ensurePeer() would hand back the dead
      // connection from before the drop and the media would never come back.
      // Clearing here lets the rejoin rebuild the mesh, and takes the frozen
      // tiles with it. The local preview stays: that stream is still live.
      mesh.closeAll();
      setStreams((prev) => prev.filter((s) => s.id === "local"));
    });

    socket.on("user-joined", ({ socketId }) => mesh.offerTo(socketId).catch(guard("offer")));
    socket.on("offer", ({ from, offer }) => mesh.acceptOffer(from, offer).catch(guard("answer")));
    socket.on("answer", ({ from, answer }) => mesh.acceptAnswer(from, answer).catch(guard("accept answer")));
    socket.on("ice-candidate", ({ from, candidate }) => mesh.addCandidate(from, candidate).catch(guard("candidate")));

    socket.on("user-left", ({ socketId }) => {
      dropStream(socketId);
      mesh.removePeer(socketId);
    });

    socket.on("session-ended", () => onEndRef.current?.());
    socket.on("join-error", ({ message }) => setRoomError(message || "לא ניתן להצטרף למפגש"));
    socket.on("session-error", ({ message }) => setRoomError(message || "הפעולה נכשלה"));

    // Media first, then connect: an offer must not arrive before we know
    // whether there are local tracks to attach to the connection.
    const start = async () => {
      if (mediaDevicesUnavailable()) {
        if (!cancelled) setMediaError(describeMediaError(null, { secureContext: window.isSecureContext }));
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          localStreamRef.current = stream;
          mesh.setLocalStream(stream);
          upsertStream("local", stream, "אני");
        } catch (err) {
          // Deliberately not fatal: the room is still joined, just without
          // anything to send. For a lecture platform, watching without a camera
          // is a legitimate way to attend, and it beats the previous behaviour
          // of failing silently and showing an empty screen.
          if (!cancelled) setMediaError(describeMediaError(err, { secureContext: window.isSecureContext }));
        }
      }
      if (!cancelled) socket.connect();
    };
    start();

    return () => {
      cancelled = true;
      mesh.closeAll();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      meshRef.current = null;
    };
  }, [roomToken]);

  // Only asks; the room closes when the server confirms with "session-ended".
  // Leaving immediately would have navigated a non-host away even though the
  // server refused their request and the session carried on without them.
  const endSession = useCallback(() => {
    socketRef.current?.emit("end-session", { roomToken });
  }, [roomToken]);

  const leave = useCallback(() => onEndRef.current?.(), []);

  return { streams, connected, mediaError, roomError, endSession, leave };
};
