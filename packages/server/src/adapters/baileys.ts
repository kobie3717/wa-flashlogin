import { WAAdapter } from './types.js';
import type { BaileysSock, BaileysMessage } from './types.js';

export interface BaileysAdapterOptions {
  sock: BaileysSock;
  botJid: string;
}

export class BaileysAdapter implements WAAdapter {
  private sock: BaileysSock;
  public botJid: string;

  constructor(options: BaileysAdapterOptions) {
    this.sock = options.sock;
    this.botJid = options.botJid;
  }

  onMessage(handler: (msg: { from: string; text: string }) => void): () => void {
    const listener = (update: { messages: BaileysMessage[]; type: string }) => {
      if (update.type !== 'notify') return;

      for (const msg of update.messages) {
        if (msg.key.fromMe) continue;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) continue;

        const from = this.normalizeJid(remoteJid);
        const text = this.extractText(msg);

        if (text) {
          handler({ from, text });
        }
      }
    };

    this.sock.ev.on('messages.upsert', listener);

    return () => {
      this.sock.ev.off('messages.upsert', listener);
    };
  }

  private normalizeJid(jid: string): string {
    return jid.replace(/@s\.whatsapp\.net$/, '');
  }

  private extractText(msg: BaileysMessage): string | null {
    const conversation = msg.message?.conversation;
    if (conversation) return conversation;

    const extendedText = msg.message?.extendedTextMessage?.text;
    if (extendedText) return extendedText;

    return null;
  }
}
