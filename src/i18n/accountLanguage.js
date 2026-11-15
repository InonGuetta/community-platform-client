import { DEFAULT_LANGUAGE, isSupportedLanguage } from "./languages";

// What to do when a signed-in account meets the language this browser is in.
//
//   account — the account's users.locale
//   current — the language the interface is showing now
//   chosen  — a language someone picked in THIS browser (localStorage), or null
//
// The account wins — it is what the mail is written in and what every other
// device shows — with one exception: someone who picked a language before
// signing in, into an account still on the default. Throwing that choice away
// would switch a person who just chose French back to Hebrew the moment they
// signed in, so it is saved to the account instead.
//
// Returns { adopt: code } (show the account's language), { save: code } (store
// this browser's choice on the account), or null (already in step).
export const reconcileAccountLanguage = ({ account, current, chosen }) => {
  if (!isSupportedLanguage(account)) return null;
  if (isSupportedLanguage(chosen) && chosen !== account && account === DEFAULT_LANGUAGE) {
    return { save: chosen };
  }
  return account === current ? null : { adopt: account };
};
