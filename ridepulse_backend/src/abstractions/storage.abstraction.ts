export interface UploadResult {
  url: string;
  key: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface StorageProvider {
  uploadFile(buffer: Buffer, filename: string, mimeType: string, folder?: string): Promise<UploadResult>;
  deleteFile(key: string): Promise<boolean>;
  getPresignedUploadUrl(filename: string, mimeType: string): Promise<{ uploadUrl: string; fileKey: string }>;
}

export class MockStorageProvider implements StorageProvider {
  async uploadFile(buffer: Buffer, filename: string, mimeType: string, folder = 'uploads'): Promise<UploadResult> {
    const fileKey = `${folder}/${Date.now()}_${filename}`;
    return {
      url: `https://storage.ridepulse.local/${fileKey}`,
      key: fileKey,
      mimeType,
      sizeBytes: buffer.length
    };
  }

  async deleteFile(key: string): Promise<boolean> {
    console.log(`[MockStorageProvider] Deleted file: ${key}`);
    return true;
  }

  async getPresignedUploadUrl(filename: string, _mimeType: string): Promise<{ uploadUrl: string; fileKey: string }> {
    const fileKey = `uploads/${Date.now()}_${filename}`;
    return {
      uploadUrl: `https://storage.ridepulse.local/presigned/${fileKey}?token=mock_upload_token`,
      fileKey
    };
  }
}
