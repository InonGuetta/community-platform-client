// Reading a Server-Sent Events response from fetch — the "דיון עם AI" answer
// as it is written (POST /discussion/:id/messages/stream).
//
// EventSource would do this for free, but it can only GET and cannot send a
// body. So the stream is read by hand: events are separated by a blank line,
// and each has an `event:` name and a `data:` line of JSON. A chunk from the
// network can end mid-event — or mid-character, which is why the decoder runs
// with `stream: true` — so whatever follows the last blank line is kept for
// the next chunk.
//
//   stage  { stage }                     → onStage(stage) — "searching", "writing"
//   delta  { text }                      → onDelta(text)
//   done   { conversation, messages }    → the resolved value
//   error  { code, message }             → thrown, in axios's error shape
//
// The thrown shape is { response: { status, data } } so that rejectionOf in
// utilities/apiError.js reads it exactly as it reads an axios failure.

const parseEvent = (block) => {
  let name = "message";
  const data = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (data.length === 0) return null;
  try {
    return { name, data: JSON.parse(data.join("\n")) };
  } catch {
    return null;
  }
};

// What a stream that ends without saying how it ended is: a failed answer.
const unfinished = () => ({
  response: { status: 502, data: { code: "AI_ANSWER_FAILED", message: "The answer stream ended early" } },
});

export const readEventStream = async (body, onDelta, onStage) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    // CRLF-tolerant: the spec allows either line ending.
    buffer = buffer.replace(/\r\n/g, "\n");
    let cut;
    while ((cut = buffer.indexOf("\n\n")) !== -1) {
      const event = parseEvent(buffer.slice(0, cut));
      buffer = buffer.slice(cut + 2);
      if (!event) continue;
      if (event.name === "delta" && typeof event.data?.text === "string") onDelta?.(event.data.text);
      else if (event.name === "stage" && typeof event.data?.stage === "string") onStage?.(event.data.stage);
      else if (event.name === "done") return event.data;
      else if (event.name === "error") throw { response: { status: 502, data: event.data } };
    }
    if (done) throw unfinished();
  }
};
