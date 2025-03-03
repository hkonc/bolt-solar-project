import { Settings, RequestLog } from './types';
import CryptoJS from 'crypto-js';

const SETTINGS_KEY = 'solar_power_settings';
const ENCRYPTION_KEY = 'solar_power_encryption_key';
const REQUEST_LOGS_KEY = 'solar_power_request_logs';

export function saveSettings(settings: Settings): void {
  try {
    const encryptedApiKey = CryptoJS.AES.encrypt(
      settings.apiKey,
      ENCRYPTION_KEY
    ).toString();
    
    const dataToSave = {
      endpointUrl: settings.endpointUrl,
      apiKey: encryptedApiKey,
    };
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function getSettings(): Settings | null {
  try {
    const savedData = localStorage.getItem(SETTINGS_KEY);
    
    if (!savedData) {
      return null;
    }
    
    const parsedData = JSON.parse(savedData);
    
    const decryptedApiKey = CryptoJS.AES.decrypt(
      parsedData.apiKey,
      ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);
    
    return {
      endpointUrl: parsedData.endpointUrl,
      apiKey: decryptedApiKey,
    };
  } catch (error) {
    console.error('Failed to retrieve settings:', error);
    return null;
  }
}

export function logRequest(requestLog: RequestLog): void {
  try {
    // Get existing logs
    const existingLogsJson = localStorage.getItem(REQUEST_LOGS_KEY);
    const existingLogs: RequestLog[] = existingLogsJson ? JSON.parse(existingLogsJson) : [];
    
    // Add new log
    existingLogs.push(requestLog);
    
    // Save back to localStorage
    localStorage.setItem(REQUEST_LOGS_KEY, JSON.stringify(existingLogs));
  } catch (error) {
    console.error('Failed to save request log:', error);
  }
}

export function getRequestLogs(): RequestLog[] {
  try {
    const logsJson = localStorage.getItem(REQUEST_LOGS_KEY);
    return logsJson ? JSON.parse(logsJson) : [];
  } catch (error) {
    console.error('Failed to retrieve request logs:', error);
    return [];
  }
}

export function clearRequestLogs(): void {
  try {
    localStorage.removeItem(REQUEST_LOGS_KEY);
  } catch (error) {
    console.error('Failed to clear request logs:', error);
  }
}