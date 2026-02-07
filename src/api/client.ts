import axios, { AxiosInstance, AxiosError, type AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { weapi, linuxapi, eapi } from './crypto.js';
import { getAuthManager } from '../auth/manager.js';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import { verbose, debug } from '../output/logger.js';

// Force IPv4 to avoid IPv6 CDN hotlink protection issues
const httpAgent = new http.Agent({ family: 4 });
const httpsAgent = new https.Agent({ family: 4 });

const BASE_URL = 'https://music.163.com';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';

export type CryptoType = 'weapi' | 'linuxapi' | 'eapi';

export interface RequestOptions {
  crypto?: CryptoType;
  url?: string;
}

export class ApiClient {
  private client: AxiosInstance;

  private readonly sDeviceId = `unknown-${Math.floor(Math.random() * 1000000)}`;
  private readonly nmtid = crypto.randomBytes(16).toString('hex');

  private sessionCookies: Record<string, string> = {};

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: requestTimeout,
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://music.163.com',
      },
    });
  }

  updateTimeout(ms: number): void {
    this.client.defaults.timeout = ms;
  }

  private collectCookies(response: AxiosResponse): void {
    const setCookieHeaders = response.headers['set-cookie'];
    if (!setCookieHeaders) return;
    for (const header of setCookieHeaders) {
      const match = header.match(/^([^=]+)=([^;]*)/);
      if (match) {
        this.sessionCookies[match[1]] = match[2];
      }
    }
  }

  private getCookieHeader(endpoint?: string): string {
    const authManager = getAuthManager();
    const userCookies = authManager.getCookieString();

    const parts: string[] = [
      'os=pc',
      `sDeviceId=${this.sDeviceId}`,
      '__remember_me=true',
    ];

    if (endpoint && endpoint.includes('login')) {
      parts.push(`NMTID=${this.nmtid}`);
    }

    if (userCookies) {
      parts.push(userCookies);
    }

    for (const [name, value] of Object.entries(this.sessionCookies)) {
      parts.push(`${name}=${value}`);
    }

    return parts.join('; ');
  }

  async request<T>(
    endpoint: string,
    data: object = {},
    options: RequestOptions = {}
  ): Promise<T> {
    const { crypto: cryptoType = 'weapi' } = options;

    let url: string;
    let postData: Record<string, string>;

    const requestData = { ...data };

    switch (cryptoType) {
      case 'weapi': {
        url = `/weapi${endpoint}`;
        const encrypted = weapi(requestData);
        postData = {
          params: encrypted.params,
          encSecKey: encrypted.encSecKey,
        };
        break;
      }
      case 'linuxapi': {
        url = '/api/linux/forward';
        const encrypted = linuxapi({
          method: 'POST',
          url: `${BASE_URL}/api${endpoint}`,
          params: requestData,
        });
        postData = { eparams: encrypted.eparams };
        break;
      }
      case 'eapi': {
        const eapiUrl = options.url || `/api${endpoint}`;
        url = `/eapi${endpoint}`;
        const encrypted = eapi(eapiUrl, requestData);
        postData = { params: encrypted.params };
        break;
      }
    }

    verbose(`${cryptoType.toUpperCase()} ${endpoint}`);
    debug(`POST ${url}`);

    try {
      const response = await this.client.post<T>(url, new URLSearchParams(postData).toString(), {
        headers: {
          Cookie: this.getCookieHeader(endpoint),
        },
      });

      this.collectCookies(response);

      const responseData = response.data as { code?: number; message?: string; msg?: string };
      debug(`Response code: ${responseData.code ?? 200}`);
      if (responseData.code && responseData.code !== 200) {
        const msg = responseData.message || responseData.msg || 'Unknown error';
        throw new Error(`${msg} (code: ${responseData.code})`);
      }

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response) this.collectCookies(error.response);
        debug(`HTTP error: ${error.response?.status ?? error.code}`);
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new Error('Network connection failed');
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication failed, please re-login');
        }
        if (error.response?.status === 403) {
          throw new Error('Access denied, login required or cookie expired');
        }
        throw new Error(`Request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async download(url: string, destPath: string): Promise<void> {
    verbose(`Downloading ${url}`);
    const response = await axios.get<Readable>(url, {
      responseType: 'stream',
      timeout: 120000,
      httpAgent,
      httpsAgent,
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://music.163.com/',
      },
    });
    await pipeline(response.data, fs.createWriteStream(destPath));
  }
}

let requestTimeout = 30000;

export function setRequestTimeout(ms: number): void {
  requestTimeout = ms;
  if (clientInstance) {
    clientInstance.updateTimeout(ms);
  }
}

let clientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!clientInstance) {
    clientInstance = new ApiClient();
  }
  return clientInstance;
}
