import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';

// Path to the service account key file (works for both src/ and dist/ structures)
const keyFilename = path.join(__dirname, '../../google-service-account.json');

const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename,
});

export const getDailyGA4Metrics = async (propertyId: string) => {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: 'today',
          endDate: 'today',
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
