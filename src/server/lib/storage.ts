export type S3Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  bucket: string;
};

export function getS3Config(): S3Config {
  const endpoint = process.env.RUSTFS_ENDPOINT || process.env.S3_ENDPOINT;
  const accessKeyId = process.env.RUSTFS_ACCESS_KEY || process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.RUSTFS_SECRET_KEY || process.env.S3_SECRET_KEY;
  const publicBaseUrl = process.env.RUSTFS_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL;

  if (!endpoint || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error(
      "Konfigurasi S3/RustFS belum lengkap. " +
        "Pastikan RUSTFS_ENDPOINT, RUSTFS_ACCESS_KEY, RUSTFS_SECRET_KEY, dan RUSTFS_PUBLIC_BASE_URL sudah diatur."
    );
  }

  return {
    endpoint,
    region: process.env.RUSTFS_REGION || process.env.S3_REGION || "us-east-1",
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    bucket: process.env.RUSTFS_BUCKET || process.env.S3_BUCKET || "idetech-assets"
  };
}
