const { Telegraf, Markup, session } = require("telegraf");
const { MongoClient } = require("mongodb");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const fs = require('fs');

const filePath = './file.txt';
const TOKEN = "7068252272:AAEmmyT78tq3WcbalMwR2fD2Dlhjr1h7XNM";
const MONGODB_URI =
  "mongodb+srv://uploader2:uploader2@uploader2.uhnmx1u.mongodb.net/?retryWrites=true&w=majority&appName=uploader2";
const CHANNEL_NAME = "obasuyi4";
const ADMIN_IDS = [6341138384];

const msgId = 6341138384; 

const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect();

const db = client.db();

const usersCollection = db.collection("users");
const filesCollection = db.collection("files");
const contactsCollection = db.collection("contacts");

const bot = new Telegraf(TOKEN);
bot.use(session());

const app = express();
const port = 3099;

app.get("/", (req, res) => {
  res.status(200).send(" bossman's Bot is running!");
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});

bot.start(async (ctx) => {
  const userId = ctx.message.from.id;
  const isSubscribed = await isUserSubscribed(userId);
  const username = ctx.message.from.username;
  const referralStart = ctx.message.text.split(' ')[1];

  if (!isSubscribed) {
    ctx.reply(
      `Hello, ${username}!, To use this bot, you must be subscribed to our channel: @${CHANNEL_NAME}\n\n` +
      "Click the link below to subscribe:\n" +
      `t.me/${CHANNEL_NAME}`,
    );
  } else {
    const user = await usersCollection.findOne({ userId: userId });

    if (!user) {
      const userUUID = uuidv4();
      usersCollection.insertOne({
        userId: userId,
        userUUID: userUUID,
        referrals: 0,
      });

      const referralLink = `https://t.me/${ctx.botInfo.username}?start=${userUUID}`;
      ctx.reply(
        `Welcome ${username}!, You have been registered for the referral program.\n\nYour referral link:\n${referralLink}`,
      );
    } else {
      if (referralStart && referralStart !== user.userUUID) {
        await updateReferralCount(referralStart);
        const adminMessage = `🎉 Success! User ${username} (${userId}) referred a new user. Referral count: ${user.referrals + 1}`;
        await ctx.telegram.sendMessage(msgId, adminMessage);
      }

      const referralLink = `https://t.me/${ctx.botInfo.username}?start=${user.userUUID}`;
      ctx.reply(
        `Welcome back ${username}!\n\nYour referral link:\n${referralLink}\n\nYour current referral count: ${user.referrals}`,
      );
    }
  }
});

bot.command("reflink", async (ctx) => {
  const userId = ctx.message.from.id;
  const isSubscribed = await isUserSubscribed(userId);

  if (!isSubscribed) {
    ctx.reply(
      `To get your referral link, you must be subscribed to our channel\n\n` +
      "Click the link below to subscribe:\n" +
      `${CHANNEL_NAME}`,
    );
    return;
  }
  const user = await usersCollection.findOne({ userId: userId });
  if (user) {
    const referralLink = `https://t.me/${ctx.botInfo.username}?start=${user.userUUID}`;
    ctx.reply(`Your referral link:\n${referralLink}`);
  } else {
    ctx.reply("An error occurred. Please try again.");
  }
});

bot.command("getfile", async (ctx) => {
  const userId = ctx.message.from.id;
  const isSubscribed = await isUserSubscribed(userId);

  if (!isSubscribed) {
    ctx.reply(
      `To get the file, you must be subscribed to our channel: ${CHANNEL_NAME}\n\n` +
      "Click the link below to subscribe:\n" +
      `t.me/${CHANNEL_NAME}`,
    );
    return;
  }

  const user = await usersCollection.findOne({ userId: userId });

  if (user && user.referrals >= 1) {
    const fileContent = readFileContent(filePath);

    if (fileContent !== null) {
      ctx.reply(fileContent);
    } else {
      ctx.reply("Error reading file content.");
    }
  } else {
    ctx.reply("You have not referred enough users to access the file.");
  }
});

bot.command("refcount", async (ctx) => {
  const userId = ctx.message.from.id;
  const isSubscribed = await isUserSubscribed(userId);
  const username = ctx.message.from.username;

  if (!isSubscribed) {
    ctx.reply(
      `To check your referral count, you must be subscribed to our channel: ${CHANNEL_NAME}\n\n` +
      "Click the link below to subscribe:\n" +
      `t.me/${CHANNEL_NAME}`,
    );
    return;
  }

  const user = await usersCollection.findOne({ userId: userId });
  if (user) {
    ctx.reply(
      `hey ${username}!\nYour current referral count: ${user.referrals}`,
    );
  } else {
    ctx.reply("An error occurred. Please try again.");
  }
});

bot.launch();
bot.catch((err) => {
  console.error("Bot error", err);
});

process.once("SIGINT", () => {
  client.close();
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  client.close();
  bot.stop("SIGTERM");
});

async function updateReferralCount(userId, incrementBy = 1) {
  await usersCollection.updateOne(
    { userId: userId },
    { $inc: { referrals: incrementBy } }
  );
}

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

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    return null;
  }
}
