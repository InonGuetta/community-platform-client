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
  const mesh = createPeerMesh({
    createConnection: () => new FakePeerConnection(),
    emit: (event, payload) => emitted.push({ event, payload }),
    onStream: (id, stream) => received.push({ id, stream }),
    onPeerLost: (id) => lost.push(id),
  });
  if (withCamera) mesh.setLocalStream({ getTracks: () => [{ kind: "video" }, { kind: "audio" }] });
  return { mesh, emitted, received, lost, pcs: FakePeerConnection.instances };
};

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
