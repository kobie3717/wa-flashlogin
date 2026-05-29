export interface WAAdapter {
  onMessage(handler: (msg: { from: string; text: string }) => void): () => void;
}

export interface BaileysMessage {
  key: {
    remoteJid?: string;
    fromMe?: boolean;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
  };
}

export interface BaileysSock {
  ev: {
    on(event: 'messages.upsert', handler: (update: { messages: BaileysMessage[]; type: string }) => void): void;
    off(event: 'messages.upsert', handler: (update: { messages: BaileysMessage[]; type: string }) => void): void;
  };
}
