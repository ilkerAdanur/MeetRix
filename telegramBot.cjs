// Telegram bot standalone script
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

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

// In-memory user database
const users = {};
const registrationStates = {};

// User schema
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
    this.registrationComplete = true;
    this.matches = [];
    this.rejections = [];
    this.pendingMatches = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
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
    `- /profil - Profilinizi ve mevcut bağlantılarınızı görüntüleyin\n` +
    `- /eslesme - Tamamlayıcı becerilere sahip potansiyel takım üyelerini bulun\n` +
    `- /yardim - Botun kullanımı hakkında yardım alın\n\n` +
    `Hadi başlayalım! Profilinizi oluşturmak için /kayit komutunu kullanın.`
  );
});

// Handle /kayit and /register commands
bot.onText(/\/(kayit|register)/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
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
bot.onText(/\/(profil|profile)/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Find the user
  const user = Object.values(users).find(u => u.telegramId === userId);
  if (!user) {
    bot.sendMessage(chatId, "Henüz bir profiliniz yok. Oluşturmak için /kayit komutunu kullanın.");
    return;
  }

  // Get user's connections (matches)
  const connections = user.matches.map(matchId => users[matchId]).filter(Boolean);

  // Format profile message
  let profileMessage = `📋 Profiliniz:\n\n` +
    `Ad: ${user.name}\n` +
    `Beceriler: ${user.skills.join(', ')}\n` +
    `Geçmiş Projeler: ${user.pastProjects.join(', ')}\n` +
    `Hakkında: ${user.bio}\n` +
    `Aradığınız beceriler: ${user.lookingForSkills.join(', ')}\n` +
    `Proje fikri: ${user.projectIdea || 'Belirtilmemiş'}\n` +
    `Konum: ${user.location || 'Belirtilmemiş'}\n\n`;

  if (connections.length > 0) {
    profileMessage += `🤝 Bağlantılarınız (${connections.length}):\n\n`;
    connections.forEach((connection, index) => {
      profileMessage += `${index + 1}. ${connection.name}\n` +
        `   Beceriler: ${connection.skills.join(', ')}\n` +
        `   Proje fikri: ${connection.projectIdea || 'Belirtilmemiş'}\n\n`;
    });
  } else {
    profileMessage += "Henüz hiç bağlantınız yok. Potansiyel takım üyeleri bulmak için /eslesme komutunu kullanın.";
  }

  bot.sendMessage(chatId, profileMessage);
});

// Handle /eslesme and /matches commands
bot.onText(/\/(eslesme|matches)/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Find the user
  const user = Object.values(users).find(u => u.telegramId === userId);
  if (!user) {
    bot.sendMessage(chatId, "Henüz bir profiliniz yok. Oluşturmak için /kayit komutunu kullanın.");
    return;
  }

  // Find potential matches based on complementary skills
  const potentialMatches = Object.values(users).filter(u => {
    // Skip the user themselves
    if (u.id === user.id) return false;

    // Skip users already matched or rejected
    if (user.matches.includes(u.id) || user.rejections.includes(u.id) || user.pendingMatches.includes(u.id)) return false;

    // Calculate skill match score
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

    // Only return users with a match score above 0 (at least some skill match)
    return matchScore > 0;
  });

  if (potentialMatches.length === 0) {
    bot.sendMessage(chatId, "Şu anda potansiyel takım üyesi bulunamadı. Daha sonra tekrar deneyin veya beceri gereksinimlerinizi ayarlayın.");
    return;
  }

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
    `Bu kişiyle bağlantı kurmak ister misiniz?`;

  // Create inline keyboard for response
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Bağlantı Kur', callback_data: `connect:${match.id}` },
        { text: '❌ Geç', callback_data: `reject:${match.id}` }
      ]
    ]
  };

  bot.sendMessage(chatId, matchMessage, { reply_markup: keyboard });
});

// Handle /yardim and /help commands
bot.onText(/\/(yardim|help)/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `Proje Takım Eşleştirme Botunu nasıl kullanacağınız:\n\n` +
    `- /kayit - Becerilerinizi ve ilgi alanlarınızı eklemek için kayıt işlemini başlatın veya devam ettirin\n` +
    `- /profil - Mevcut profilinizi ve takım bağlantılarınızı görüntüleyin\n` +
    `- /eslesme - Tamamlayıcı becerilere sahip potansiyel takım üyelerini bulun\n` +
    `- /yardim - Bu yardım mesajını gösterin\n\n` +
    `Botla etkileşim kurmak için, mesajlarına yanıt vermeniz yeterlidir. Kayıt sırasında, bot sizi adım adım yönlendirecektir.\n\n` +
    `Potansiyel takım üyelerini görüntülerken, becerilerine ve proje fikirlerine göre onlarla bağlantı kurabilir veya geçebilirsiniz. Karşılıklı ilgi olduğunda, bağlantı kurulacaktır!`
  );
});

