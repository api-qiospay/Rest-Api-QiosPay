const axios = require("axios");

async function deepsek(question) {
  if (!question) throw new Error("Question is required");

  const response = await axios.post(
    "https://api.appzone.tech/v1/chat/completions",
    {
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: question }],
        },
      ],
      model: "deepseek-v3",
      isSubscribed: true,
    },
    {
      headers: {
        authorization: "Bearer az-chatai-key",
        "content-type": "application/json",
        "user-agent": "okhttp/4.9.2",
        "x-app-version": "3.0",
        "x-requested-with": "XMLHttpRequest",
        "x-user-id": "$RCAnonymousID:84947a7a4141450385bfd07a66c3b5c4",
      },
    }
  );

  let fullText = "";

  if (typeof response.data === "object") {
    // JSON langsung
    fullText = response.data.choices?.[0]?.message?.content || "";
  } else if (typeof response.data === "string") {
    // Streaming (SSE)
    const lines = response.data.split("\n\n").map((line) => line.substring(6));
    for (const line of lines) {
      if (line === "[DONE]") continue;
      try {
        const d = JSON.parse(line);
        fullText += d.choices[0].delta.content || "";
      } catch (e) {}
    }
  }

  return fullText.trim();
}

module.exports = {
  name: "DeepSeek",
  desc: "AI DeepSeek (default deepseek-v3) untuk percakapan",
  category: "Artificial Intelligence",
  path: "/ai/deepseek?question=",

  async run(req, res) {
    const { question } = req.query;

    if (!question) {
      return res.json({ status: false, error: "Parameter 'question' is required" });
    }

    try {
      const result = await deepsek(question);

      res.json({
        creator: "FR3-NEWERA",
        status: true,
        result: result,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message,
      });
    }
  },
};
