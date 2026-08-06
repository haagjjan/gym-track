export interface OperatorNotifier {
  notifyBetaRequest(reference: string, requestedAt: Date): Promise<void>;
}

export const noopOperatorNotifier: OperatorNotifier = {
  async notifyBetaRequest() {}
};

export function createTelegramOperatorNotifier(options: {
  botToken: string;
  chatId: string;
}): OperatorNotifier {
  return {
    async notifyBetaRequest(reference, requestedAt) {
      const response = await fetch(`https://api.telegram.org/bot${options.botToken}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: options.chatId,
          text: `New Founding Beta request\nReference: ${reference}\nReceived: ${requestedAt.toISOString()}`
        }),
        signal: AbortSignal.timeout(5_000)
      });

      if (!response.ok) throw new Error(`Telegram notification failed with ${response.status}`);
    }
  };
}
