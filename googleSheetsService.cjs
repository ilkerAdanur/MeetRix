// Google Sheets API entegrasyonu
const { google } = require('googleapis');

// Google Sheets API için kimlik bilgilerini yükle
const credentials = require('./gen-lang-client-0614017333-dad6ceb35a11.json');

// Google Sheets API için kimlik doğrulama
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

// Google Sheets API'sini başlat
const sheets = google.sheets({ version: 'v4', auth });

// Google Sheets dosya ID'si (URL'den alınabilir)
// Örnek: https://docs.google.com/spreadsheets/d/10EWJn_I1rwYrc_0zQsMvpPzgyrL6H8wPWBf_vkBwMHE/edit
const SPREADSHEET_ID = '10EWJn_I1rwYrc_0zQsMvpPzgyrL6H8wPWBf_vkBwMHE';

// Sayfa adı
const SHEET_NAME = 'Sheet1';

/**
 * Google Sheets'e yeni bir kullanıcı ekler
 * @param {Object} userData - Kullanıcı verileri
 * @returns {Promise<boolean>} - İşlem başarılı ise true, değilse false
 */
async function addUserToSheet(userData) {
  try {
    // Kullanıcı verilerini bir satır olarak hazırla
    const values = [
      [
        userData.name,
        userData.skills.join(', '),
        userData.pastProjects.join(', '),
        userData.bio,
        userData.lookingForSkills.join(', '),
        userData.projectIdea || '',
        userData.location || '',
        userData.telegramId.toString()
      ]
    ];

    // Google Sheets'e veri ekle
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values
      }
    });

    console.log(`Kullanıcı başarıyla eklendi: ${userData.name}`);
    return true;
  } catch (error) {
    console.error('Google Sheets\'e veri eklenirken hata oluştu:', error);
    return false;
  }
}

/**
 * Telegram ID'ye göre kullanıcının daha önce kaydedilip kaydedilmediğini kontrol eder
 * @param {number} telegramId - Telegram kullanıcı ID'si
 * @returns {Promise<boolean>} - Kullanıcı varsa true, yoksa false
 */
async function checkUserExists(telegramId) {
  try {
    // Tüm verileri oku
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`
    });

    const rows = response.data.values || [];

    // İlk satır başlık satırı olabilir, bu yüzden atla
    if (rows.length <= 1) {
      return false;
    }

    // Telegram ID'ye göre kullanıcıyı ara (son sütun)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length >= 8 && row[7] === telegramId.toString()) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Kullanıcı kontrolü sırasında hata oluştu:', error);
    return false;
  }
}

/**
 * Telegram ID'ye göre kullanıcı bilgilerini getirir
 * @param {number} telegramId - Telegram kullanıcı ID'si
 * @returns {Promise<Object|null>} - Kullanıcı bilgileri veya null
 */
async function getUserByTelegramId(telegramId) {
  try {
    // Tüm verileri oku
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`
    });

    const rows = response.data.values || [];

    // İlk satır başlık satırı olabilir, bu yüzden atla
    if (rows.length <= 1) {
      return null;
    }

    // Telegram ID'ye göre kullanıcıyı ara (son sütun)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length >= 8 && row[7] === telegramId.toString()) {
        return {
          name: row[0],
          skills: row[1].split(', '),
          pastProjects: row[2].split(', '),
          bio: row[3],
          lookingForSkills: row[4].split(', '),
          projectIdea: row[5],
          location: row[6],
          telegramId: parseInt(row[7])
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Kullanıcı bilgileri alınırken hata oluştu:', error);
    return null;
  }
}

/**
 * Tüm kullanıcıları getirir
 * @returns {Promise<Array|null>} - Kullanıcı listesi veya null
 */
async function getAllUsers() {
  try {
    // Tüm verileri oku
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`
    });

    const rows = response.data.values || [];

    // İlk satır başlık satırı olabilir, bu yüzden atla
    if (rows.length <= 1) {
      return [];
    }

    // Kullanıcı listesini oluştur
    const users = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length >= 8) {
        users.push({
          name: row[0],
          skills: row[1].split(', '),
          pastProjects: row[2].split(', '),
          bio: row[3],
          lookingForSkills: row[4].split(', '),
          projectIdea: row[5],
          location: row[6],
          telegramId: parseInt(row[7])
        });
      }
    }

    return users;
  } catch (error) {
    console.error('Kullanıcı listesi alınırken hata oluştu:', error);
    return null;
  }
}

/**
 * Kullanıcı bilgilerini günceller
 * @param {Object} userData - Güncellenmiş kullanıcı verileri
 * @returns {Promise<boolean>} - İşlem başarılı ise true, değilse false
 */
async function updateUserInSheet(userData) {
  try {
    // Tüm verileri oku
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`
    });

    const rows = response.data.values || [];

    // İlk satır başlık satırı olabilir, bu yüzden atla
    if (rows.length <= 1) {
      return false;
    }

    // Telegram ID'ye göre kullanıcıyı ara
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length >= 8 && row[7] === userData.telegramId.toString()) {
        rowIndex = i + 1; // 1-based index for Sheets API
        break;
      }
    }

    if (rowIndex === -1) {
      return false; // Kullanıcı bulunamadı
    }

    // Kullanıcı verilerini bir satır olarak hazırla
    const values = [
      [
        userData.name,
        userData.skills.join(', '),
        userData.pastProjects.join(', '),
        userData.bio,
        userData.lookingForSkills.join(', '),
        userData.projectIdea || '',
        userData.location || '',
        userData.telegramId.toString()
      ]
    ];

    // Google Sheets'te satırı güncelle
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex}:H${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: values
      }
    });

    console.log(`Kullanıcı başarıyla güncellendi: ${userData.name}`);
    return true;
  } catch (error) {
    console.error('Google Sheets\'te veri güncellenirken hata oluştu:', error);
    return false;
  }
}

module.exports = {
  addUserToSheet,
  checkUserExists,
  getUserByTelegramId,
  getAllUsers,
  updateUserInSheet
};
