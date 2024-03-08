const express = require('express');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3768;
mongoose.connect('mongodb+srv://pobasuyi69:9UW3Yra6HZFUCT0B@cluster0.lum7yrw.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const UserSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  referralCode: String,
  referrals: { type: Number, default: 0 },
  subscribed: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
});

const User = mongoose.model('User', UserSchema);
const botToken = '6291038512:AAFTq1fq5yd74SockhILvqmrqbjc8UurZNY';
const bot = new TelegramBot(botToken, { polling: true });
const adminId = '6551258524'; 

async function isUserSubscribed(userId) {
  try {
    const chatMember = await bot.getChatMember('1002097343991', userId);
    return chatMember.status === 'member' || chatMember.status === 'administrator';
  } catch (error) {
    console.error(error);
    return false;
  }
}
app.post(`/webhook/${botToken}`, express.json(), (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isSubscribed = await isUserSubscribed(userId);

  if (isSubscribed) {
    User.findOne({ telegramId: userId }, (err, user) => {
      if (err || !user) {
        return bot.sendMessage(chatId, 'Error checking user.');
      }

      const isAdmin = user.isAdmin || false;

      const inlineKeyboard = [
        [
          {
            text: 'Referral Count',
            callback_data: 'check_referral_count',
          },
          {
            text: 'Subscribe to Channel',
            callback_data: 'subscribe_to_channel',
          },
        ],
        [
          {
            text: 'Set Referral Requirement',
            callback_data: 'set_referral_requirement',
          },
        ],
        [
          {
            text: 'Set Text File',
            callback_data: 'set_text_file',
          },
        ],
        [
          {
            text: 'Get File',
            callback_data: 'get_file',
          },
        ],
        [
          {
            text: 'Set Admin',
            callback_data: 'set_admin',
          },
          {
            text: 'Add Channel',
            callback_data: 'add_channel',
          },
        ],
      ];

      const inlineMarkup = {
        inline_keyboard: inlineKeyboard,
      };

      bot.sendMessage(chatId, `Welcome to the referral bot! ${isAdmin ? 'You are an admin.' : ''} Use the buttons below:`, {
        reply_markup: inlineMarkup,
      });
    });
  } else {
    bot.sendMessage(chatId, 'To use this bot, please subscribe to our channel first.');
  }
});
bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const data = query.data;
    isUserSubscribed(userId).then((isSubscribed) => {
      if (isSubscribed) {
        switch (data) {
          case 'check_referral_count':
            User.findOne({ telegramId: userId }, (err, user) => {
              if (err || !user) {
                return;
              }
  
              const message = `Your Referral Count: ${user.referrals}`;
              bot.answerCallbackQuery(query.id, { text: message });
            });
            break;
  
          case 'subscribe_to_channel':
            const channelLink = 'https://t.me/+DbD44kc_EXc1ZWM0';
            bot.answerCallbackQuery(query.id, { text: 'Click the button below to subscribe to our channel.' });
            bot.sendInlineKeyboard(userId, [[{ text: 'Subscribe', url: channelLink }]]);
            break;
  
          case 'set_referral_requirement':
            if (userId.toString() === adminId) {
                bot.sendMessage(userId, 'Please use the /setreferralcount command to set the referral requirement.');
              } else {
                bot.answerCallbackQuery(query.id, { text: 'You are not authorized to use this command.' });
              }
              break;
  
          case 'set_text_file':
            if (userId.toString() === adminId) {
                bot.sendMessage(userId, 'Please use the /setfile command to set a text file.');
              } else {
                bot.answerCallbackQuery(query.id, { text: 'You are not authorized to use this command.' });
              }
            break;
  
          case 'get_file':
            User.findOne({ telegramId: userId }, (err, user) => {
                if (err || !user) {
                  return;
                }
        
                if (user.referrals >= bot.referralRequirement) {
                  bot.sendMessage(userId, 'Please enter the ID of the file you want to receive.');
                  bot.once('text', (msg) => {
                    const fileId = msg.text.trim();
                    const fileText = bot.fileRegistry[fileId];
        
                    if (fileText) {
                      bot.sendMessage(userId, `Here is your file with ID ${fileId}:\n${fileText}`);
                    } else {
                      bot.sendMessage(userId, 'Invalid file ID. Please try again.');
                    }
                  });
                } else {
                  bot.answerCallbackQuery(query.id, { text: `You need ${bot.referralRequirement - user.referrals} more referrals to get a file.` });
                }
              });
            break;
  
          case 'set_admin':
            User.findOne({ telegramId: userId }, (err, user) => {
                if (err || !user) {
                  return;
                }
        
                if (user.isAdmin) {
                  bot.sendMessage(userId, 'Please enter the Telegram ID of the user you want to set as an admin.');
                  bot.once('text', (msg) => {
                    const adminUserId = parseInt(msg.text.trim());
                    User.findOneAndUpdate(
                      { telegramId: adminUserId },
                      { $set: { isAdmin: true } },
                      { new: true },
                      (err, updatedAdminUser) => {
                        if (err || !updatedAdminUser) {
                          bot.sendMessage(userId, 'Error setting admin. Please try again.');
                        } else {
                          bot.sendMessage(userId, `User with ID ${adminUserId} is now an admin.`);
                        }
                      }
                    );
                  });
                } else {
                  bot.answerCallbackQuery(query.id, { text: 'You are not authorized to use this command.' });
                }
              });
            break;
  
          case 'add_channel':
            User.findOne({ telegramId: userId }, (err, user) => {
                if (err || !user) {
                  return;
                }
        
                if (user.isAdmin) {
                  bot.sendMessage(userId, 'Please enter the link of the channel you want to add for users to subscribe to.');
                  bot.once('text', (msg) => {
                    const channelLink = msg.text.trim();
                    bot.sendMessage(userId, `Channel ${channelLink} has been added.`);
                  });
                } else {
                  bot.answerCallbackQuery(query.id, { text: 'You are not authorized to use this command.' });
                }
              });
              break;
        }
      } else {
        bot.answerCallbackQuery(query.id, { text: 'To use this command, please subscribe to our channel first.' });
      }
    });
  });
