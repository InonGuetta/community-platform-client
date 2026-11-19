import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../store/selectors/authSelectors";
import { chooseLanguage, saveLocale } from "../../store/slicesAndThunks/authSlice/authPut";
import i18n, { changeLanguage, takeGuestChoice, whenLanguageReady } from "../../i18n/i18n";
import { reconcileAccountLanguage } from "../../i18n/accountLanguage";
import { captureError } from "../../utilities/monitoring";

// The interface language and the signed-in account's users.locale, kept in step.
//
// src/i18n/ knows nothing of the store (imports.test.js), so the meeting point
// is here, in the shell: App runs useAccountLanguageSync once, and anything
// that lets a person pick a language uses useChooseLanguage.

// Whenever an account arrives or its language changes — sign-in, registration,
// a reset, the "who am I" on load — the rule in reconcileAccountLanguage
// decides who wins. It waits for start-up to finish switching to the stored
// language first, so it compares against what is really on screen.
export const useAccountLanguageSync = () => {
  const dispatch = useDispatch();
  const account = useSelector(selectUser)?.locale;

  useEffect(() => {
    if (!account) return undefined;
    let cancelled = false;
    void whenLanguageReady().then(() => {
      if (cancelled) return;
      const action = reconcileAccountLanguage({ account, current: i18n.language, guestChoice: takeGuestChoice() });
      if (action?.save) void dispatch(saveLocale(action.save));
      if (action?.adopt) {
        changeLanguage(action.adopt).catch((err) => captureError(err, { tags: { area: "language" } }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [account, dispatch]);
};

// Picking a language. Everything it does — and the toast when the strings
// cannot be fetched or the account cannot be saved — is chooseLanguage's.
export const useChooseLanguage = () => {
  const dispatch = useDispatch();
  return useCallback((code) => dispatch(chooseLanguage(code)), [dispatch]);
};
