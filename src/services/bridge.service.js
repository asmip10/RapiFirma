import axios from 'axios';
import { BRIDGE_CONFIG } from '../config/bridge.config';

const bridgeApi = axios.create({
  baseURL: BRIDGE_CONFIG.BASE_URL,
  timeout: BRIDGE_CONFIG.TIMEOUT
});

function getBridgeHeaders() {
  return {
    'X-Bridge-Token': BRIDGE_CONFIG.TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

export const bridgeService = {
  async startSign({ fileName, timeoutMinutes = 15, documentId, accessToken }) {
    if (!fileName) {
      throw new Error('fileName is required');
    }
    if (!documentId) {
      throw new Error('documentId is required');
    }
    if (!accessToken) {
      throw new Error('accessToken is required');
    }

    const payload = {
      fileName,
      timeoutMinutes,
      token: BRIDGE_CONFIG.TOKEN,
      documentId,
      accessToken
    };

    const { data } = await bridgeApi.post('/api/v1/sign/start', payload, {
      headers: getBridgeHeaders()
    });
    return data;
  },

  async getStatus(operationId) {
    if (!operationId) {
      throw new Error('operationId is required');
    }

    const { data } = await bridgeApi.get(`/api/v1/sign/status/${operationId}`, {
      headers: getBridgeHeaders()
    });
    return data;
  },

  async getFile(operationId) {
    if (!operationId) {
      throw new Error('operationId is required');
    }

    const { data } = await bridgeApi.get(`/api/v1/sign/file/${operationId}`, {
      headers: getBridgeHeaders(),
      responseType: 'blob'
    });
    return data;
  }
};

export default bridgeService;
