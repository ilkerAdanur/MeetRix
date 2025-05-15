// Telegram bot with Google Sheets integration
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const sheetsService = require('./googleSheetsService.cjs');

// Load environment variables
dotenv.config();

// Replace with your Telegram bot token
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set. Please set it in your .env file.');
  process.exit(1);
}

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// In-memory user database for active registration sessions
const registrationStates = {};

// User class
class User {
  constructor(telegramId, name, skills, pastProjects, bio, lookingForSkills, projectIdea, location) {
    this.id = uuidv4();
    this.telegramId = telegramId;
    this.name = name;
    this.skills = skills;
    this.pastProjects = pastProjects;
    this.bio = bio;
    this.lookingForSkills = lookingForSkills;
    this.projectIdea = projectIdea;
    this.location = location;
  }
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Welcome message
  bot.sendMessage(
    chatId,
    `Proje Takım Eşleştirme Botuna Hoş Geldiniz! 👋\n\n` +
    `Grup projeleriniz için tamamlayıcı becerilere sahip takım arkadaşları bulmanıza yardımcı olmak için buradayım. İşte yapabilecekleriniz:\n\n` +
    `- /kayit - Becerileriniz ve ilgi alanlarınızla profilinizi oluşturun veya güncelleyin\n` +
    `- /profil - Profilinizi görüntüleyin\n` +
    `- /eslesme - Tamamlayıcı becerilere sahip potansiyel takım üyelerini bulun\n` +
    `- /yardim - Botun kullanımı hakkında yardım alın\n\n` +
    `Hadi başlayalım! Profilinizi oluşturmak için /kayit komutunu kullanın.`
  );
});

// Handle /kayit and /register commands
bot.onText(/\/(kayit|register)/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Check if user already exists in Google Sheets
  const userExists = await sheetsService.checkUserExists(userId);
  if (userExists) {
    bot.sendMessage(chatId, 'Zaten kayıtlısınız. Profilinizi görüntülemek için /profil komutunu kullanabilirsiniz.');
    return;
  }

  // Start the registration process
  registrationStates[userId] = {
    step: 'name',
    data: { telegramId: userId }
  };

  bot.sendMessage(chatId, "Proje takım eşleştirmesi için kayıt işlemine başlayalım! Adınız nedir?");
});

// Handle /profil and /profile commands
bot.onText(/\/(profil|profile)/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Get user from Google Sheets
  const user = await sheetsService.getUserByTelegramId(userId);
  if (!user) {
    bot.sendMessage(chatId, "Henüz bir profiliniz yok. Oluşturmak için /kayit komutunu kullanın.");
    return;
  }

  // Format profile message
  let profileMessage = `📋 Profiliniz:\n\n` +
    `Ad: ${user.name}\n` +
    `Beceriler: ${user.skills.join(', ')}\n` +
    `Geçmiş Projeler: ${user.pastProjects.join(', ')}\n` +
    `Hakkında: ${user.bio}\n` +
    `Aradığınız beceriler: ${user.lookingForSkills.join(', ')}\n` +
    `Proje fikri: ${user.projectIdea || 'Belirtilmemiş'}\n` +
    `Konum: ${user.location || 'Belirtilmemiş'}\n\n`;

  bot.sendMessage(chatId, profileMessage);
});

// Handle /eslesme and /matches commands
bot.onText(/\/(eslesme|matches)/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Get user from Google Sheets
  const user = await sheetsService.getUserByTelegramId(userId);
  if (!user) {
    bot.sendMessage(chatId, "Henüz bir profiliniz yok. Oluşturmak için /kayit komutunu kullanın.");
    return;
  }

  // Get all users from Google Sheets
  const allUsers = await sheetsService.getAllUsers();
  if (!allUsers || allUsers.length === 0) {
    bot.sendMessage(chatId, "Henüz sistemde başka kullanıcı bulunmuyor.");
    return;
  }

  // Get all potential matches (excluding the user themselves)
  const allPotentialUsers = allUsers.filter(u => {
    // Skip the user themselves
    return u.telegramId !== user.telegramId;
  });

  if (allPotentialUsers.length === 0) {
    bot.sendMessage(chatId, "Henüz sistemde başka kullanıcı bulunmuyor. Daha sonra tekrar deneyin.");
    return;
  }

  // Calculate match scores for all potential users
  const scoredMatches = allPotentialUsers.map(u => {
    let matchScore = 0;

    // Check if the other user has skills that this user is looking for
    const skillsUserWants = user.lookingForSkills.filter(skill =>
      u.skills.some(uSkill => uSkill.toLowerCase().includes(skill.toLowerCase()))
    );

    if (skillsUserWants.length > 0) {
      matchScore += skillsUserWants.length * 2; // Higher weight for matching skills
    }

    // Check if this user has skills that the other user is looking for
    const skillsOtherWants = u.lookingForSkills.filter(skill =>
      user.skills.some(userSkill => userSkill.toLowerCase().includes(skill.toLowerCase()))
    );

    if (skillsOtherWants.length > 0) {
      matchScore += skillsOtherWants.length * 2;
    }

    return {
      user: u,
      score: matchScore
    };
  });

  // Sort by match score (highest first)
  scoredMatches.sort((a, b) => b.score - a.score);

  // Extract just the users from the scored matches
  const potentialMatches = scoredMatches.map(match => match.user);

  // Show the first potential match
  const match = potentialMatches[0];

  // Format match message
  const matchMessage = `Potansiyel bir takım üyesi bulundu!\n\n` +
    `Ad: ${match.name}\n` +
    `Beceriler: ${match.skills.join(', ')}\n` +
    `Geçmiş Projeler: ${match.pastProjects.join(', ')}\n` +
    `Hakkında: ${match.bio}\n` +
    `Proje fikri: ${match.projectIdea || 'Belirtilmemiş'}\n` +
    `Konum: ${match.location || 'Belirtilmemiş'}\n\n` +
    `Bu kişiyle iletişime geçmek için Telegram'da t.me/${match.telegramId} adresini kullanabilirsiniz.`;

  bot.sendMessage(chatId, matchMessage);
});

