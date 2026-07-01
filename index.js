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
    // 1. Increased limit to 20 to ensure we catch all 13 players in the response
    myUrl.searchParams.append("limit", 20);

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
    const totalPlayers = standings.length;

    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");

    let message = `🏆 *MPP - Le débrief du matin (${day}/${month})* 🏆\n\n`;
    message += "On fait les comptes. Voici l'état du classement ce matin :\n\n";

    standings.forEach((item, index) => {
      // 2. Filter: Only process if it's the top 3 (index 0, 1, 2) OR the last player
      const isTopThree = index < 3;
      const isLastPlayer = index === totalPlayers - 1 && totalPlayers > 3;

      if (!isTopThree && !isLastPlayer) {
        // If it's a middle player, skip them!
        return;
      }

      const user = item.user || {};
      const ranking = item.ranking || {};

      const name = user.firstName || user.username || "Inconnu";
      const rank = ranking.rank || "-";
      const points = ranking.points || 0;
      const exacts = ranking.exactForecasts || 0;
      const goods = ranking.goodForecasts || 0;

      let rankDisplay = "🚨";
      if (rank === 1) rankDisplay = "🥇";
      else if (rank === 2) rankDisplay = "🥈";
      else if (rank === 3) rankDisplay = "🥉";

      let statusComment = "";

      // 3. Apply the alarm emoji to the last player
      if (isLastPlayer) {
        statusComment = "🚨 *Lanterne rouge, alerte générale !*";
      } else if (rank === 1) {
        statusComment = "- 👑 *GOAT incontesté*";
      } else if (rank === 2) {
        statusComment = "- 👀 *Ça chauffe derrière !*";
      } else if (exacts >= 4) {
        statusComment = "- 🔮 *Une précision impressionnante !*";
      } else if (points < 1450) {
        statusComment = "- 📉 *Réveille-toi, c'est pas encore fini !*";
      }

      // Optional: Add a visual separator line before printing the last player
      if (isLastPlayer) {
        message += "\n";
      }

      message += `${rankDisplay} *${name}* : *${points} pts* (${goods}|${exacts}) ${statusComment}\n`;
    });

    message += "\n⚽ _Bonne chance pour les prochains pronos !_";

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
