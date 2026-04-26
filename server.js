import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// ========================
// CONFIG
// ========================
let KAGGLE_API = null;
let isProcessing = false;
const queue = [];

// ========================
// HEALTH CHECK
// ========================
app.get("/", (req, res) => {
  res.send("Jarvis Backend Running");
});

// ========================
// UPDATE GPU URL
// ========================
app.post("/update-gpu", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  KAGGLE_API = url;
  console.log("✅ GPU updated:", KAGGLE_API);

  res.json({ status: "updated", url: KAGGLE_API });
});

// ========================
// PROCESS QUEUE
// ========================
async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;

  const { prompt, res } = queue.shift();

  try {
    console.log("🎬 Processing:", prompt);

    const response = await fetch(KAGGLE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      timeout: 120000
    });

    if (!response.ok) throw new Error("GPU failed");

    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "video/mp4");
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error("❌ Error:", err.message);

    res.status(500).json({
      error: "Generation failed",
      details: err.message
    });

  } finally {
    isProcessing = false;
    processQueue(); // process next
  }
}

// ========================
// GENERATE VIDEO
// ========================
app.post("/generate-video", (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt required" });
  }

  if (!KAGGLE_API) {
    return res.status(400).json({ error: "GPU not connected" });
  }

  // Add to queue
  queue.push({ prompt, res });

  console.log("📥 Added to queue:", prompt);

  processQueue();
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
