// Mirror of the server's sockets/socketEvents.js. Both files describe the same
// protocol and must be edited together.
//
// They are duplicated rather than shared because the two halves of this project
// are separate npm packages with separate builds — there is no module either one
// could import from the other. The duplication is deliberate and bounded: it is
// a list of strings with no logic, so the only way it can go wrong is drift, and
// drift is exactly what a named constant makes visible (a rename here fails to
// resolve at build time instead of producing a listener that never fires).
export const SOCKET_EVENTS = {
  // Client → server
  JOIN_ROOM: "join-room",
  LEAVE_ROOM: "leave-room",
  END_SESSION: "end-session",

  // Chat, which travels over the signalling socket rather than the peer mesh —
  // see the server's copy for why.
  CHAT_MESSAGE: "chat-message",

  // Server → client
  USER_JOINED: "user-joined",
  USER_LEFT: "user-left",
  SESSION_ENDED: "session-ended",
  JOIN_ERROR: "join-error",
  SESSION_ERROR: "session-error",
  CHAT_HISTORY: "chat-history",

  // WebRTC signalling, relayed in both directions
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
};

// Built-in socket.io lifecycle events.
export const SOCKET_LIFECYCLE = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
};
