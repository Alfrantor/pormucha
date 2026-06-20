import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME!;
const REGION = process.env.AWS_REGION!;

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { signedUrl, fileUrl };
}

export async function getPresignedDownloadUrl(fileUrl: string) {
  // Extraer la key desde la URL almacenada
  const prefix = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`;
  const key = fileUrl.startsWith(prefix) ? fileUrl.slice(prefix.length) : fileUrl;
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hora
}
