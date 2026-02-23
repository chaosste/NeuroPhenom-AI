const express = require("express");
const path = require("path");

const app = express();
const distPath = path.join(__dirname, "dist");

// Serve static assets
app.use(express.static(distPath));

// SPA fallback (client-side routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`Serving dist on port ${port}`);
});
