import { describe, test, expect } from "vitest";
import { createPeerMesh } from "./peerMesh";

// WebRTC cannot run here — there is no browser, no camera and no second peer.
// The mesh takes its connection factory and transport as arguments precisely so
// the parts that actually broke can be exercised without any of that.

class FakePeerConnection {
  static instances = [];
  constructor() {
    this.closed = false;
    this.tracks = [];
    this.transceivers = [];
    this.addedCandidates = [];
    this.remoteDescription = null;
    this.localDescription = null;
    this.connectionState = "new";
    FakePeerConnection.instances.push(this);
  }
  addTrack(track) { this.tracks.push(track); }
  addTransceiver(kind, opts) { this.transceivers.push({ kind, ...opts }); }
  async createOffer() { return { type: "offer", sdp: "offer-sdp" }; }
  async createAnswer() { return { type: "answer", sdp: "answer-sdp" }; }
  async setLocalDescription(d) { this.localDescription = d; }
  async setRemoteDescription(d) { this.remoteDescription = d; }
  async addIceCandidate(candidate) {
    if (!this.remoteDescription) throw new Error("InvalidStateError: no remote description");
    this.addedCandidates.push(candidate);
  }
  close() { this.closed = true; this.connectionState = "closed"; this.onconnectionstatechange?.(); }
}

const build = ({ withCamera = true } = {}) => {
  FakePeerConnection.instances = [];
  const emitted = [];
  const received = [];
  const lost = [];
  const logged = [];
  const mesh = createPeerMesh({
    createConnection: () => new FakePeerConnection(),
    emit: (event, payload) => emitted.push({ event, payload }),
    onStream: (id, stream) => received.push({ id, stream }),
    onPeerLost: (id) => lost.push(id),
    log: (message) => logged.push(message),
  });
  if (withCamera) mesh.setLocalStream({ getTracks: () => [{ kind: "video" }, { kind: "audio" }] });
  return { mesh, emitted, received, lost, logged, pcs: FakePeerConnection.instances };
};

// Did any line mention both the peer and the thing that happened to it?
const logMentions = (logged, ...fragments) =>
  logged.some((line) => fragments.every((f) => line.includes(f)));

describe("handshake", () => {
  test("offering attaches local media and sends the offer", async () => {
    const { mesh, emitted, pcs } = build();
    await mesh.offerTo("peerA");

    expect(pcs).toHaveLength(1);
    expect(pcs[0].tracks).toHaveLength(2);
    expect(pcs[0].localDescription.type).toBe("offer");
    expect(emitted[0]).toMatchObject({ event: "offer", payload: { to: "peerA" } });
  });

  test("the answer is applied to the same connection", async () => {
    const { mesh, pcs } = build();
    await mesh.offerTo("peerA");
    await mesh.acceptAnswer("peerA", { type: "answer", sdp: "answered" });

    expect(pcs).toHaveLength(1);
    expect(pcs[0].remoteDescription.sdp).toBe("answered");
  });

  test("an incoming offer is answered", async () => {
    const { mesh, emitted } = build();
    await mesh.acceptOffer("peerB", { type: "offer", sdp: "o" });
    expect(emitted.some((e) => e.event === "answer" && e.payload.to === "peerB")).toBe(true);
  });
});

// Candidates start flowing the moment a description is set, so they routinely
// arrive before the offer that gives them somewhere to land. They used to be
// dropped by an optional-chained lookup, or to throw against a peer with no
// remote description — the likeliest cause of connections that simply failed.
describe("ICE candidates arriving early", () => {
  test("are buffered rather than lost, then replayed in order", async () => {
    const { mesh, pcs } = build();
    await mesh.addCandidate("peerB", { candidate: "c1" });
    await mesh.addCandidate("peerB", { candidate: "c2" });
    expect(pcs[0].addedCandidates).toHaveLength(0);

    await mesh.acceptOffer("peerB", { type: "offer", sdp: "o" });
    expect(pcs[0].addedCandidates.map((c) => c.candidate)).toEqual(["c1", "c2"]);
  });

  test("later candidates apply immediately", async () => {
    const { mesh, pcs } = build();
    await mesh.acceptOffer("peerB", { type: "offer", sdp: "o" });
    await mesh.addCandidate("peerB", { candidate: "late" });
    expect(pcs[0].addedCandidates).toHaveLength(1);
  });

  test("one bad candidate does not abort the rest of the batch", async () => {
    const { mesh, pcs } = build();
    await mesh.addCandidate("peerC", { candidate: "bad" });
    await mesh.addCandidate("peerC", { candidate: "good" });

    const pc = pcs[0];
    const original = pc.addIceCandidate.bind(pc);
    let call = 0;
    pc.addIceCandidate = async (c) => {
      if (++call === 1) throw new Error("malformed");
      return original(c);
    };

    await mesh.acceptOffer("peerC", { type: "offer", sdp: "o" });
    expect(pc.addedCandidates.map((c) => c.candidate)).toEqual(["good"]);
  });
});

test("an offer for a peer we already have reuses the connection", async () => {
  const { mesh, pcs } = build();
  await mesh.offerTo("peerD");
  await mesh.acceptOffer("peerD", { type: "offer", sdp: "o" });

  // The old code built a second RTCPeerConnection and dropped the first into
  // the map unclosed, leaking it and its camera track for the page's lifetime.
  expect(pcs).toHaveLength(1);
  expect(pcs[0].closed).toBe(false);
  expect(mesh.peerCount()).toBe(1);
});

