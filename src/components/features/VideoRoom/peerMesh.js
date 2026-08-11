// The peer-to-peer bookkeeping for a room, deliberately free of React and of
// the browser's WebRTC globals: the connection factory and the signalling
// transport are both injected. That is what makes the parts of this feature
// that actually broke — candidate ordering, peer replacement, teardown —
// testable without a browser or a camera.

// `log` is injected like everything else here, and defaults to a no-op so the
// tests stay silent. What it buys: useVideoRoom traces the SIGNALLING — which
// messages crossed the socket — but the mesh's own state was invisible, and a
// call that connects at the socket level and still shows a black tile fails
// entirely inside this file. Which peers exist, whether a description landed,
// how many candidates were buffered and what the connection state settled on are
// the four things anyone diagnosing that asks for, and none of them could be
// answered without a breakpoint.
//
// Deliberately NOT per candidate: they arrive in bursts of dozens per peer, so a
// line each would bury the four events that matter. The buffered ones are
// reported as a count when they are replayed, and individually only when one is
// rejected — which is rare and worth seeing.
export const createPeerMesh = ({ createConnection, emit, onStream, onPeerLost, log = () => {} }) => {
  // socketId -> { pc, pending: RTCIceCandidate[], remoteReady: boolean }
  const peers = new Map();
  let localStream = null;

  const setLocalStream = (stream) => {
    localStream = stream;
  };

  const attachLocalMedia = (pc) => {
    if (localStream) {
      const tracks = localStream.getTracks();
      tracks.forEach((track) => pc.addTrack(track, localStream));
      log(`attached ${tracks.length} local track(s)`);
      return;
    }
    log("no local stream — adding receive-only transceivers");
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

    log(`${peerId}: new connection`);
    const pc = createConnection();
    const entry = { pc, pending: [], remoteReady: false };
    attachLocalMedia(pc);

    pc.ontrack = (event) => {
      // A track can arrive with no stream attached to it. ParticipantGrid skips
      // a tile whose stream is falsy, so passing it on produced a permanently
      // black square with nothing logged anywhere to say why — indistinguishable
      // from a peer whose camera is off.
      const stream = event.streams?.[0];
      if (!stream) {
        log(`${peerId}: ⚠ ${event.track?.kind ?? "unknown"} track arrived with no stream — ignoring`);
        return;
      }
      log(`${peerId}: ← remote ${event.track?.kind ?? "media"} track`);
      onStream(peerId, stream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) emit("ice-candidate", { to: peerId, candidate: event.candidate });
    };

    pc.onconnectionstatechange = () => {
      // Logged for EVERY state, including the ones that are not acted on.
      // "disconnected" not settling back to "connected" is the signature of a
      // call that is about to go quiet, and it was previously the one thing this
      // handler deliberately ignored — so it left no trace at all.
      log(`${peerId}: connection state → ${pc.connectionState}`);
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
  const flushPending = async (peerId, entry) => {
    const queued = entry.pending;
    entry.pending = [];
    if (queued.length === 0) return;

    let rejected = 0;
    for (const candidate of queued) {
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch (err) {
        // One malformed candidate must not abort the rest of the batch — but
        // swallowing it in silence is how a peer that never connects gives up
        // nothing to look at. Every candidate failing is a real diagnosis; the
        // old bare `catch {}` made it look identical to every one succeeding.
        rejected++;
        log(`${peerId}: ⚠ buffered candidate rejected — ${err?.message ?? err}`);
      }
    }
    log(`${peerId}: replayed ${queued.length} buffered candidate(s)${rejected ? `, ${rejected} rejected` : ""}`);
  };

  const acceptRemoteDescription = async (peerId, entry, description) => {
    await entry.pc.setRemoteDescription(description);
    entry.remoteReady = true;
    log(`${peerId}: remote ${description?.type ?? "description"} applied`);
    await flushPending(peerId, entry);
  };

  return {
    setLocalStream,

    // We are an existing member and someone new arrived: we make the offer.
    // Only existing members are notified, so both sides never offer at once.
    offerTo: async (peerId) => {
      const entry = ensurePeer(peerId);
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      log(`${peerId}: offering`);
      emit("offer", { to: peerId, offer });
    },

    acceptOffer: async (peerId, offer) => {
      const entry = ensurePeer(peerId);
      await acceptRemoteDescription(peerId, entry, offer);
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      emit("answer", { to: peerId, answer });
    },

    acceptAnswer: async (peerId, answer) => {
      const entry = peers.get(peerId);
      if (!entry) {
        // Not an error — a peer that left between our offer and their answer —
        // but silently discarding a description is worth a line when the
        // question being asked is "why did this tile never appear".
        log(`${peerId}: answer for an untracked peer — ignored`);
        return;
      }
      await acceptRemoteDescription(peerId, entry, answer);
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
      } catch (err) {
        // Not fatal to the connection, but see flushPending: a rejection that
        // leaves no trace is the same as no rejection when something is wrong.
        log(`${peerId}: ⚠ candidate rejected — ${err?.message ?? err}`);
      }
    },

    removePeer: (peerId) => {
      const entry = peers.get(peerId);
      if (!entry) return;
      log(`${peerId}: removed`);
      // Delete first: close() fires onconnectionstatechange, and the map lookup
      // there is what stops it looping back into removal.
      peers.delete(peerId);
      entry.pc.close();
    },

    closeAll: () => {
      if (peers.size > 0) log(`closing all ${peers.size} peer(s)`);
      for (const [peerId, entry] of [...peers]) {
        peers.delete(peerId);
        entry.pc.close();
      }
    },

    peerCount: () => peers.size,
    hasPeer: (peerId) => peers.has(peerId),
  };
};
