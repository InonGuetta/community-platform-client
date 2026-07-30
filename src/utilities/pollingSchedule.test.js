import { test, expect, describe } from "vitest";
import {
  nextPollDelay,
  hasExceededPollWindow,
  POLL_INITIAL_MS,
  POLL_MAX_MS,
  POLL_CEILING_MS,
} from "./pollingSchedule";

const series = (n) => Array.from({ length: n }, (_, i) => nextPollDelay(i));

describe("backoff", () => {
  test("the first check is as prompt as the old fixed interval", () => {
    expect(nextPollDelay(0)).toBe(POLL_INITIAL_MS);
    // A short clip transcribes in seconds and should feel immediate.
    expect(nextPollDelay(0) + nextPollDelay(1)).toBeLessThanOrEqual(11000);
  });

  test("the gap grows and then holds at the cap", () => {
    const delays = series(10);
    expect(delays.slice(0, 5)).toEqual([...delays.slice(0, 5)].sort((a, b) => a - b));
    expect(Math.max(...delays)).toBe(POLL_MAX_MS);
    expect(delays.indexOf(POLL_MAX_MS)).toBeLessThanOrEqual(6);
  });

  test("odd input cannot produce a runaway or a busy loop", () => {
    expect(nextPollDelay(-1)).toBe(POLL_INITIAL_MS);
    expect(nextPollDelay(9999)).toBe(POLL_MAX_MS);
    for (const attempt of [0, -5, 1, 50, 9999]) {
      expect(nextPollDelay(attempt)).toBeGreaterThan(0);
    }
  });

  test("a long job costs far fewer requests than the old fixed interval", () => {
    const hour = 60 * 60 * 1000;
    let elapsed = 0;
    let polls = 0;
    while (elapsed < hour) elapsed += nextPollDelay(polls++);

    expect(polls).toBeLessThan(hour / POLL_INITIAL_MS / 3);
  });
});

// The ceiling exists because a wedged worker leaves status='processing'
// permanently: Bull's job timeout wraps the processor's promise but cannot
// cancel it, so the worker's error handler — which writes status='error' —
// never runs, and nothing else will move that row.
describe("giving up", () => {
  const REALISTIC_WORST_CASE_MS = 60 * 60 * 1000; // a 3-hour lecture takes ~30-60 min

  test("the ceiling leaves generous room above a real transcription", () => {
    expect(POLL_CEILING_MS).toBeGreaterThanOrEqual(2 * REALISTIC_WORST_CASE_MS);
  });

  test("a job still running well past an hour keeps being watched", () => {
    expect(hasExceededPollWindow(0, 59 * 60 * 1000)).toBe(false);
    expect(hasExceededPollWindow(0, 119 * 60 * 1000)).toBe(false);
  });

  test("polling stops past the ceiling", () => {
    expect(hasExceededPollWindow(0, POLL_CEILING_MS + 1)).toBe(true);
  });

  test("it never gives up immediately", () => {
    expect(hasExceededPollWindow(Date.now())).toBe(false);
  });

  test("the ceiling stays under the queue's own job timeout", () => {
    expect(POLL_CEILING_MS).toBeLessThan(4 * 60 * 60 * 1000);
  });
});
