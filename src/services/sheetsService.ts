import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const keyFilePath = path.join(__dirname, '../../google-service-account.json');

export const appendDailyReportRow = async (
  sheetId: string,
  rowData: {
    date: string;
    blogsGenerated: number;
    newsGenerated: number;
    articlesGenerated: number;
    activeUsers: number;
    pageViews: number;
    topPage: string;
  }
) => {
  try {
    let creds;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      creds = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    }

    // Initialize auth
    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo(); // loads document properties and worksheets

    // Determine current month sheet name, e.g., "August 2026"
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    
    // Parse the date (e.g. "2026-07-05") to get correct month tab
    const rowDate = new Date(rowData.date);
    const sheetName = `${monthNames[rowDate.getMonth()]} ${rowDate.getFullYear()}`;

    // Find or create sheet
    let sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      sheet = await doc.addSheet({ title: sheetName });
      // Set header row for new sheet
      await sheet.setHeaderRow([
        'Date',
        'Blogs Generated',
        'News Generated',
        'Articles Generated',
        'Active Users',
        'Page Views',
        'Top Visited Page'
      ]);
    }

    // Append row
    await sheet.addRow({
      'Date': rowData.date,
      'Blogs Generated': rowData.blogsGenerated,
      'News Generated': rowData.newsGenerated,
      'Articles Generated': rowData.articlesGenerated,
      'Active Users': rowData.activeUsers,
      'Page Views': rowData.pageViews,
      'Top Visited Page': rowData.topPage
    });

    console.log(`Successfully appended daily report to Google Sheet: ${sheetName}`);
    return true;
  } catch (error) {
    console.error('Error appending row to Google Sheets:', error);
    return false;
  }
};