// Handle /guncelle and /update commands
bot.onText(/\/(guncelle|update)/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Get user from Google Sheets
  const user = await sheetsService.getUserByTelegramId(userId);
  if (!user) {
    bot.sendMessage(chatId, "Henüz bir profiliniz yok. Oluşturmak için /kayit komutunu kullanın.");
    return;
  }

  // Start the update process
  const updateOptions = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Beceriler', callback_data: 'update_skills' }],
        [{ text: 'Geçmiş Projeler', callback_data: 'update_projects' }],
        [{ text: 'Biyografi', callback_data: 'update_bio' }],
        [{ text: 'Aradığım Beceriler', callback_data: 'update_lookingfor' }],
        [{ text: 'Proje Fikri', callback_data: 'update_idea' }],
        [{ text: 'Konum', callback_data: 'update_location' }]
      ]
    }
  };

  bot.sendMessage(chatId, "Hangi bilgiyi güncellemek istiyorsunuz?", updateOptions);
});

// Handle callback queries for profile updates
bot.on('callback_query', async (callbackQuery) => {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  // Check if this is an update request
  if (data.startsWith('update_')) {
    const updateType = data.replace('update_', '');

    // Create a temporary state for the update
    if (!registrationStates[userId]) {
      registrationStates[userId] = {
        step: updateType,
        data: { telegramId: userId, isUpdating: true }
      };
    }

    let promptMessage = '';

    switch (updateType) {
      case 'skills':
        promptMessage = "Teknik becerilerinizi güncelleyin (virgülle ayrılmış liste, örn., JavaScript, React, Node.js, UI/UX Tasarım, Proje Yönetimi):";
        break;
      case 'projects':
        promptMessage = "Geçmiş projelerinizi güncelleyin (virgülle ayrılmış liste):";
        break;
      case 'bio':
        promptMessage = "Biyografinizi güncelleyin:";
        break;
      case 'lookingfor':
        promptMessage = "Aradığınız becerileri güncelleyin (virgülle ayrılmış liste):";
        break;
      case 'idea':
        promptMessage = "Proje fikrinizi güncelleyin:";
        break;
      case 'location':
        promptMessage = "Konumunuzu güncelleyin (şehir/ülke):";
        break;
      default:
        promptMessage = "Geçersiz güncelleme tipi.";
    }

    bot.sendMessage(chatId, promptMessage);
    bot.answerCallbackQuery(callbackQuery.id);
  }
});

// Handle /yardim and /help commands
bot.onText(/\/(yardim|help)/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `Proje Takım Eşleştirme Botunu nasıl kullanacağınız:\n\n` +
    `- /kayit - Becerilerinizi ve ilgi alanlarınızı eklemek için kayıt işlemini başlatın\n` +
    `- /profil - Mevcut profilinizi görüntüleyin\n` +
    `- /eslesme - Tamamlayıcı becerilere sahip potansiyel takım üyelerini bulun\n` +
    `- /guncelle - Profilinizi güncelleyin\n` +
    `- /yardim - Bu yardım mesajını gösterin\n\n` +
    `Botla etkileşim kurmak için, mesajlarına yanıt vermeniz yeterlidir. Kayıt sırasında, bot sizi adım adım yönlendirecektir.\n\n` +
    `Potansiyel takım üyelerini görüntülerken, becerilerine ve proje fikirlerine göre onlarla iletişime geçebilirsiniz.`
  );
});

