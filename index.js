const { Telegraf, Markup, session } = require("telegraf");
const { MongoClient } = require("mongodb");
const express = require("express");
const { v4: uuidv4 } = require("uuid");

const TOKEN = "7020781359:AAEi5tH3lOmM44tFaz7ZCiDOGxrd2jCQKq0";
const MONGODB_URI =
  "mongodb+srv://pobasuyi69:9UW3Yra6HZFUCT0B@cluster0.lum7yrw.mongodb.net/?retryWrites=true&w=majority";
const CHANNEL_NAME = "@hackersssd";
const ADMIN_IDS = [5958051599];
const SECRET_PATH = "bossman";

// Connect to MongoDB
const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect();

const db = client.db();

const usersCollection = db.collection("users");
const filesCollection = db.collection("files");
const contactsCollection = db.collection("contacts");

// Create a new instance of Telegraf
const bot = new Telegraf(TOKEN);
bot.use(session());

// Express server setup
const app = express();
const port = 3000;

app.get("/ping/:secretPath", (req, res) => {
  const { secretPath } = req.params;
  if (secretPath === SECRET_PATH) {
    res.status(200).send("Bot is running!");
  } else {
    res.status(403).send("Invalid secret path.");
  }
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});

// Function to add admins
function addAdmin(userId) {
  if (!ADMIN_IDS.includes(userId)) {
    ADMIN_IDS.push(userId);
  }
}

// Start command handler
bot.start(async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is subscribed to the channel
  const isSubscribed = await isUserSubscribed(userId);

  if (!isSubscribed) {
    // If not subscribed, inform the user and provide the referral link
    ctx.reply(
      `To use this bot, you must be subscribed to our channel: ${CHANNEL_NAME}\n\n` +
        "Click the link below to subscribe:\n" +
        `t.me/${CHANNEL_NAME}`,
    );
  } else {
    // Check if the user already exists in the database
    const user = await usersCollection.findOne({ userId: userId });

    if (!user) {
      // If the user is not in the database, register and provide the referral link
      const userUUID = uuidv4();
      usersCollection.insertOne({
        userId: userId,
        userUUID: userUUID,
        referrals: 0,
      });

      const referralLink = `https://t.me/${ctx.me}?start=${userUUID}`;
      ctx.reply(
        `Welcome! You have been registered for the referral program.\n\nYour referral link:\n${referralLink}`,
      );
    } else {
      // If the user is already registered, provide the referral link and count
      const referralLink = `https://t.me/${ctx.me}?start=${user.userUUID}`;
      ctx.reply(
        `Welcome back!\n\nYour referral link:\n${referralLink}\n\nYour current referral count: ${user.referrals}`,
      );
    }
  }
});

// Referral link command handler
bot.command("reflink", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is subscribed to the channel
  const isSubscribed = await isUserSubscribed(userId);
  if (!isSubscribed) {
    ctx.reply(
      `To get your referral link, you must be subscribed to our channel: ${CHANNEL_NAME}\n\n` +
        "Click the link below to subscribe:\n" +
        `t.me/${CHANNEL_NAME}`,
    );
    return;
  }

  // Retrieve the user's UUID from the database
  const user = await usersCollection.findOne({ userId: userId });
  if (user) {
    const referralLink = `https://t.me/${ctx.me}?start=${user.userUUID}`;
    ctx.reply(`Your referral link:\n${referralLink}`);
  } else {
    ctx.reply("An error occurred. Please try again.");
  }
});

// Referral count command handler
bot.command("refcount", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is subscribed to the channel
  const isSubscribed = await isUserSubscribed(userId);
  if (!isSubscribed) {
    ctx.reply(
      `To check your referral count, you must be subscribed to our channel: ${CHANNEL_NAME}\n\n` +
        "Click the link below to subscribe:\n" +
        `t.me/${CHANNEL_NAME}`,
    );
    return;
  }

  // Retrieve the user's referral count
  const user = await usersCollection.findOne({ userId: userId });
  if (user) {
    ctx.reply(`Your current referral count: ${user.referrals}`);
  } else {
    ctx.reply("An error occurred. Please try again.");
  }
});

