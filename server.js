import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔴 CHANGE THIS WHEN NGROK CHANGES
let KAGGLE_API = "https://curing-moustache-veal.ngrok-free.dev/generate";

// Health check
app.get("/", (req, res) => {
  res.send("Jarvis Backend Running");
});

// Video endpoint
app.post("/generate-video", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt required" });
  }

  try {
    console.log("Sending request to GPU...");

    const response = await fetch(KAGGLE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error("GPU failed");
    }

    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "video/mp4");
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Video generation failed",
      details: err.message
    });
  }
});

// 🔥 OPTIONAL: update Kaggle URL dynamically
app.post("/update-gpu", (req, res) => {
  KAGGLE_API = req.body.url;
  res.json({ status: "updated", new: KAGGLE_API });
});

app.listen(3000, () => console.log("Server running on port 3000"));
