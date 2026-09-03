/** Seeds one default agent (with a default config) and a handful of demo orders so the Order
 * Lookup tool has something real to query. Run with `npm run db:seed --workspace server`. */
import { defaultAgentConfig } from '@voicelab/shared';
import { prisma } from './client.js';

async function main() {
  const existing = await prisma.agent.findFirst({ where: { name: 'Default Agent' }, include: { configs: { where: { isActive: true } } } });
  if (!existing) {
    const agent = await prisma.agent.create({
      data: { name: 'Default Agent', description: 'The default VoiceLab test agent.' },
    });
    const config = defaultAgentConfig();
    await prisma.agentConfig.create({
      data: {
        agentId: agent.id,
        isActive: true,
        sttProvider: config.transcriptionSettings.sttProvider,
        llmProvider: config.behaviorSettings.llmProvider,
        ttsProvider: config.voiceSettings.ttsProvider,
        voiceSettings: config.voiceSettings,
        transcriptionSettings: config.transcriptionSettings,
        behaviorSettings: config.behaviorSettings,
        callSettings: config.callSettings,
        backgroundAudio: config.voiceSettings.backgroundAudio,
        tools: config.tools,
      },
    });
    console.log(`Seeded agent "${agent.name}" (${agent.id})`);
  } else {
    const activeConfig = existing.configs[0];
    if (activeConfig?.sttProvider !== 'livekit' || activeConfig.llmProvider !== 'livekit' || activeConfig.ttsProvider !== 'livekit') {
      const config = defaultAgentConfig();
      await prisma.$transaction([
        prisma.agentConfig.updateMany({ where: { agentId: existing.id, isActive: true }, data: { isActive: false } }),
        prisma.agentConfig.create({
          data: {
            agentId: existing.id,
            isActive: true,
            sttProvider: config.transcriptionSettings.sttProvider,
            llmProvider: config.behaviorSettings.llmProvider,
            ttsProvider: config.voiceSettings.ttsProvider,
            voiceSettings: config.voiceSettings,
            transcriptionSettings: config.transcriptionSettings,
            behaviorSettings: config.behaviorSettings,
            callSettings: config.callSettings,
            backgroundAudio: config.voiceSettings.backgroundAudio,
            tools: config.tools,
          },
        }),
      ]);
      console.log('Updated default agent to the LiveKit Cloud Inference configuration.');
    } else {
      console.log('Default agent already uses the LiveKit Cloud configuration, skipping.');
    }
  }

  const demoOrders: { id: string; status: string; items: { name: string; quantity: number }[]; total: number; estimatedDelivery: Date | null }[] = [
    { id: 'ORD-1001', status: 'Shipped', items: [{ name: 'Wireless Headphones', quantity: 1 }], total: 79.99, estimatedDelivery: new Date(Date.now() + 2 * 86400000) },
    { id: 'ORD-1002', status: 'Processing', items: [{ name: 'USB-C Cable', quantity: 3 }, { name: 'Phone Case', quantity: 1 }], total: 34.5, estimatedDelivery: new Date(Date.now() + 5 * 86400000) },
    { id: 'ORD-1003', status: 'Delivered', items: [{ name: 'Mechanical Keyboard', quantity: 1 }], total: 129.0, estimatedDelivery: null },
  ];
  for (const order of demoOrders) {
    await prisma.demoOrder.upsert({ where: { id: order.id }, update: {}, create: order });
  }
  console.log(`Seeded ${demoOrders.length} demo orders.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
