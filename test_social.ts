import fetch from 'node-fetch';

async function run() {
  console.log('Sending Test Webhook to Make.com...');
  const makeWebhookUrl = 'https://hook.eu1.make.com/ljr6ps4bje9d78zndivnahh0w5eaqk49';
  
  const payload = {
    text: "Struggling to come up with fresh ideas for your next article? 📝✍️\n\nWriter's block is real, but it doesn't have to slow you down. Let our AI do the heavy lifting!\n\nMeet the QuickTools AI Blog Idea Generator! 🧠💡\n\nJust enter your niche, and instantly get dozens of viral-worthy, SEO-optimized blog topics tailored for your audience.\n\nNever stare at a blank page again. Start writing your best content today! 🚀\n\nTry it for FREE here:\nhttps://quicktools.space/tools/ai-blog-ideas\n\n#ContentCreation #BloggingTips #WriterCommunity #QuickToolsAI #Productivity #AITools",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max",
    toolName: "AI Blog Idea Generator",
    toolUrl: "https://quicktools.space/tools/ai-blog-ideas"
  };

  try {
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Successfully sent data to Make.com Webhook!');
    } else {
      console.error('❌ Make.com webhook failed with status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error sending webhook:', error);
  }
}

run();