// Handle regular messages (for registration and update processes)
bot.on('message', async (msg) => {
  // Skip command messages
  if (msg.text?.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text || '';

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Check if user is in registration or update process
  const registrationState = registrationStates[userId];
  if (!registrationState) return;

  // Check if this is an update process
  const isUpdating = registrationState.data.isUpdating;

  if (isUpdating) {
    // Handle profile update
    try {
      // Get current user data
      const currentUser = await sheetsService.getUserByTelegramId(userId);
      if (!currentUser) {
        bot.sendMessage(chatId, "Profiliniz bulunamadı. Lütfen önce /kayit komutunu kullanın.");
        delete registrationStates[userId];
        return;
      }

      // Create updated user object
      const updatedUser = { ...currentUser };

      // Update the specific field
      switch (registrationState.step) {
        case 'skills':
          updatedUser.skills = text.split(',').map(i => i.trim()).filter(i => i.length > 0);
          bot.sendMessage(chatId, "Becerileriniz başarıyla güncellendi!");
          break;

        case 'projects':
          updatedUser.pastProjects = text.split(',').map(i => i.trim()).filter(i => i.length > 0);
          bot.sendMessage(chatId, "Geçmiş projeleriniz başarıyla güncellendi!");
          break;

        case 'bio':
          updatedUser.bio = text.trim();
          bot.sendMessage(chatId, "Biyografiniz başarıyla güncellendi!");
          break;

        case 'lookingfor':
          updatedUser.lookingForSkills = text.split(',').map(i => i.trim()).filter(i => i.length > 0);
          bot.sendMessage(chatId, "Aradığınız beceriler başarıyla güncellendi!");
          break;

        case 'idea':
          updatedUser.projectIdea = text.trim();
          bot.sendMessage(chatId, "Proje fikriniz başarıyla güncellendi!");
          break;

        case 'location':
          updatedUser.location = text.trim();
          bot.sendMessage(chatId, "Konumunuz başarıyla güncellendi!");
          break;

        default:
          bot.sendMessage(chatId, "Geçersiz güncelleme tipi.");
      }

      // Save updated user to Google Sheets
      const success = await sheetsService.updateUserInSheet(updatedUser);
      if (success) {
        bot.sendMessage(chatId, "Profiliniz başarıyla güncellendi. Güncel profilinizi görmek için /profil komutunu kullanabilirsiniz.");
      } else {
        bot.sendMessage(chatId, "Profil güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      }

      // Update complete
      delete registrationStates[userId];
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      bot.sendMessage(chatId, "Profil güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      delete registrationStates[userId];
    }
  } else {
    // Process the current registration step
    switch (registrationState.step) {
      case 'name':
        registrationState.data.name = text.trim();
        registrationState.step = 'skills';
        bot.sendMessage(chatId, "Harika! Teknik becerileriniz nelerdir? (virgülle ayrılmış liste, örn., JavaScript, React, Node.js, UI/UX Tasarım, Proje Yönetimi)");
        break;

      case 'skills':
        registrationState.data.skills = text.split(',').map(i => i.trim()).filter(i => i.length > 0);
        registrationState.step = 'pastProjects';
        bot.sendMessage(chatId, "Geçmişte hangi projelerde çalıştınız? (virgülle ayrılmış liste)");
        break;

      case 'pastProjects':
        registrationState.data.pastProjects = text.split(',').map(i => i.trim()).filter(i => i.length > 0);
        registrationState.step = 'bio';
        bot.sendMessage(chatId, "Kendiniz ve deneyiminiz hakkında biraz bilgi verin (biyografiniz):");
        break;

      case 'bio':
        registrationState.data.bio = text.trim();
        registrationState.step = 'lookingForSkills';
        bot.sendMessage(chatId, "Potansiyel takım üyelerinde hangi becerileri arıyorsunuz? (virgülle ayrılmış liste)");
        break;

      case 'lookingForSkills':
        registrationState.data.lookingForSkills = text.split(',').map(i => i.trim()).filter(i => i.length > 0);
        registrationState.step = 'projectIdea';
        bot.sendMessage(chatId, "Üzerinde çalışmak istediğiniz bir proje fikriniz var mı? Lütfen kısaca açıklayın:");
        break;

      case 'projectIdea':
        registrationState.data.projectIdea = text.trim();
        registrationState.step = 'location';
        bot.sendMessage(chatId, "Konumunuz nedir? (şehir/ülke)");
        break;

      case 'location':
        registrationState.data.location = text.trim();

        // Create the user
        const { telegramId, name, skills, pastProjects, bio, lookingForSkills, projectIdea, location } = registrationState.data;
        const newUser = new User(telegramId, name, skills, pastProjects, bio, lookingForSkills, projectIdea, location);

        // Save the user to Google Sheets
        try {
          const success = await sheetsService.addUserToSheet(newUser);
          if (success) {
            bot.sendMessage(chatId, "Kayıt tamamlandı! Bilgileriniz başarıyla kaydedildi. Projeleriniz için potansiyel takım üyeleriyle eşleşmeye başlayabilirsiniz. Takım üyeleri bulmak için /eslesme komutunu kullanın.");
          } else {
            bot.sendMessage(chatId, "Kayıt sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
          }
        } catch (error) {
          console.error('Kullanıcı kaydı sırasında hata:', error);
          bot.sendMessage(chatId, "Kayıt sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }

        // Registration complete
        delete registrationStates[userId];
        break;

      default:
        bot.sendMessage(chatId, "Geçersiz kayıt adımı. Lütfen tekrar başlamak için /kayit komutunu kullanın.");
        delete registrationStates[userId];
    }
  }
});

// Start the bot
console.log('Telegram botu çalışıyor...');
console.log('Botu durdurmak için Ctrl+C tuşlarına basın');
