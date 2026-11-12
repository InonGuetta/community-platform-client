import { describe, it, expect, vi } from "vitest";
import {
  createAudioMix, createPartUploader, createRecorder, pickRecordingType, myRecordingStatus,
} from "./sessionRecorder";

// The recorder's three pieces, with every browser API replaced (PRD REC-1).

const fakeAudio = () => {
  const log = [];
  class FakeContext {
    createMediaStreamDestination() { return { stream: { id: "mix" } }; }
    createMediaStreamSource(stream) {
      return { connect: () => log.push(`+${stream.id}`), disconnect: () => log.push(`-${stream.id}`) };
    }
    close() { log.push("closed"); }
  }
  return { log, AudioContextCtor: FakeContext };
};
const stream = (id, audio = true) => ({ id, getAudioTracks: () => (audio ? [{}] : []) });

describe("the mix", () => {
  it("holds exactly the streams it is given, swapping one that changed and skipping one with no audio", () => {
    const { log, AudioContextCtor } = fakeAudio();
    const mix = createAudioMix({ AudioContextCtor });
    const host = stream("host");
    const a = stream("a");
    mix.sync([{ id: "local", stream: host }, { id: "a", stream: a }, { id: "b", stream: stream("b", false) }]);
    expect(mix.ids()).toEqual(["local", "a"]);

    // "a" withdrew; "c" agreed.
    mix.sync([{ id: "local", stream: host }, { id: "c", stream: stream("c") }]);
    expect(mix.ids()).toEqual(["local", "c"]);
    expect(log).toEqual(["+host", "+a", "-a", "+c"]);

    // "c" reconnected with a new stream under the same id.
    mix.sync([{ id: "local", stream: host }, { id: "c", stream: stream("c2") }]);
    expect(log.slice(-2)).toEqual(["-c", "+c2"]);

    mix.close();
    expect(mix.ids()).toEqual([]);
    expect(log.at(-1)).toBe("closed");
  });
});

describe("the uploader", () => {
  const blob = (text) => ({ size: text.length, text });

  it("sends parts in order, numbered from 0, retrying one that fails until it gets through", async () => {
    const sent = [];
    let failures = 2;
    const pending = [];
    const uploader = createPartUploader({
      upload: async (n, b) => {
        if (n === 1 && failures > 0) { failures -= 1; throw new Error("offline"); }
        sent.push([n, b.text]);
      },
      onPending: (left) => pending.push(left),
      sleep: async () => {},
    });
    uploader.push(blob("a"));
    uploader.push(blob("b"));
    uploader.push(blob("c"));
    uploader.push(blob("")); // an empty part is not a part
    const result = await uploader.drain();
    expect(sent).toEqual([[0, "a"], [1, "b"], [2, "c"]]);
    expect(result).toEqual({ sent: 3, left: 0, error: null });
    expect(pending.at(-1)).toBe(0);
  });

  it("stops at an answer retrying cannot change, and says what was left", async () => {
    const final = Object.assign(new Error("closed"), { response: { status: 409 } });
    const uploader = createPartUploader({
      upload: async (n) => { if (n === 1) throw final; },
      isFinal: (err) => err?.response?.status === 409,
      sleep: async () => {},
    });
    uploader.push(blob("a"));
    uploader.push(blob("b"));
    uploader.push(blob("c"));
    expect(await uploader.drain()).toEqual({ sent: 1, left: 2, error: final });
  });

  it("gives up on a part that still fails once the drain's time is up", async () => {
    const uploader = createPartUploader({
      upload: async () => { throw new Error("offline"); },
      sleep: async () => {},
    });
    uploader.push(blob("a"));
    const result = await uploader.drain(0);
    expect(result.left).toBe(1);
    expect(result.error.message).toBe("offline");
  });
});

describe("the recorder", () => {
  it("records the mix in timed parts and hands each over, the last one before it stops", async () => {
    const parts = [];
    let instance;
    class FakeRecorder {
      constructor(s, opts) { this.stream = s; this.opts = opts; this.state = "inactive"; instance = this; }
      start(timeslice) { this.timeslice = timeslice; this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable({ data: "last" }); this.onstop(); }
    }
    const rec = createRecorder({
      stream: { id: "mix" }, mimeType: "audio/webm;codecs=opus", onPart: (b) => parts.push(b),
      MediaRecorderCtor: FakeRecorder, timesliceMs: 10_000,
    });
    expect(instance.opts).toEqual({ mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 64_000 });
    expect(instance.timeslice).toBe(10_000);
    instance.ondataavailable({ data: "first" });
    await rec.stop();
    expect(parts).toEqual(["first", "last"]);
  });

  it("picks the first audio format the browser can record, or none", () => {
    expect(pickRecordingType({ isTypeSupported: (t) => t === "audio/mp4" })).toBe("audio/mp4");
    expect(pickRecordingType({ isTypeSupported: () => true })).toBe("audio/webm;codecs=opus");
    expect(pickRecordingType(undefined)).toBe(null);
  });
});

describe("who is recorded, as each participant sees it", () => {
  const state = { active: true, hostSocketId: "h", consented: ["h", "a"], declined: ["b"] };
  it.each([
    ["h", "host"], ["a", "recorded"], ["b", "declined"], ["c", "unanswered"],
  ])("%s is %s", (id, status) => expect(myRecordingStatus(state, id)).toBe(status));

  it("is nothing at all when the room is not being recorded", () => {
    expect(myRecordingStatus({ ...state, active: false }, "a")).toBe(null);
    expect(myRecordingStatus(state, null)).toBe(null);
  });
});

vi.restoreAllMocks();