bot.onText(/\/setreferralcount/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  User.findOne({ telegramId: userId }, (err, user) => {
    if (err || !user) {
      return bot.sendMessage(chatId, 'Error checking user.');
    }

    if (user.isAdmin) {
      bot.sendMessage(chatId, 'Please enter the new referral requirement count.');
      bot.once('text', (msg) => {
        const newRequirement = parseInt(msg.text.trim());
        bot.sendMessage(chatId, `Referral requirement set to ${newRequirement}.`);
      });
    } else {
      bot.sendMessage(chatId, 'You are not authorized to use this command.');
    }
  });
});

bot.onText(/\/setfile/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  User.findOne({ telegramId: userId }, (err, user) => {
    if (err || !user) {
      return bot.sendMessage(chatId, 'Error checking user.');
    }

    if (user.isAdmin) {
      bot.sendMessage(chatId, 'Please enter the ID and text of the file in the format "ID:Text".');
      bot.once('text', (msg) => {
        const [fileId, fileText] = msg.text.trim().split(':');
        bot.sendMessage(chatId, `File with ID ${fileId} set.`);
      });
    } else {
      bot.sendMessage(chatId, 'You are not authorized to use this command.');
    }
  });
});

bot.onText(/\/addadmin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  User.findOne({ telegramId: userId }, (err, user) => {
    if (err || !user) {
      return bot.sendMessage(chatId, 'Error checking user.');
    }

    if (user.isAdmin) {
      bot.sendMessage(chatId, 'Please enter the Telegram ID of the user you want to add as an admin.');
      bot.once('text', (msg) => {
        const adminUserId = parseInt(msg.text.trim());
        User.findOneAndUpdate(
          { telegramId: adminUserId },
          { $set: { isAdmin: true } },
          { new: true },
          (err, updatedAdminUser) => {
            if (err || !updatedAdminUser) {
              bot.sendMessage(chatId, 'Error adding admin. Please try again.');
            } else {
              bot.sendMessage(chatId, `User with ID ${adminUserId} is now an admin.`);
            }
          }
        );
      });
    } else {
      bot.sendMessage(chatId, 'You are not authorized to use this command.');
    }
  });
});

