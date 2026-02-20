import crypto from 'crypto';

const SECRET = process.env.DUO_INV_TOKEN_SECRET!;

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

export function createDuoToken(senderPubkey: string, receiverPubkey: string) {
  const payload = JSON.stringify({
    sender: senderPubkey,
    receiver: receiverPubkey,
  });

  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest();

  return `${base64url(payload)}.${base64url(signature)}`;
}

export function verifyDuoToken(token: string) {
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) {
    const err: any = new Error('Invalid invitation token');
    err.statusCode = 400;
    throw err;
  }

  const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

  if (expectedSig !== sigB64) {
    const err: any = new Error('Invalid signature');
    err.statusCode = 400;
    throw err;
  }

  return JSON.parse(payload) as {
    sender: string;
    receiver: string;
  };
}
