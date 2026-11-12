import { createAsyncThunk } from "@reduxjs/toolkit";
import { rejectionOf } from "../utilities/apiError";

/**
 * A thunk that calls the API and, when the call fails, rejects with the error
 * every reducer and screen reads: `rejectionOf(err, fallbackMessage)` — the
 * server's `{ message, code }`, or the fallback message when it sent none — as
 * `action.payload`.
 *
 * Exactly what writing it out by hand does, and what most thunks here did:
 *
 *   createAsyncThunk(type, async (arg, { rejectWithValue }) => {
 *     try { return await …; }
 *     catch (err) { return rejectWithValue(rejectionOf(err, fallbackMessage)); }
 *   }, options)
 *
 * The payload creator gets the usual `(arg, thunkAPI)`, and everything it does
 * runs inside the try — so anything that must NOT become a rejection payload
 * (work before the request, a catch that does more than reject) is a plain
 * createAsyncThunk instead. `options` are createAsyncThunk's own (condition, …).
 *
 * @param {string} type                 the action type prefix, e.g. "likes/add"
 * @param {string} fallbackMessage      the message when the error carries none
 * @param {(arg: any, thunkAPI: any) => any} payloadCreator
 * @param {object} [options]
 */
export const createApiThunk = (type, fallbackMessage, payloadCreator, options) =>
  createAsyncThunk(
    type,
    async (arg, thunkAPI) => {
      try {
        return await payloadCreator(arg, thunkAPI);
      } catch (err) {
        return thunkAPI.rejectWithValue(rejectionOf(err, fallbackMessage));
      }
    },
    options
  );
