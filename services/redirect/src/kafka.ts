import { Kafka, Partitioners } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'redirect-service',
  brokers: ['localhost:9094'],
});

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  createPartitioner: Partitioners.DefaultPartitioner,
  retry: {
    initialRetryTime: 500,
    retries: 10,
  },
});

export const connectProducer = async () => {
  await producer.connect();
  console.log('Kafka Producer connected');
};

export const sendAnalyticsEvent = async (event: {
  code: string;
  ip: string;
  userAgent: string;
}) => {
  // Fire and forget
  producer.send({
    topic: 'analytics-event',
    messages: [
      { value: JSON.stringify(event) },
    ],
  }).catch(err => {
    console.error('Failed to send Kafka event:', err);
  });
};
