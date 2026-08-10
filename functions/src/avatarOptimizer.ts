import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const AVATAR_SIZE_PX = 256;
export const AVATAR_QUALITY = 80;
export const AVATAR_OPTIMIZED_FLAG = "sgroupsAvatarOptimized";

type StorageMetadataValue = string | number | boolean | null | undefined;

interface AvatarFileMetadata {
  contentType?: string;
  metadata?: Record<string, StorageMetadataValue>;
  firebaseStorageDownloadTokens?: string;
}

interface AvatarFile {
  exists(): Promise<[boolean]>;
  getMetadata(): Promise<[AvatarFileMetadata, ...unknown[]]>;
  download(): Promise<[Buffer]>;
  save(
    data: Buffer,
    options: {
      resumable: false;
      contentType: string;
      metadata: {
        cacheControl: string;
        metadata: Record<string, string>;
      };
    },
  ): Promise<unknown>;
}

interface AvatarBucket {
  name: string;
  file(path: string): AvatarFile;
}

export interface OptimizeAvatarResult {
  optimized: boolean;
  downloadUrl?: string;
  beforeBytes?: number;
  afterBytes?: number;
}

const avatarPathPattern = /^users\/([^/]+)\/avatar\.([a-zA-Z0-9]+)$/;

export const getAvatarUidFromPath = (path: string) => {
  const match = avatarPathPattern.exec(path);
  return match?.[1] ?? null;
};

export const isSupportedImageType = (contentType?: string) =>
  contentType === "image/jpeg" ||
  contentType === "image/png" ||
  contentType === "image/webp";

const normalizeCustomMetadata = (
  metadata: Record<string, StorageMetadataValue> = {},
) =>
  Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) =>
      value === null || value === undefined ? [] : [[key, String(value)]],
    ),
  );

const encodeStoragePath = (path: string) =>
  encodeURIComponent(path).replace(/\(/g, "%28").replace(/\)/g, "%29");

const buildDownloadUrl = (bucketName: string, path: string, token: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeStoragePath(
    path,
  )}?alt=media&token=${token}`;

const compressAvatar = async (input: Buffer, contentType: string) => {
  const image = sharp(input)
    .rotate()
    .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, {
      fit: "cover",
      position: "center",
      withoutEnlargement: true,
    });

  if (contentType === "image/png") {
    return image.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  }

  if (contentType === "image/webp") {
    return image.webp({ quality: AVATAR_QUALITY }).toBuffer();
  }

  return image.jpeg({ quality: AVATAR_QUALITY, mozjpeg: true }).toBuffer();
};

export const optimizeAvatarFile = async (
  bucket: AvatarBucket,
  path: string,
): Promise<OptimizeAvatarResult> => {
  const file = bucket.file(path);
  const [exists] = await file.exists();

  if (!exists) {
    return { optimized: false };
  }

  const [metadata] = await file.getMetadata();
  const contentType = metadata.contentType;
  const customMetadata = normalizeCustomMetadata(metadata.metadata);

  if (
    customMetadata[AVATAR_OPTIMIZED_FLAG] === "true" ||
    !isSupportedImageType(contentType)
  ) {
    return { optimized: false };
  }

  const [inputBuffer] = await file.download();
  const outputBuffer = await compressAvatar(inputBuffer, contentType);
  const downloadToken = String(
    customMetadata.firebaseStorageDownloadTokens ??
      metadata.firebaseStorageDownloadTokens ??
      randomUUID(),
  );

  await file.save(outputBuffer, {
    resumable: false,
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000",
      metadata: {
        ...customMetadata,
        firebaseStorageDownloadTokens: downloadToken,
        [AVATAR_OPTIMIZED_FLAG]: "true",
        originalSizeBytes: String(inputBuffer.byteLength),
        optimizedSizeBytes: String(outputBuffer.byteLength),
        optimizedWidth: String(AVATAR_SIZE_PX),
        optimizedHeight: String(AVATAR_SIZE_PX),
      },
    },
  });

  return {
    optimized: true,
    downloadUrl: buildDownloadUrl(bucket.name, path, downloadToken),
    beforeBytes: inputBuffer.byteLength,
    afterBytes: outputBuffer.byteLength,
  };
};
