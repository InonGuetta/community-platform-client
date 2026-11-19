import Box from "@mui/material/Box";
import PageHeader from "../../features/PageHeader/PageHeader";
import SectionCard from "../../features/SectionCard/SectionCard";
import DonateForm from "./DonateForm";
import PaymentStep from "./PaymentStep";
import DonationResult from "./DonationResult";
import MyDonations from "./MyDonations";
import { useDonatePageController } from "./useDonatePageController";
import { useTranslation } from "react-i18next";

// A donation, start to finish (PRD PAY-1), and the donor's history (PAY-2).
// See useDonatePageController for the three steps.
const DonatePage = () => {
  const { t } = useTranslation("donate");
  const c = useDonatePageController();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <PageHeader kicker={t("kicker")} title={t("title")} subtitle={t("intro")} align="center" />
      <SectionCard component="div" sx={{ maxWidth: 560, width: "100%", mb: 3 }}>
        {c.step === "amount" && <DonateForm onContinue={c.startPayment} starting={c.starting} error={c.error} />}
        {c.step === "pay" && (
          <PaymentStep
            intent={c.intent}
            mountPayment={c.mountPayment}
            onPay={c.pay}
            onBack={c.startOver}
            paying={c.paying}
            error={c.error}
          />
        )}
        {c.step === "done" && <DonationResult donation={c.result} onAgain={c.startOver} />}
      </SectionCard>
      <MyDonations history={c.history} />
    </Box>
  );
};

export default DonatePage;
