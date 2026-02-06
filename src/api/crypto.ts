import * as crypto from 'crypto';

// 网易云音乐 API 加密相关常量
const IV = '0102030405060708';
const PRESET_KEY = '0CoJUm6Qyw8W8jud';
const PUBLIC_KEY =
  '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB\n-----END PUBLIC KEY-----';
const EAPI_KEY = 'e82ckenh8dichen8';
const LINUX_API_KEY = 'rFgB&h#%2?^eDg:Q';

// 生成随机字符串
function createSecretKey(size: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < size; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// AES-128-CBC 加密
function aesEncrypt(text: string, key: string, iv: string = IV): string {
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// RSA 加密
function rsaEncrypt(text: string, pubKey: string): string {
  const reversedText = text.split('').reverse().join('');
  // RSA 1024 位密钥 = 128 字节
  const buffer = Buffer.alloc(128, 0);
  // 将反转后的密钥从右侧（尾部）开始填充
  const textBuffer = Buffer.from(reversedText);
  textBuffer.copy(buffer, 128 - textBuffer.length);

  const encrypted = crypto.publicEncrypt(
    {
      key: pubKey,
      padding: crypto.constants.RSA_NO_PADDING,
    },
    buffer
  );
  return encrypted.toString('hex');
}

// MD5 哈希
function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

// 加密方式1: weapi (网页端)
export interface WeapiResult {
  params: string;
  encSecKey: string;
}

export function weapi(data: object): WeapiResult {
  const text = JSON.stringify(data);
  const secretKey = createSecretKey(16);

  // 第一次 AES 加密
  const params1 = aesEncrypt(text, PRESET_KEY, IV);
  // 第二次 AES 加密
  const params = aesEncrypt(params1, secretKey, IV);

  // RSA 加密 secretKey
  const encSecKey = rsaEncrypt(secretKey, PUBLIC_KEY);

  return { params, encSecKey };
}

// 加密方式2: linuxapi (Linux 客户端)
export interface LinuxapiResult {
  eparams: string;
}

export function linuxapi(data: object): LinuxapiResult {
  const text = JSON.stringify(data);
  const cipher = crypto.createCipheriv('aes-128-ecb', LINUX_API_KEY, '');
  let eparams = cipher.update(text, 'utf8', 'hex').toUpperCase();
  eparams += cipher.final('hex').toUpperCase();
  return { eparams };
}

// 加密方式3: eapi (手机端)
export interface EapiResult {
  params: string;
}

export function eapi(url: string, data: object): EapiResult {
  const text = JSON.stringify(data);
  const message = `nobody${url}use${text}md5forencrypt`;
  const digest = md5(message);
  const params = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;

  const cipher = crypto.createCipheriv('aes-128-ecb', EAPI_KEY, '');
  let encrypted = cipher.update(params, 'utf8', 'hex').toUpperCase();
  encrypted += cipher.final('hex').toUpperCase();

  return { params: encrypted };
}

// eapi 解密响应
export function eapiDecrypt(encryptedData: string): string {
  const decipher = crypto.createDecipheriv('aes-128-ecb', EAPI_KEY, '');
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
