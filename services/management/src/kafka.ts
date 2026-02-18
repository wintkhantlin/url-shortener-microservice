import { Kafka, type Producer } from 'kafkajs';

let producer: Producer | null = null;

const kafka = new Kafka({
  clientId: 'management-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

export async function getProducer(): Promise<Producer> {
  if (producer) {
    return producer;
  }

  producer = kafka.producer();
  await producer.connect();
  console.log('Kafka producer connected');
  return producer;
}

export async function sendEvent(topic: string, message: any) {
    const p = await getProducer();
    await p.send({
        topic,
        messages: [
            { value: JSON.stringify(message) }
        ]
    });
}