// Handle callback queries (for match responses)
bot.on('callback_query', (callbackQuery) => {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  // Parse the callback data
  const [action, matchId] = data.split(':');

  // Find the user
  const user = Object.values(users).find(u => u.telegramId === userId);
  if (!user) {
    bot.sendMessage(chatId, "Henüz bir profiliniz yok. Oluşturmak için /kayit komutunu kullanın.");
    return;
  }

  // Find the potential match
  const potentialMatch = users[matchId];
  if (!potentialMatch) {
    bot.sendMessage(chatId, "Potansiyel takım üyesi bulunamadı.");
    return;
  }

  if (action === 'reject') {
    // Add to rejections
    user.rejections.push(matchId);
    user.updatedAt = new Date();

    bot.sendMessage(chatId, "Bu takım üyesiyle şu anda bağlantı kurmamaya karar verdiniz.");
    bot.answerCallbackQuery(callbackQuery.id);
  } else if (action === 'connect') {
    // User wants to connect with the team member
    // Check if the team member already wanted to connect with the user
    if (potentialMatch.pendingMatches.includes(user.id)) {
      // It's a match!
      user.matches.push(matchId);
      potentialMatch.matches.push(user.id);

      // Remove from pending
      potentialMatch.pendingMatches = potentialMatch.pendingMatches.filter(id => id !== user.id);

      user.updatedAt = new Date();
      potentialMatch.updatedAt = new Date();

      // Create a message with contact information
      const matchMessage = `Harika haber! Siz ve ${potentialMatch.name} artık potansiyel proje işbirliği için bağlantı kurdunuz.\n\n` +
        `${potentialMatch.name} becerileri: ${potentialMatch.skills.join(', ')}\n` +
        `Proje fikri: ${potentialMatch.projectIdea || 'Belirtilmemiş'}\n\n` +
        `Proje fikirlerinizi tartışmaya başlamak ve nasıl birlikte çalışabileceğinizi konuşmak için iletişime geçmenizi öneririz!`;

      bot.sendMessage(chatId, matchMessage);

      // Also notify the other user
      const otherUserChatId = potentialMatch.telegramId;
      const otherUserMessage = `Harika haber! Siz ve ${user.name} artık potansiyel proje işbirliği için bağlantı kurdunuz.\n\n` +
        `${user.name} becerileri: ${user.skills.join(', ')}\n` +
        `Proje fikri: ${user.projectIdea || 'Belirtilmemiş'}\n\n` +
        `Proje fikirlerinizi tartışmaya başlamak ve nasıl birlikte çalışabileceğinizi konuşmak için iletişime geçmenizi öneririz!`;

      bot.sendMessage(otherUserChatId, otherUserMessage);
    } else {
      // Add to pending matches
      user.pendingMatches.push(matchId);
      user.updatedAt = new Date();

      bot.sendMessage(chatId, "Bu takım üyesiyle bağlantı kurma isteğinizi belirttiniz. Eğer onlar da sizinle bağlantı kurmak isterse, size bildirilecek!");
    }

    bot.answerCallbackQuery(callbackQuery.id);
  }
});

// Handle regular messages (for registration process)
bot.on('message', (msg) => {
  // Skip command messages
  if (msg.text?.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text || '';

  if (!userId) {
    bot.sendMessage(chatId, 'Hata: Kullanıcı tanımlanamadı.');
    return;
  }

  // Check if user is in registration process
  const registrationState = registrationStates[userId];
  if (!registrationState) return;

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

      // Save the user
      users[newUser.id] = newUser;

      // Registration complete
      delete registrationStates[userId];

      bot.sendMessage(chatId, "Kayıt tamamlandı! Artık projeleriniz için potansiyel takım üyeleriyle eşleşmeye başlayabilirsiniz. Takım üyeleri bulmak için /eslesme komutunu kullanın.");
      break;

    default:
      bot.sendMessage(chatId, "Geçersiz kayıt adımı. Lütfen tekrar başlamak için /kayit komutunu kullanın.");
      delete registrationStates[userId];
  }
});

// Start the bot
console.log('Telegram botu çalışıyor...');
console.log('Botu durdurmak için Ctrl+C tuşlarına basın');
