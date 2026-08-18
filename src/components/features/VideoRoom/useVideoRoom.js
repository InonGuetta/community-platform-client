import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { createPeerMesh } from "./peerMesh";
import { describeMediaError, mediaDevicesUnavailable } from "./mediaErrors";
import { toggleTrackKind, hasTrackKind } from "./mediaToggles";
import { SOCKET_EVENTS, SOCKET_LIFECYCLE } from "../../../utilities/socketEvents";
import { logger } from "../../../utilities/logger";

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
    logger.warn("[VideoRoom] VITE_ICE_SERVERS is not valid JSON — using the default STUN server");
    return DEFAULT_ICE_SERVERS;
  }
})();

export const useVideoRoom = ({ roomToken, onEnd }) => {
  const [streams, setStreams] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [roomError, setRoomError] = useState(null);
  // Mirrors of the tracks' own `enabled` flags. The track is the truth; these
  // exist because React cannot re-render on a property of a MediaStreamTrack.
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  // Whether there is a device to control at all. Separate from the two above
  // because "muted" and "you have no microphone" are different things to show,
  // and conflating them is how a user with no microphone was shown an enabled,
  // unmuted-looking button that did nothing when pressed.
  const [hasMic, setHasMic] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [messages, setMessages] = useState([]);

  const socketRef = useRef(null);
  const meshRef = useRef(null);
  const localStreamRef = useRef(null);
  // The camera track, kept aside while a screen is being shared so that stopping
  // the share can put it back. Without it, ending a share leaves every peer
  // receiving a track that has ended — a frozen last frame rather than a face.
  const cameraTrackRef = useRef(null);
  const screenTrackRef = useRef(null);

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
      emit: (event, payload) => {
        // Names and peer ids only, never the SDP or the candidate itself: they
        // are kilobytes each, they arrive in bursts, and they describe the
        // user's network. What matters when a room fails to connect is the
        // ORDER of the handshake, which the names alone show.
        logger.debug(`[socket] → ${event}`, payload?.to ?? "");
        socket.emit(event, payload);
      },
      onStream: (peerId, stream) => upsertStream(peerId, stream, peerId),
      onPeerLost: (peerId) => {
        dropStream(peerId);
        meshRef.current?.removePeer(peerId);
      },
      // Interleaved with the [socket] lines above and below, so the console
      // reads as one story: the message that crossed the wire, then what the
      // mesh did about it. Same debug level, so it is stripped from the
      // production bundle at build time along with everything else here.
      log: (message) => logger.debug(`[mesh] ${message}`),
    });
    meshRef.current = mesh;

    // Signalling failures are reported rather than thrown: an unhandled
    // rejection here would leave the room half-built with nothing on screen.
    const guard = (label) => (err) => logger.error(`[VideoRoom] ${label} failed:`, err);

    // Every inbound event is traced before its handler runs, so the console
    // shows the handshake as a sequence. Mirrors the server's own socket
    // tracing, which uses the same ← / → notation.
    const on = (event, handler) =>
      socket.on(event, (payload) => {
        logger.debug(`[socket] ← ${event}`, payload?.from ?? payload?.socketId ?? "");
        handler(payload);
      });

    // Joining on every "connect" covers the first connection and every
    // automatic reconnect alike. It used to be emitted once, inside the camera
    // callback, so a brief network drop left the user silently outside the room
    // while their screen still looked perfectly normal.
    socket.on(SOCKET_LIFECYCLE.CONNECT, () => {
      logger.info(`[socket] connected as ${socket.id}`);
      setRoomError(null);
      setConnected(true);
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomToken });
    });

    // A handshake refused by the server (no cookie, expired token) fires this
    // and nothing else — without it the room simply stayed blank with no
    // indication anywhere of why.
    socket.on(SOCKET_LIFECYCLE.CONNECT_ERROR, (err) =>
      logger.error(`[socket] connection refused: ${err.message}`)
    );

    socket.on(SOCKET_LIFECYCLE.DISCONNECT, (reason) => {
      logger.info(`[socket] disconnected (${reason})`);
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

    on(SOCKET_EVENTS.USER_JOINED, ({ socketId }) => mesh.offerTo(socketId).catch(guard("offer")));
    on(SOCKET_EVENTS.OFFER, ({ from, offer }) => mesh.acceptOffer(from, offer).catch(guard("answer")));
    on(SOCKET_EVENTS.ANSWER, ({ from, answer }) => mesh.acceptAnswer(from, answer).catch(guard("accept answer")));
    on(SOCKET_EVENTS.ICE_CANDIDATE, ({ from, candidate }) => mesh.addCandidate(from, candidate).catch(guard("candidate")));

    on(SOCKET_EVENTS.USER_LEFT, ({ socketId }) => {
      dropStream(socketId);
      mesh.removePeer(socketId);
    });

    // The sender's own message comes back from the server too, so everyone —
    // including whoever typed it — renders the same list in the same order. No
    // optimistic local copy, and therefore nothing to reconcile when the two
    // orders disagree.
    on(SOCKET_EVENTS.CHAT_MESSAGE, (message) => setMessages((prev) => [...prev, message]));
    on(SOCKET_EVENTS.CHAT_HISTORY, (history) => setMessages(Array.isArray(history) ? history : []));

    on(SOCKET_EVENTS.SESSION_ENDED, () => onEndRef.current?.());
    on(SOCKET_EVENTS.JOIN_ERROR, ({ message }) => {
      logger.warn(`[VideoRoom] join refused: ${message}`);
      setRoomError(message || "לא ניתן להצטרף למפגש");
    });
    on(SOCKET_EVENTS.SESSION_ERROR, ({ message }) => {
      logger.warn(`[VideoRoom] session error: ${message}`);
      setRoomError(message || "הפעולה נכשלה");
    });

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
          cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
          // Read from the stream that actually arrived, not from what was asked
          // for: getUserMedia can return audio-only when a camera is missing or
          // refused, and the controls have to describe what is really there.
          setHasMic(hasTrackKind(stream, "audio"));
          setHasCamera(hasTrackKind(stream, "video"));
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
      // Stopped separately: a screen capture is not part of localStream, and
      // leaving it running keeps the browser's "sharing your screen" banner up
      // after the user has left the room.
      screenTrackRef.current?.stop();
      localStreamRef.current = null;
      cameraTrackRef.current = null;
      screenTrackRef.current = null;
      socketRef.current = null;
      meshRef.current = null;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [roomToken]);

  // ── In-room controls ──────────────────────────────────────────────────────
  //
  // The rule itself lives in mediaToggles.js, where it can be tested without a
  // browser or a microphone. What is left here is the React half: keeping the
  // label in step with the tracks.
  //
  // null means there was nothing of that kind to toggle, and it is deliberately
  // not the same as false. Leaving the indicator alone in that case is the
  // point — the previous version returned early and left it reading "live" for a
  // user who had no microphone at all.
  const toggleMic = useCallback(() => {
    const next = toggleTrackKind(localStreamRef.current, "audio");
    if (next !== null) setMicOn(next);
  }, []);

  const toggleCamera = useCallback(() => {
    const next = toggleTrackKind(localStreamRef.current, "video");
    if (next !== null) setCameraOn(next);
  }, []);

  // The local tile shows whatever is being SENT, so it follows the share. Declared
  // before the two callbacks that use it — a const is not hoisted, and reaching
  // it from above is a runtime error rather than a lint nicety.
  const upsertLocalPreview = useCallback((stream) => {
    setStreams((prev) => prev.map((s) => (s.id === "local" ? { ...s, stream } : s)));
  }, []);

  const stopSharing = useCallback(async () => {
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    // Back to the camera on every peer. If there was never a camera — the user
    // joined with none — this replaces with null, which is a valid sender state
    // meaning "sending nothing".
    await meshRef.current?.replaceVideoTrack(cameraTrackRef.current ?? null);
    if (cameraTrackRef.current && localStreamRef.current) {
      upsertLocalPreview(localStreamRef.current);
    }
    setSharing(false);
  }, [upsertLocalPreview]);

  const shareScreen = useCallback(async () => {
    if (sharing) return stopSharing();
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError("הדפדפן הזה אינו תומך בשיתוף מסך.");
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      screenTrackRef.current = track;

      // The browser's own "stop sharing" control lives outside this page, so the
      // track ending is the only notice we get that the user used it. Without
      // this the button would still read "stop", and every peer would keep the
      // last frame.
      track.addEventListener("ended", () => { stopSharing(); });

      await meshRef.current?.replaceVideoTrack(track);
      upsertLocalPreview(display);
      setSharing(true);
    } catch (err) {
      // Cancelling the picker is a NotAllowedError, and it is not a failure —
      // the user simply changed their mind.
      if (err?.name !== "NotAllowedError") {
        logger.error("[VideoRoom] screen share failed:", err);
        setMediaError("לא ניתן לשתף מסך.");
      }
    }
  }, [sharing, stopSharing, upsertLocalPreview]);

  const sendMessage = useCallback((text) => {
    const body = String(text ?? "").trim();
    if (!body) return;
    socketRef.current?.emit(SOCKET_EVENTS.CHAT_MESSAGE, { text: body });
  }, []);

  // Only asks; the room closes when the server confirms with "session-ended".
  // Leaving immediately would have navigated a non-host away even though the
  // server refused their request and the session carried on without them.
  const endSession = useCallback(() => {
    logger.debug(`[socket] → ${SOCKET_EVENTS.END_SESSION}`);
    socketRef.current?.emit(SOCKET_EVENTS.END_SESSION, { roomToken });
  }, [roomToken]);

  const leave = useCallback(() => onEndRef.current?.(), []);

  return {
    streams, connected, mediaError, roomError, endSession, leave,
    micOn, cameraOn, hasMic, hasCamera, sharing, toggleMic, toggleCamera, shareScreen,
    messages, sendMessage,
  };
};
