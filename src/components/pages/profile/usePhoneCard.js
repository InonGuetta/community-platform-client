import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { startPhoneVerification, verifyPhone } from "../../../store/slicesAndThunks/authSlice/authPost";
import { removePhone } from "../../../store/slicesAndThunks/authSlice/authDelete";
import { messageForError } from "../../../utilities/apiError";
import { CODE_LENGTH, CODE_TTL_MINUTES, RESEND_AFTER_SECONDS, codeDigits } from "../../../utilities/phone";
import i18n from "../../../i18n/i18n";

// The phone card on the account page (PRD AUTH-13): a number typed, a code sent
// to it by SMS, the code typed back — and the verified number changed or
// removed. The account's phone lives in the auth slice (fetchMe, sign-in, and
// every phone/* answer merged in), because the notification preferences read
// it too.
//
// A refusal is said where it happened: under the number (not a mobile, too many
// codes) or in the code dialog (wrong code, N attempts left, expired). Success
// is a toast (toasts:success.phone/*).
export const usePhoneCard = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const phone = user?.phone ?? null;
  const pendingExpiresAt = user?.phone_pending_expires_at ? Date.parse(user.phone_pending_expires_at) : 0;
  const [now, setNow] = useState(() => Date.now());
  // A number waiting for its code — only while that code is still good.
  const pending = user?.phone_pending && pendingExpiresAt > now ? user.phone_pending : null;

  // Typing a number: the first one, or a change of the verified one.
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState("");
  const [numberError, setNumberError] = useState(null);
  const [sending, setSending] = useState(false);

  // The code dialog — with the number it is about held here, so a code that
  // expires while the dialog is open still names the number and can be sent
  // again.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPhone, setDialogPhone] = useState(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  // A ref as well as state: the sixth digit and an Enter in the same moment
  // must not send the code twice — a wrong one would cost two attempts.
  const verifyingRef = useRef(false);

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  // When another code may be asked for: the server allows one a minute. Its
  // waiting code says when it was sent (expiry less the code's lifetime), so
  // the countdown survives a reload.
  const sentAt = pendingExpiresAt ? pendingExpiresAt - CODE_TTL_MINUTES * 60 * 1000 : 0;
  const resendAt = sentAt ? sentAt + RESEND_AFTER_SECONDS * 1000 : 0;
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  // A clock only while the dialog counts down…
  useEffect(() => {
    if (!dialogOpen || resendIn === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [dialogOpen, resendIn]);
  // …and one tick when the waiting code expires, to stop offering it.
  useEffect(() => {
    if (!pendingExpiresAt || pendingExpiresAt <= Date.now()) return undefined;
    const id = setTimeout(() => setNow(Date.now()), pendingExpiresAt - Date.now() + 50);
    return () => clearTimeout(id);
  }, [pendingExpiresAt]);

  const startEdit = () => {
    setEditing(true);
    setNumber("");
    setNumberError(null);
  };
  const cancelEdit = () => {
    setEditing(false);
    setNumberError(null);
  };

  const openDialog = (forPhone = pending) => {
    setDialogPhone(forPhone);
    setCode("");
    setCodeError(null);
    setNow(Date.now());
    setDialogOpen(true);
  };
  const closeDialog = () => {
    if (verifyingRef.current) return;
    setDialogOpen(false);
  };

  const sendTo = async (value, { fromDialog }) => {
    const report = fromDialog ? setCodeError : setNumberError;
    setSending(true);
    report(null);
    try {
      const state = await dispatch(startPhoneVerification(value)).unwrap();
      setNow(Date.now());
      setCode("");
      if (fromDialog) setDialogPhone(state.phone_pending ?? value);
      else openDialog(state.phone_pending ?? value);
      return true;
    } catch (rejection) {
      report(messageForError(rejection, i18n.t("profile:phone.sendFailed")));
      return false;
    } finally {
      setSending(false);
    }
  };

  const send = async (event) => {
    event?.preventDefault();
    if (!number.trim() || sending) return;
    await sendTo(number.trim(), { fromDialog: false });
  };

  const resend = async () => {
    if (!dialogPhone || resendIn > 0 || sending) return;
    await sendTo(dialogPhone, { fromDialog: true });
  };

  const verify = async (value = code) => {
    const digits = codeDigits(value);
    if (digits.length !== CODE_LENGTH || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    setCodeError(null);
    try {
      await dispatch(verifyPhone(digits)).unwrap();
      setDialogOpen(false);
      setEditing(false);
      setNumber("");
    } catch (rejection) {
      setCodeError(messageForError(rejection, i18n.t("profile:phone.dialog.verifyFailed")));
      setCode("");
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  };

  // Six digits typed or pasted are sent at once — a phone's "from Messages"
  // suggestion fills the field in one go.
  const changeCode = (value) => {
    const digits = codeDigits(value);
    setCode(digits);
    if (digits.length === CODE_LENGTH) verify(digits);
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await dispatch(removePhone()).unwrap();
      setConfirmRemove(false);
      setEditing(false);
    } catch {
      // The toast says it (toasts:failure.phone/remove); the dialog stays open.
    } finally {
      setRemoving(false);
    }
  };

  return {
    phone,
    pending,
    dialogPhone,
    editing,
    number,
    numberError,
    sending,
    dialogOpen,
    code,
    codeError,
    verifying,
    resendIn,
    confirmRemove,
    removing,
    setNumber,
    startEdit,
    cancelEdit,
    send,
    openDialog: () => openDialog(pending),
    closeDialog,
    resend,
    verify,
    changeCode,
    remove,
    askRemove: () => setConfirmRemove(true),
    cancelRemove: () => setConfirmRemove(false),
  };
};
