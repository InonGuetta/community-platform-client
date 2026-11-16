import { isSupportedLanguage } from "./languages";

// What to do when a signed-in account meets the language this browser shows.
//
//   account     — the account's users.locale
//   current     — the language the interface is showing now
//   guestChoice — a language picked in this tab while signed OUT, right before
//                 this sign-in (takeGuestChoice: consumed once), or null
//
// The account wins — it is what the mail is written in and what every other
// device shows — except over a choice the person made just before signing in:
// throwing that away would switch someone who picked French back to Hebrew the
// moment they signed in, so it is saved to the account instead.
//
// Nothing here treats Hebrew as "never chose": an account on Hebrew is an
// account on Hebrew, and only a guest choice made in this very visit moves it.
//
// Returns { save: code } (store the guest's choice on the account),
// { adopt: code } (show the account's language), or null (already in step).
export const reconcileAccountLanguage = ({ account, current, guestChoice }) => {
  if (!isSupportedLanguage(account)) return null;
  if (isSupportedLanguage(guestChoice) && guestChoice !== account) return { save: guestChoice };
  return account === current ? null : { adopt: account };
};
