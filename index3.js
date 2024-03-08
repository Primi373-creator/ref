/*const TOKEN = "7020781359:AAEi5tH3lOmM44tFaz7ZCiDOGxrd2jCQKq0";
const MONGODB_URI =
  "mongodb+srv://pobasuyi69:9UW3Yra6HZFUCT0B@cluster0.lum7yrw.mongodb.net/?retryWrites=true&w=majority";
const CHANNEL_NAME = "@hackersssd";
const ADMIN_IDS = [6551258524];*/
const { Telegraf, session } = require("telegraf");
const { MongoClient } = require("mongodb");
const express = require("express");
const { v4: uuidv4 } = require("uuid");

const TOKEN = "7020781359:AAEi5tH3lOmM44tFaz7ZCiDOGxrd2jCQKq0";
const MONGODB_URI =
  "mongodb+srv://pobasuyi69:9UW3Yra6HZFUCT0B@cluster0.lum7yrw.mongodb.net/?retryWrites=true&w=majority";
const CHANNEL_NAME = "@hackersssd";
const ADMIN_IDS = [6551258524];
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
    ctx.reply("To use this bot, you must be subscribed to our channel.");
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
      "To get your referral link, you must be subscribed to our channel.",
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
      "To check your referral count, you must be subscribed to our channel.",
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
bot.command("getfile", (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is subscribed to the channel
  isUserSubscribed(userId).then((isSubscribed) => {
    if (!isSubscribed) {
      ctx.reply("To get the file, you must be subscribed to our channel.");
    } else {
      ctx.reply("Please enter the file ID:");
    }
  });
});

// Handle file ID input from the user
bot.hears("Cancel", (ctx) => {
  ctx.reply("Operation canceled.");
});

bot.on("text", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is subscribed to the channel
  const isSubscribed = await isUserSubscribed(userId);
  if (!isSubscribed) {
    ctx.reply("To get the file, you must be subscribed to our channel.");
    return;
  }

  const fileId = ctx.message.text;

  // Retrieve the file from the database using the given ID
  const file = await filesCollection.findOne({ fileId: fileId });

  if (file) {
    ctx.reply(`File content:\n${file.content || "No content available."}`);
  } else {
    ctx.reply("File not found. Please check the ID and try again.");
  }
});

// Contact command handler
bot.command("contact", (ctx) => {
  ctx.reply(
    "For any inquiries or assistance, please contact us through the following channels:\n\n" +
      "Email: example@example.com\n" +
      "Telegram Support: @example_support",
  );
});

// Update contact command handler (for admins)
bot.command("updatecontact", (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin
  if (!isAdmin(userId)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  ctx.session.updateContact = true;
  ctx.reply("Please send the updated contact information.");
});

// Handle received text message for updating contact (for admins)
bot.on("text", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin and has a pending updateContact operation
  if (isAdmin(userId) && ctx.session.updateContact) {
    const updatedContactInfo = ctx.message.text;

    // Save the updated contact information with a unique ID
    const contactId = uuidv4();
    contactsCollection.insertOne({
      contactId: contactId,
      content: updatedContactInfo,
    });

    ctx.reply(`Contact information updated successfully with ID: ${contactId}`);
    ctx.session.updateContact = false;
  }
});

// Add admin command handler (for superadmins)
bot.command("addadmin", (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is a superadmin
  if (!isAdmin(userId, true)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  ctx.reply("Please enter the username or ID of the admin to be added:");
});

// Handle received text message for adding admin (for superadmins)
bot.on("text", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is a superadmin and has a pending addAdmin operation
  if (isAdmin(userId, true) && ctx.session.addAdmin) {
    const adminIdOrUsername = ctx.message.text;

    // Check if the provided ID or username is valid
    const adminUser = await bot.telegram.getChatMember(
      CHANNEL_NAME,
      adminIdOrUsername,
    );
    if (adminUser) {
      // Add the admin to the list
      addAdmin(adminUser.user.id);
      ctx.reply(
        `Admin ${adminUser.user.username || adminUser.user.id} added successfully.`,
      );
    } else {
      ctx.reply("Invalid admin ID or username. Please try again.");
    }

    ctx.session.addAdmin = false;
  }
});

// Uptime command handler (for admins)
bot.command("uptime", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin
  if (!isAdmin(userId)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  // Get the bot's uptime
  const uptime = process.uptime();
  const formattedUptime = formatUptime(uptime);

  ctx.reply(`Bot uptime: ${formattedUptime}`);
});

// Alive command handler (for admins)
bot.command("alive", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin
  if (!isAdmin(userId)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  ctx.reply("I am alive and kicking!");
});

// Ping command handler (for admins)
bot.command("ping", async (ctx) => {
  const userId = ctx.message.from.id;

  // Check if the user is an admin
  if (!isAdmin(userId)) {
    ctx.reply("You are not authorized to use this command.");
    return;
  }

  const startTime = Date.now();
  ctx.reply("Pinging...").then((sentMessage) => {
    const endTime = Date.now();
    const pingTime = endTime - startTime;
    ctx.telegram.editMessageText(
      sentMessage.chat.id,
      sentMessage.message_id,
      undefined,
      `Pong! Response time: ${pingTime} ms`,
    );
  });
});

// Helper function to check if a user is an admin
function isAdmin(userId, isSuperadmin = false) {
  return isSuperadmin ? ADMIN_IDS.includes(userId) : false;
}

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

// Helper function to format uptime in a human-readable format
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
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
