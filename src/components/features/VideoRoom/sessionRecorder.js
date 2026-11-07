// Recording a session in the host's browser (PRD REC-1).
//
// The mesh sends media peer to peer, so the server never has it: the host's
// browser is the only place a session can be recorded. Three pieces, each
// testable without a browser — every browser API is passed in:
//
//   createAudioMix      one audio stream made of several: the host's own mic
//                       and the peers who agreed to be recorded. `sync(list)`
//                       makes the mix exactly that list, so a peer who
//                       withdraws is out of it from that moment.
//   createPartUploader  numbered parts, sent one at a time in order, each
//                       retried until it gets through — a dropped connection
//                       delays the parts, it does not lose them. The server
//                       answers a resent number by replacing it, so retrying
//                       after an answer that never arrived is safe.
//   createRecorder      MediaRecorder over the mix, cut into parts of
//                       `timesliceMs`, each handed to the uploader.
//
// Audio only, by design: the transcription pipeline needs audio, it is what
// every participant agreed to, and an hour of it is a few tens of megabytes.

// Ten seconds: small enough that a tab closing mid-session loses at most that
// much, large enough that an hour is a few hundred requests.
export const PART_MS = 10_000;

// What the browser can record, best first. Opus in WebM (Chrome, Firefox,
// Edge), Opus in Ogg, then AAC in MP4 (Safari). Each is accepted by the server.
const CANDIDATE_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

export const pickRecordingType = (MediaRecorderCtor = globalThis.MediaRecorder) => {
  if (typeof MediaRecorderCtor?.isTypeSupported !== "function") return null;
  return CANDIDATE_TYPES.find((type) => MediaRecorderCtor.isTypeSupported(type)) ?? null;
};

/**
 * @param {{ AudioContextCtor?: any }} [deps]
 */
export const createAudioMix = ({ AudioContextCtor = globalThis.AudioContext } = {}) => {
  const context = new AudioContextCtor();
  const destination = context.createMediaStreamDestination();
  const sources = new Map(); // id → { stream, node }

  const add = (id, stream) => {
    if (!stream || sources.has(id)) return;
    // A stream with no audio (a peer with no microphone) cannot be a source;
    // there is nothing of them to record.
    if (!stream.getAudioTracks?.().length) return;
    const node = context.createMediaStreamSource(stream);
    node.connect(destination);
    sources.set(id, { stream, node });
  };

  const remove = (id) => {
    const source = sources.get(id);
    if (!source) return;
    source.node.disconnect();
    sources.delete(id);
  };

  return {
    stream: destination.stream,
    /**
     * Make the mix exactly these: [{ id, stream }]. A stream that changed under
     * the same id (a peer who reconnected) is swapped.
     */
    sync(list) {
      const wanted = new Map(list.filter((s) => s.stream).map((s) => [s.id, s.stream]));
      for (const [id, { stream }] of sources) {
        if (wanted.get(id) !== stream) remove(id);
      }
      for (const [id, stream] of wanted) add(id, stream);
    },
    ids: () => [...sources.keys()],
    close() {
      for (const id of [...sources.keys()]) remove(id);
      context.close?.();
    },
  };
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {object} args
 * @param {(n: number, blob: Blob) => Promise<void>} args.upload
 * @param {(pending: number) => void} [args.onPending]  how many are not through yet
 * @param {number[]} [args.retryDelays]  ms between attempts; the last repeats
 * @param {(ms: number) => Promise<void>} [args.sleep]
 * @param {(err: any) => boolean} [args.isFinal]  an error that retrying cannot fix
 */
export const createPartUploader = ({
  upload, onPending = () => {}, retryDelays = [1000, 2000, 5000, 10000], sleep = defaultSleep,
  isFinal = () => false,
}) => {
  const queue = [];
  let next = 0;
  let running = null;
  let giveUpAt = Infinity;
  let failure = null;

  const run = async () => {
    while (queue.length > 0 && !failure) {
      const { n, blob } = queue[0];
      for (let attempt = 0; ; attempt += 1) {
        try {
          await upload(n, blob);
          break;
        } catch (err) {
          if (isFinal(err)) {
            failure = err;
            return;
          }
          if (Date.now() >= giveUpAt) {
            failure = err;
            return;
          }
          await sleep(retryDelays[Math.min(attempt, retryDelays.length - 1)]);
        }
      }
      queue.shift();
      onPending(queue.length);
    }
  };

  const kick = () => {
    if (!running) running = run().finally(() => { running = null; });
    return running;
  };

  return {
    push(blob) {
      if (!blob || blob.size === 0 || failure) return;
      queue.push({ n: next, blob });
      next += 1;
      onPending(queue.length);
      kick();
    },
    /**
     * Wait until every part is through — or `withinMs` has passed, after which
     * a part that still fails is given up on. Resolves { sent, left, error }.
     */
    async drain(withinMs = 60_000) {
      giveUpAt = Date.now() + withinMs;
      while (queue.length > 0 && !failure) await kick();
      return { sent: next - queue.length, left: queue.length, error: failure };
    },
    pending: () => queue.length,
  };
};

/**
 * @param {object} args
 * @param {MediaStream} args.stream  the mix
 * @param {string} args.mimeType
 * @param {(blob: Blob) => void} args.onPart
 * @param {any} [args.MediaRecorderCtor]
 * @param {number} [args.timesliceMs]
 */
// Speech, not music: 64 kbps Opus is clear for a voice and about 29 MB an
// hour. Left to itself Chrome chose ~124 kbps for the mix (measured live).
export const AUDIO_BITS_PER_SECOND = 64_000;

export const createRecorder = ({ stream, mimeType, onPart, MediaRecorderCtor = globalThis.MediaRecorder, timesliceMs = PART_MS }) => {
  const recorder = new MediaRecorderCtor(stream, { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
  recorder.ondataavailable = (event) => onPart(event.data);
  recorder.start(timesliceMs);
  return {
    // Resolves once the last part has been handed over — MediaRecorder delivers
    // it in a final dataavailable before "stop".
    stop: () => new Promise((resolve) => {
      if (recorder.state === "inactive") return resolve(undefined);
      recorder.onstop = () => resolve(undefined);
      recorder.stop();
    }),
  };
};

/**
 * Who in the room is recorded, as this participant sees it.
 * @param {{ active: boolean, hostSocketId: string|null, consented: string[], declined: string[] }} state
 * @param {string|null} mySocketId
 * @returns {"host"|"recorded"|"declined"|"unanswered"|null}  null when nothing is being recorded
 */
export const myRecordingStatus = (state, mySocketId) => {
  if (!state?.active || !mySocketId) return null;
  if (state.hostSocketId === mySocketId) return "host";
  if (state.consented.includes(mySocketId)) return "recorded";
  if (state.declined.includes(mySocketId)) return "declined";
  return "unanswered";
};
