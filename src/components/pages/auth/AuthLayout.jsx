import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

const AuthLayout = ({ title, children }) => (
  <Box sx={{
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    px: 2,
    fontFamily: "system-ui, -apple-system, sans-serif",
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      background: "linear-gradient(120deg, rgba(245,235,220,0.72) 0%, rgba(245,235,220,0.62) 40%, rgba(245,235,220,0.8) 100%)",
      backdropFilter: "blur(1px)",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      background: "radial-gradient(circle at 85% 18%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 48%)",
    },
  }}>
    {/* Background image layer - zoomed out 20% */}
    <Box sx={{
      position: "absolute",
      top: "-12.5%",
      left: "-12.5%",
      right: "-12.5%",
      bottom: "-12.5%",
      backgroundImage: 'url("/images/entry_image.png")',
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      transform: "scale(0.8)",
      transformOrigin: "center center",
      zIndex: 0,
    }} />

    <Card sx={{
      position: "relative",
      zIndex: 2,
      maxWidth: 409,
      width: "100%",
      mx: 2,
      borderRadius: "34px",
      boxShadow: "0 22px 44px rgba(80, 54, 26, 0.15)",
      bgcolor: "rgba(255, 255, 255, 0.25)",
      backdropFilter: "blur(14px)",
      border: "1px solid rgba(255,255,255,0.55)",
      overflow: "visible",
    }}>
      {/* Top Notch Effect */}
      <Box sx={{
        position: "absolute",
        top: -1,
        left: "50%",
        transform: "translateX(-50%)",
        width: 108,
        height: 36,
        background: "rgba(244, 236, 224, 0.82)",
        borderRadius: "0 0 24px 24px",
        border: "1px solid rgba(255,255,255,0.45)",
        borderTop: "none",
        boxShadow: "inset 0 -5px 10px rgba(0,0,0,0.03)",
        zIndex: 1,
      }} />
  
      <CardContent sx={{ p: 4, pt: 6, position: "relative", zIndex: 2 }}>
        <Typography variant="h4" fontWeight={400} mb={4} textAlign="center" color="#424242">
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>

    <Typography variant="caption" sx={{ mt: 3, color: "#a0a0a0", zIndex: 2 }}>
      Required fields are implicit
    </Typography>
  </Box>
);

export default AuthLayout;