bot.onText(/\/addchannel/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  User.findOne({ telegramId: userId }, (err, user) => {
    if (err || !user) {
      return bot.sendMessage(chatId, 'Error checking user.');
    }

    if (user.isAdmin) {
      bot.sendMessage(chatId, 'Please enter the link of the channel you want to add for users to subscribe to.');
      bot.once('text', (msg) => {
        const channelLink = msg.text.trim();
        bot.sendMessage(chatId, `Channel ${channelLink} has been added.`);
      });
    } else {
      bot.sendMessage(chatId, 'You are not authorized to use this command.');
    }
  });
});

bot.on('inline_query', (query) => {
  const userId = query.from.id;

  const results = [
    {
      type: 'article',
      id: '1',
      title: 'Set Referral Requirement',
      description: 'Set the referral requirement for users.',
      input_message_content: {
        message_text: '/setreferralcount',
      },
    },
    {
      type: 'article',
      id: '2',
      title: 'Set Text File',
      description: 'Set a text file for users to receive.',
      input_message_content: {
        message_text: '/setfile',
      },
    },
    {
      type: 'article',
      id: '3',
      title: 'Add Admin',
      description: 'Add a user as an admin.',
      input_message_content: {
        message_text: '/addadmin',
      },
    },
    {
      type: 'article',
      id: '4',
      title: 'Add Channel',
      description: 'Add a channel for users to subscribe to.',
      input_message_content: {
        message_text: '/addchannel',
      },
    },
  ];

  bot.answerInlineQuery(query.id, results);
});

bot.onText(/\/setcontacttext/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    User.findOne({ telegramId: userId, isAdmin: true }, (err, user) => {
      if (err || !user) {
        return bot.sendMessage(chatId, 'You are not authorized to use this command.');
      }
  
      bot.sendMessage(chatId, 'Please enter the new text for the /contact command.');
      bot.once('text', (msg) => {
        const newContactText = msg.text.trim();
        bot.sendMessage(chatId, 'Contact text updated successfully.');
      });
    });
  });
  
  bot.onText(/\/setchanneltext/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    User.findOne({ telegramId: userId, isAdmin: true }, (err, user) => {
      if (err || !user) {
        return bot.sendMessage(chatId, 'You are not authorized to use this command.');
      }
  
      bot.sendMessage(chatId, 'Please enter the new text for the /viewchannel command.');
      bot.once('text', (msg) => {
        const newChannelText = msg.text.trim();
        bot.sendMessage(chatId, 'Channel text updated successfully.');
      });
    });
  });
  
  bot.onText(/\/contact/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    User.findOne({ telegramId: userId }, (err, user) => {
      if (err || !user) {
        return bot.sendMessage(chatId, 'Error checking user.');
      }
  
      const contactText = 'To contact us, please subscribe to our channel first.'; 
  
      if (user.subscribed) {
        bot.sendMessage(chatId, contactText);
      } else {
        bot.sendMessage(chatId, contactText);
      }
    });
  });
  
  bot.onText(/\/viewchannel/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    User.findOne({ telegramId: userId }, (err, user) => {
      if (err || !user) {
        return bot.sendMessage(chatId, 'Error checking user.');
      }
  
      const channelText = 'To view the channel, please subscribe to our channel first.';
  
      if (user.subscribed) {
        bot.sendMessage(chatId, channelText);
      } else {
        bot.sendMessage(chatId, channelText);
      }
    });
  });

const html = '<html><body><h1>all status operational!</h1></body></html>';

  app.get('/ping', (req, res) => {
    res.send(html);
  });

  app.get('/', (req, res) => {
    res.send(html);
  });
  
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});
console.log('Bot server started');
