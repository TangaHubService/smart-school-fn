import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDefaultLandingPath } from '../src/features/auth/auth-helpers';
import { uploadFileToCloudinary } from '../src/features/sprint4/cloudinary-upload';

vi.mock('../src/features/sprint4/lms.api', () => ({
  signUploadApi: vi.fn().mockResolvedValue({
    cloudName: 'demo-cloud',
    apiKey: 'api-key',
    timestamp: 1234567890,
    folder: 'smart-school/tenant/lesson',
    signature: 'signed-value',
    uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/auto/upload',
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sprint 4 lms helpers', () => {
  it('routes students to the LMS feed by default', () => {
    const path = getDefaultLandingPath({
      id: 'user-1',
      tenant: {
        id: 'tenant-1',
        code: 'gs-rwanda',
        name: 'Green School Rwanda',
      },
      school: null,
      email: 'student@school.rw',
      firstName: 'Alice',
      lastName: 'Uwase',
      roles: ['STUDENT'],
      permissions: ['students.my_courses.read', 'assignments.submit'],
      student: {
        id: 'student-1',
        studentCode: 'STU-001',
        firstName: 'Alice',
        lastName: 'Uwase',
        currentEnrollment: null,
      },
    });

    expect(path).toBe('/student/courses');
  });

  it('uploads a file through signed Cloudinary upload metadata', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          public_id: 'smart-school/tenant/lesson/file-1',
          secure_url: 'https://res.cloudinary.com/demo/file/upload/v1/file.pdf',
          bytes: 2048,
          format: 'pdf',
          resource_type: 'raw',
        }),
      } as Response);

    const payload = await uploadFileToCloudinary(
      'token-1',
      'lesson',
      new File(['hello'], 'lesson.pdf', { type: 'application/pdf' }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({
      publicId: 'smart-school/tenant/lesson/file-1',
      secureUrl: 'https://res.cloudinary.com/demo/file/upload/v1/file.pdf',
      originalName: 'lesson.pdf',
      bytes: 2048,
      format: 'pdf',
      mimeType: 'application/pdf',
      resourceType: 'RAW',
    });
  });
});