// Without receive-only transceivers the offer carries no media sections at all,
// so the other side answers with nothing and the tile stays black — a naive
// "join anyway" would have looked like it worked and shown nothing.
test("joining without a camera still declares intent to receive", async () => {
  const { mesh, pcs } = build({ withCamera: false });
  await mesh.offerTo("peerE");

  expect(pcs[0].tracks).toHaveLength(0);
  expect(pcs[0].transceivers).toEqual([
    { kind: "video", direction: "recvonly" },
    { kind: "audio", direction: "recvonly" },
  ]);
});

describe("teardown", () => {
  test("removing a peer closes and forgets it, without recursing", async () => {
    const { mesh, lost, pcs } = build();
    await mesh.offerTo("p1");
    mesh.removePeer("p1");

    expect(pcs[0].closed).toBe(true);
    expect(mesh.hasPeer("p1")).toBe(false);
    // close() fires onconnectionstatechange; the map lookup there is what stops
    // it looping back into removal.
    expect(lost).toEqual([]);
  });

  test("closeAll leaves nothing open or tracked", async () => {
    const { mesh, pcs } = build();
    await mesh.offerTo("p1");
    await mesh.offerTo("p2");
    mesh.closeAll();

    expect(pcs.every((pc) => pc.closed)).toBe(true);
    expect(mesh.peerCount()).toBe(0);
  });
});

describe("connection state", () => {
  test("'disconnected' does not drop the peer", async () => {
    const { mesh, lost, pcs } = build();
    await mesh.offerTo("p9");
    pcs[0].connectionState = "disconnected";
    pcs[0].onconnectionstatechange();
    // Routinely transient while ICE re-checks; dropping here would flicker
    // participants out of a working call.
    expect(lost).toEqual([]);
  });

  test("'failed' reports the peer as lost", async () => {
    const { mesh, lost, pcs } = build();
    await mesh.offerTo("p9");
    pcs[0].connectionState = "failed";
    pcs[0].onconnectionstatechange();
    expect(lost).toEqual(["p9"]);
  });
});

// A track can arrive carrying no stream. ParticipantGrid skips a tile whose
// stream is falsy, so passing that through produced a permanently black square
// with nothing logged anywhere — indistinguishable from a peer whose camera is
// simply off, which is the wrong diagnosis to be led to.
describe("a remote track with no stream", () => {
  test("does not reach onStream", async () => {
    const { mesh, received, logged, pcs } = build();
    await mesh.offerTo("pX");
    pcs[0].ontrack({ streams: [], track: { kind: "video" } });

    expect(received).toEqual([]);
    expect(logMentions(logged, "pX", "no stream")).toBe(true);
  });

  test("a track WITH a stream still does", async () => {
    const { mesh, received, pcs } = build();
    await mesh.offerTo("pY");
    const stream = { id: "remote" };
    pcs[0].ontrack({ streams: [stream], track: { kind: "video" } });

    expect(received).toEqual([{ id: "pY", stream }]);
  });
});

// The mesh used to be entirely silent, so a call that connected at the socket
// level and still showed a black tile left nothing to read. These assert the
// four things anyone diagnosing that actually asks for. Failures are the point:
// a rejected candidate used to be swallowed by a bare `catch {}`, which made
// "every candidate is failing" look exactly like "everything is fine".
describe("tracing", () => {
  test("the handshake and the connection state are traced per peer", async () => {
    const { mesh, logged, pcs } = build();
    await mesh.offerTo("p1");
    expect(logMentions(logged, "p1", "new connection")).toBe(true);
    expect(logMentions(logged, "p1", "offering")).toBe(true);

    await mesh.acceptAnswer("p1", { type: "answer", sdp: "a" });
    expect(logMentions(logged, "p1", "answer")).toBe(true);

    pcs[0].connectionState = "disconnected";
    pcs[0].onconnectionstatechange();
    // Not acted on — transient while ICE re-checks — but a "disconnected" that
    // never settles back is the signature of a call about to go quiet, and it
    // was the one state the handler deliberately ignored in silence.
    expect(logMentions(logged, "p1", "disconnected")).toBe(true);
  });

  test("buffered candidates are reported as a count, not one line each", async () => {
    const { mesh, logged } = build();
    for (let i = 0; i < 5; i++) await mesh.addCandidate("p2", { candidate: `c${i}` });
    // Bursts of dozens per peer: a line each would bury everything else.
    expect(logged.filter((l) => l.includes("candidate")).length).toBe(0);

    await mesh.acceptOffer("p2", { type: "offer", sdp: "o" });
    expect(logMentions(logged, "p2", "replayed 5")).toBe(true);
  });

  test("a rejected candidate is reported instead of swallowed", async () => {
    const { mesh, logged, pcs } = build();
    await mesh.acceptOffer("p3", { type: "offer", sdp: "o" });
    pcs[0].addIceCandidate = async () => { throw new Error("malformed candidate"); };

    await mesh.addCandidate("p3", { candidate: "bad" });
    expect(logMentions(logged, "p3", "malformed candidate")).toBe(true);
  });

  test("an answer for a peer that already left says so", async () => {
    const { mesh, logged } = build();
    await mesh.acceptAnswer("ghost", { type: "answer" });
    expect(logMentions(logged, "ghost", "untracked")).toBe(true);
  });
});

describe("stray signalling", () => {
  test("an answer for an unknown peer is ignored", async () => {
    const { mesh } = build();
    await mesh.acceptAnswer("ghost", { type: "answer" });
    expect(mesh.peerCount()).toBe(0);
  });

  test("removing an unknown peer is a no-op", () => {
    const { mesh } = build();
    expect(() => mesh.removePeer("ghost")).not.toThrow();
  });
});
