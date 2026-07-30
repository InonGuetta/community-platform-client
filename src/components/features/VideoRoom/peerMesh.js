// The peer-to-peer bookkeeping for a room, deliberately free of React and of
// the browser's WebRTC globals: the connection factory and the signalling
// transport are both injected. That is what makes the parts of this feature
// that actually broke — candidate ordering, peer replacement, teardown —
// testable without a browser or a camera.

export const createPeerMesh = ({ createConnection, emit, onStream, onPeerLost }) => {
  // socketId -> { pc, pending: RTCIceCandidate[], remoteReady: boolean }
  const peers = new Map();
  let localStream = null;

  const setLocalStream = (stream) => {
    localStream = stream;
  };

  const attachLocalMedia = (pc) => {
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      return;
    }
    // No camera or microphone — the user was denied, has no device, or it is
    // busy. Receive-only transceivers are what let them still watch and listen:
    // without them the offer carries no media sections at all, so the other
    // side would answer with nothing and the tile would stay black.
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });
  };

  // Reuses an existing connection rather than replacing it. The previous code
  // built a fresh RTCPeerConnection whenever an offer arrived, dropping the old
  // one into the map unclosed — a leaked connection holding a leaked camera
  // track for as long as the page lived.
  const ensurePeer = (peerId) => {
    const existing = peers.get(peerId);
    if (existing) return existing;

    const pc = createConnection();
    const entry = { pc, pending: [], remoteReady: false };
    attachLocalMedia(pc);

    pc.ontrack = (event) => onStream(peerId, event.streams[0]);

    pc.onicecandidate = (event) => {
      if (event.candidate) emit("ice-candidate", { to: peerId, candidate: event.candidate });
    };

    pc.onconnectionstatechange = () => {
      // "disconnected" is routinely transient while ICE re-checks, so only a
      // terminal state removes the tile. The map lookup guards against our own
      // close() re-entering here.
      if (["failed", "closed"].includes(pc.connectionState) && peers.has(peerId)) {
        onPeerLost(peerId);
      }
    };

    peers.set(peerId, entry);
    return entry;
  };

  // Candidates start flowing the moment a description is set, so they routinely
  // overtake the offer or answer that gives them somewhere to land. Anything
  // that arrives early is held and replayed, instead of being dropped by an
  // optional-chained lookup or throwing against a peer with no remote
  // description — which is how connections used to fail with nothing to show.
  const flushPending = async (entry) => {
    const queued = entry.pending;
    entry.pending = [];
    for (const candidate of queued) {
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch {
        // One malformed candidate must not abort the rest of the batch.
      }
    }
  };

  const acceptRemoteDescription = async (entry, description) => {
    await entry.pc.setRemoteDescription(description);
    entry.remoteReady = true;
    await flushPending(entry);
  };

  return {
    setLocalStream,

    // We are an existing member and someone new arrived: we make the offer.
    // Only existing members are notified, so both sides never offer at once.
    offerTo: async (peerId) => {
      const entry = ensurePeer(peerId);
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      emit("offer", { to: peerId, offer });
    },

    acceptOffer: async (peerId, offer) => {
      const entry = ensurePeer(peerId);
      await acceptRemoteDescription(entry, offer);
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      emit("answer", { to: peerId, answer });
    },

    acceptAnswer: async (peerId, answer) => {
      const entry = peers.get(peerId);
      if (!entry) return; // an answer for a peer we no longer track
      await acceptRemoteDescription(entry, answer);
    },

    addCandidate: async (peerId, candidate) => {
      // ensurePeer, not get: a candidate arriving before the offer is the
      // normal case, and it has to be kept.
      const entry = ensurePeer(peerId);
      if (!entry.remoteReady) {
        entry.pending.push(candidate);
        return;
      }
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch {
        // Ignore — a rejected candidate is not fatal to the connection.
      }
    },

    removePeer: (peerId) => {
      const entry = peers.get(peerId);
      if (!entry) return;
      // Delete first: close() fires onconnectionstatechange, and the map lookup
      // there is what stops it looping back into removal.
      peers.delete(peerId);
      entry.pc.close();
    },

    closeAll: () => {
      for (const [peerId, entry] of [...peers]) {
        peers.delete(peerId);
        entry.pc.close();
      }
    },

    peerCount: () => peers.size,
    hasPeer: (peerId) => peers.has(peerId),
  };
};
