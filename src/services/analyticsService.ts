import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';

import fs from 'fs';

let analyticsDataClient: BetaAnalyticsDataClient;

if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    }
  });
} else {
  const keyFilename = path.join(__dirname, '../../google-service-account.json');
  analyticsDataClient = new BetaAnalyticsDataClient({ keyFilename });
}

export const getDailyGA4Metrics = async (propertyId: string, dateStr: string = 'today') => {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: dateStr,
          endDate: dateStr,
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
        {
          name: 'screenPageViews',
        },
      ],
      dimensions: [
        {
          name: 'pagePath',
        },
      ],
    });

    let totalUsers = 0;
    let totalViews = 0;
    let topPage = 'N/A';
    let highestViews = 0;

    if (response.rows && response.rows.length > 0) {
      response.rows.forEach(row => {
        const pagePath = row.dimensionValues?.[0].value || '';
        const users = parseInt(row.metricValues?.[0].value || '0', 10);
        const views = parseInt(row.metricValues?.[1].value || '0', 10);

        totalUsers += users;
        totalViews += views;

        if (views > highestViews) {
          highestViews = views;
          topPage = pagePath;
        }
      });
    }

    return { totalUsers, totalViews, topPage };
  } catch (error) {
    console.error('Error fetching GA4 metrics:', error);
    return { totalUsers: 0, totalViews: 0, topPage: 'Error' };
  }
};
