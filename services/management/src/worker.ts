import { Kafka } from 'kafkajs';
import db from './db';
import { alias } from './db/schema';
import { eq } from 'drizzle-orm';

const brokers = process.env.KAFKA_BROKER ? [process.env.KAFKA_BROKER] : [];
if (brokers.length === 0) {
  throw new Error('KAFKA_BROKER environment variable is not defined');
}

const kafka = new Kafka({
  clientId: 'management-worker',
  brokers,
});

const consumer = kafka.consumer({ groupId: 'management-alias-checked-group' });

const run = async () => {
  console.log("Starting Management Worker...");
  await consumer.connect();
  console.log("Connected to Kafka");
  await consumer.subscribe({ topic: 'alias.checked', fromBeginning: false });
  console.log("Subscribed to alias.checked");

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const value = message.value?.toString();
        if (!value) return;

        const data = JSON.parse(value);
        const { code, is_safe, score } = data;

        console.log(`Received check result for ${code}: is_safe=${is_safe}, score=${score}`);

        if (code) {
            // Update the alias
            await db.update(alias)
                .set({ 
                    should_warn: !is_safe 
                })
                .where(eq(alias.code, code));
            
            console.log(`Updated alias ${code} with should_warn=${!is_safe}`);
        }

      } catch (error) {
        console.error('Error processing message:', error);
      }
    },
  });
};

run().catch(console.error);
