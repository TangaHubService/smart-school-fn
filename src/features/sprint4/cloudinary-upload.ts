import { ApiClientError } from '../../types/api';
import {
  signUploadApi,
  UploadedAssetPayload,
} from './lms.api';

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  bytes?: number;
  format?: string;
  resource_type: 'image' | 'video' | 'raw' | string;
}

function mapResourceType(resourceType: string): UploadedAssetPayload['resourceType'] {
  if (resourceType === 'image') {
    return 'IMAGE';
  }

  if (resourceType === 'video') {
    return 'VIDEO';
  }

  return 'RAW';
}

export async function uploadFileToCloudinary(
  accessToken: string,
  purpose: 'lesson' | 'assignment' | 'submission',
  file: File,
): Promise<UploadedAssetPayload> {
  const signed = await signUploadApi(accessToken, {
    purpose,
    fileName: file.name,
  });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signed.apiKey);
  form.append('timestamp', String(signed.timestamp));
  form.append('folder', signed.folder);
  form.append('signature', signed.signature);

  const response = await fetch(signed.uploadUrl, {
    method: 'POST',
    body: form,
  });

  const body = (await response.json()) as
    | CloudinaryUploadResponse
    | { error?: { message?: string } };

  if (!response.ok || !('public_id' in body)) {
    throw new ApiClientError(
      response.status,
      'CLOUDINARY_UPLOAD_FAILED',
      'Could not upload file',
      'error' in body ? body.error ?? null : null,
    );
  }

  return {
    publicId: body.public_id,
    secureUrl: body.secure_url,
    originalName: file.name,
    bytes: body.bytes,
    format: body.format,
    mimeType: file.type || undefined,
    resourceType: mapResourceType(body.resource_type),
  };
}