// Get file command handler
bot.command("getfile", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is subscribed to the channel
  const isSubscribed = await isUserSubscribed(userId);
  if (!isSubscribed) {
    ctx.reply(
      `To get the file, you must be subscribed to our channel: ${CHANNEL_NAME}\n\n` +
        "Click the link below to subscribe:\n" +
        `t.me/${CHANNEL_NAME}`,
    );
    return;
  }

  ctx.reply(
    "Please enter the ID of the file you want to get. Example: /getfile <fileID>",
  );
});

// Handle file ID input from the user
bot.on("text", async (ctx) => {
  const userId = ctx.message.from.id;
  const text = ctx.message.text;

  if (text.startsWith("/getfile")) {
    // Extract the file ID from the command
    const fileId = text.split(" ")[1];

    // Retrieve the user's referral count
    const user = await usersCollection.findOne({ userId: userId });

    // Check if the user has referred enough users to access the file
    if (user && user.referrals >= specifiedReferrals) {
      // Retrieve the file from the database using the provided ID
      const file = await filesCollection.findOne({ fileId: fileId });

      if (file) {
        // Provide the file content or perform the desired action
        ctx.reply(`File content for ID ${fileId}:\n${file.content}`);
      } else {
        ctx.reply(`File with ID ${fileId} not found.`);
      }
    } else {
      ctx.reply("You have not referred enough users to access the file.");
    }
  }
});
// Set file command handler (for Admins)
bot.command("setfile", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin
  if (!isAdmin(userId)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  // Ask for the referral count required to access the file
  ctx.reply(
    "Enter the referral count required to access the file. Example: /setfile 10",
  );

  // Listen for the user's response with the referral count
  bot.on("text", async (ctx) => {
    const referralCount = parseInt(ctx.message.text);

    // Save the file with the specified referral count to the database
    const fileId = uuidv4();
    filesCollection.insertOne({
      fileId: fileId,
      referralCount: referralCount,
      content: "File content here",
    });

    ctx.reply(
      `File with ID ${fileId} has been set. Users need to refer ${referralCount} users to access it.`,
    );
  });
});

// Contact command handler
bot.command("contact", (ctx) => {
  ctx.reply(
    "For any inquiries or assistance, please contact us through the following channels:\n\n" +
      "Email: example@example.com\n" +
      "Telegram Support: @example_support",
  );
});

// Uptime command (for Admins)
bot.command("uptime", (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin
  if (!isAdmin(userId)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  // Get the bot's uptime
  const uptime = process.uptime();
  ctx.reply(`Bot uptime: ${formatUptime(uptime)}`);
});

// Alive command (for Admins)
bot.command("alive", (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin
  if (!isAdmin(userId)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  ctx.reply("Yes, I am alive!");
});

// Ping command (for Admins)
bot.command("ping", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin
  if (!isAdmin(userId)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  const start = new Date();
  ctx.reply("Pinging...").then((sentMessage) => {
    const end = new Date();
    const pingTime = end - start;
    sentMessage.edit(`Pong! Latency is ${pingTime}ms`);
  });
});

// Helper function to check if a user is subscribed to the channel
async function isUserSubscribed(userId) {
  try {
    const chatMember = await bot.telegram.getChatMember(CHANNEL_NAME, userId);
    return (
      chatMember.status === "member" || chatMember.status === "administrator"
    );
  } catch (error) {
    console.error(error);
    return false;
  }
}

// Helper function to check if a user is an admin
function isAdmin(userId, superadmin = false) {
  return superadmin ? ADMIN_IDS.includes(userId) : ADMIN_IDS.includes(userId);
}

// Helper function to format uptime
function formatUptime(uptime) {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Start the bot
bot.launch();

// Handle errors
bot.catch((err) => {
  console.error("Bot error", err);
});

// Close MongoDB connection when the bot is stopped
process.once("SIGINT", () => {
  client.close();
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  client.close();
  bot.stop("SIGTERM");
});
