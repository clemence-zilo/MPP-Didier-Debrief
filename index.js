import axios from "axios";

async function getMppRankings() {
  try {
    const baseUrl = process.env.MPP_API_URL?.trim();
    const challengeId = process.env.CHALLENGE_ID?.trim();
    const token = process.env.MPP_AUTH_TOKEN?.trim();

    if (!baseUrl || !challengeId) {
      throw new Error(
        "Missing MPP_API_URL or CHALLENGE_ID in environment variables.",
      );
    }

    const myUrl = new URL(baseUrl);
    myUrl.searchParams.append("challengeId", challengeId);
    myUrl.searchParams.append("offset", 0);
    myUrl.searchParams.append("limit", 3);

    console.log("✈️ Sending request to:", myUrl.toString());

    const response = await axios.get(myUrl.toString(), {
      headers: {
        Authorization: token,
        Origin: "https://mpp.football",
        Referer: "https://mpp.football/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
    });

    const standings = response.data.standings || [];
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");

    let message = `🏆 *MPP Leaderboard (${day}/${month})* 🏆\n\n`;

    standings.forEach((item) => {
      const user = item.user || {};
      const ranking = item.ranking || {};

      const name = user.firstName || user.username || "Unknown Player";
      const rank = ranking.rank || "-";
      const points = ranking.points || 0;
      const exacts = ranking.exactForecasts || 0;
      const goods = ranking.goodForecasts || 0;

      let rankDisplay = `${rank}.`;
      if (rank === 1) rankDisplay = "🥇";
      else if (rank === 2) rankDisplay = "🥈";
      else if (rank === 3) rankDisplay = "🥉";

      message += `${rankDisplay} *${name}* - *${points} pts* (${goods}|${exacts})\n`;
    });

    return message;
  } catch (error) {
    console.error("Detailed Error:", error.message);
    return "❌ Could not fetch MonPetitProno data today.";
  }
}

async function sendSlackMessage(text) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      throw new Error("Missing SLACK_WEBHOOK_URL in environment variables.");
    }

    await axios.post(webhookUrl, { text: text });
    console.log("🚀 Update successfully transmitted to your Slack DM!");
  } catch (error) {
    console.error("Error pushing to Slack:", error.message);
  }
}

async function run() {
  const report = await getMppRankings();
  await sendSlackMessage(report);
}

run();
