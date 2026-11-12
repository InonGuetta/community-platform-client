import { useCallback, useEffect, useState } from "react";
import { canPromptInstall, subscribeInstall, promptInstall, isStandalone, isIos } from "../../../utilities/installPrompt";

// The menu's "התקנת האפליקציה" (PRD MOB-1): offered when the browser will
// install the app, or on iOS — where installing is done by hand and the item
// explains how — and not at all once the app is already running installed.
const useInstallPrompt = () => {
  const [available, setAvailable] = useState(canPromptInstall);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  useEffect(() => subscribeInstall(() => setAvailable(canPromptInstall())), []);

  const standalone = isStandalone();
  const ios = isIos();
  const offer = !standalone && (available || ios);

  const install = useCallback(async () => {
    if (canPromptInstall()) {
      await promptInstall();
      return;
    }
    if (ios) setIosHelpOpen(true);
  }, [ios]);

  return { offer, install, iosHelpOpen, closeIosHelp: () => setIosHelpOpen(false) };
};

export default useInstallPrompt;
