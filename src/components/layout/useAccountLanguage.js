import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../store/selectors/authSelectors";
import { saveLocale } from "../../store/slicesAndThunks/authSlice/authPut";
import { changeLanguage, readStoredLanguage } from "../../i18n/i18n";
import { reconcileAccountLanguage } from "../../i18n/accountLanguage";
import { useLanguage } from "../../i18n/useLanguage";

// The interface language and the signed-in account's users.locale, kept in step.
//
// src/i18n/ knows nothing of the store (imports.test.js), so the meeting point
// is here, in the shell: App runs useAccountLanguageSync once, and anything
// that lets a person pick a language uses useChooseLanguage.

// Whenever an account arrives — sign-in, registration, a reset, the "who am I"
// on load — the rule in reconcileAccountLanguage decides who wins.
export const useAccountLanguageSync = () => {
  const dispatch = useDispatch();
  const account = useSelector(selectUser)?.locale;
  const { language } = useLanguage();

  useEffect(() => {
    const action = reconcileAccountLanguage({ account, current: language, chosen: readStoredLanguage() });
    if (action?.adopt) void changeLanguage(action.adopt);
    if (action?.save) void dispatch(saveLocale(action.save));
    // Only the account's arrival or change decides — not every language switch,
    // which useChooseLanguage already saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, dispatch]);
};

// Picking a language: the interface switches at once, and a signed-in account
// remembers it. A failed save leaves the switch in place — the createApiThunk
// rejection already tells the person.
export const useChooseLanguage = () => {
  const dispatch = useDispatch();
  const signedIn = Boolean(useSelector(selectUser));
  return useCallback(
    async (code) => {
      await changeLanguage(code);
      if (signedIn) await dispatch(saveLocale(code));
    },
    [dispatch, signedIn]
  );
};
