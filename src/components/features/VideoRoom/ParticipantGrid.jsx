import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const ParticipantGrid = ({ streams }) => (
  <Box sx={{
    display: "grid",
    gridTemplateColumns: streams.length > 1 ? "repeat(2, 1fr)" : "1fr",
    gap: 1,
    width: "100%",
    height: "100%",
  }}>
    {streams.map(({ id, stream, label }) => (
      <Box key={id} sx={{ position: "relative", bgcolor: "grey.900", borderRadius: 1, overflow: "hidden" }}>
        <video
          autoPlay
          playsInline
          muted={id === "local"}
          ref={(el) => { if (el && stream) el.srcObject = stream; }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Typography sx={{ position: "absolute", bottom: 8, left: 8, color: "white", fontSize: 12, bgcolor: "rgba(0,0,0,0.5)", px: 1, borderRadius: 0.5 }}>
          {label || id}
        </Typography>
      </Box>
    ))}
  </Box>
);

export default ParticipantGrid;
