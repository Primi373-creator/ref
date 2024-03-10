const { Telegraf, Markup, session } = require("telegraf");
const { MongoClient } = require("mongodb");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const fs = require('fs');
const filePath = './file.txt';
const TOKEN = "7068252272:AAEmmyT78tq3WcbalMwR2fD2Dlhjr1h7XNM";
const MONGODB_URI =
  "mongodb+srv://uploader2:uploader2@uploader2.uhnmx1u.mongodb.net/?retryWrites=true&w=majority&appName=uploader2";
const CHANNEL_NAME = "@obasuyi4";
const ADMIN_IDS = [5958051599];
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
const port = 3760;
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
  if (!isSubscribed) {
    ctx.reply(
      `Hello, ${username}!, To use this bot, you must be subscribed to our channel: ${CHANNEL_NAME}\n\n` +
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

      const referralLink = `https://t.me/${ctx.me}?start=${userUUID}`;
      ctx.reply(
        `Welcome ${username}!, You have been registered for the referral program.\n\nYour referral link:\n${referralLink}`,
      );
    } else {
      const referralLink = `https://t.me/${ctx.me}?start=${user.userUUID}`;
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
    const referralLink = `https://t.me/${ctx.me}?start=${user.userUUID}`;
    ctx.reply(`Your referral link:\n${referralLink}`);
  } else {
    ctx.reply("An error occurred. Please try again.");
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
 
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    return null;
  }
}

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
/*bot.command("getfile", async (ctx) => {
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
  ctx.reply(
    "Please enter the ID of the file you want to get. Example: /getfile <fileID>",
  );
});
bot.on("text", async (ctx) => {
  const userId = ctx.message.from.id;
  const text = ctx.message.text;
  if (text.startsWith("/getfile")) {
    const fileId = text.split(" ")[1];
    const user = await usersCollection.findOne({ userId: userId });
    if (user && user.referrals >= specifiedReferrals) {
      const file = await filesCollection.findOne({ fileId: fileId });
      if (file) {
        ctx.reply(`File content for ID ${fileId}:\n${file.content}`);
      } else {
        ctx.reply(`File with ID ${fileId} not found.`);
      }
    } else {
      ctx.reply("You have not referred enough users to access the file.");
    }
  }
});
bot.command("setfile", async (ctx) => {
  const userId = ctx.message.from.id;
  const username = ctx.message.from.username;
  if (!isAdmin(userId)) {
    ctx.reply(`hey ${username}!, You are not authorized to use this command.`);
    return;
  }
  ctx.reply(
    "Enter the referral count required to access the file. Example: /setfile 10",
  );
});
bot.on("text", async (ctx) => {
  const userId = ctx.message.from.id;
  const text = ctx.message.text;
  if (text.startsWith("/setfile")) {
    const referralCount = parseInt(text.split(" ")[1]);
    const fileId = uuidv4();
    filesCollection.insertOne({
      fileId: fileId,
      referralCount: referralCount,
      content: "File content here",
    });

    ctx.reply(
      `File with ID ${fileId} has been set. Users need to refer ${referralCount} users to access it.`,
    );
  }
});
bot.command("contact", (ctx) => {
  const username = ctx.message.from.username;
  ctx.reply(
    `hey ${username} For any inquiries or assistance, please contact us through the following channels:\n\n` +
      `Email: obasprom.com\n` +
      `Telegram Support: @test`,
  );
});
bot.command("uptime", (ctx) => {
  const username = ctx.message.from.username;
  const uptime = process.uptime();
  ctx.reply(`hey ${username}\nBot uptime: ${formatUptime(uptime)}`);
});

bot.command("alive", (ctx) => {
  const username = ctx.message.from.username;
  ctx.reply(`hey ${username}, I am alive!`);
});
bot.command("ping", async (ctx) => {
  const start = new Date();
  ctx.reply("Pinging...").then((sentMessage) => {
    const end = new Date();
    const pingTime = end - start;
    sentMessage.edit(`Pong! Latency is ${pingTime}ms`);
  });
});*/
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
function isAdmin(userId, superadmin = false) {
  return superadmin ? ADMIN_IDS.includes(userId) : ADMIN_IDS.includes(userId);
}
function formatUptime(uptime) {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}
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
