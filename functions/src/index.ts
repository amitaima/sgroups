import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import {
  getAvatarUidFromPath,
  isSupportedImageType,
  optimizeAvatarFile,
} from "./avatarOptimizer.js";

initializeApp();

const auth = getAuth();
const db = getFirestore();

const syncUserPhotoUrl = async (uid: string, photoURL: string) => {
  await Promise.all([
    db.collection("users").doc(uid).set({ photoURL }, { merge: true }),
    auth.updateUser(uid, { photoURL }),
  ]);
};

const getAdminUids = () =>
  (process.env.ADMIN_UIDS ?? "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);

const assertAdmin = async (authorizationHeader?: string) => {
  const token = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    throw new Error("Missing authorization token");
  }

  const decodedToken = await auth.verifyIdToken(token);
  const adminUids = getAdminUids();

  if (!adminUids.length || !adminUids.includes(decodedToken.uid)) {
    throw new Error("User is not allowed to run avatar migration");
  }

  return decodedToken.uid;
};

export const optimizeNewProfileAvatar = onObjectFinalized(
  {
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const path = event.data.name;
    const contentType = event.data.contentType;

    if (!path || !isSupportedImageType(contentType)) {
      return;
    }

    const uid = getAvatarUidFromPath(path);

    if (!uid) {
      return;
    }

    const result = await optimizeAvatarFile(
      getStorage().bucket(event.data.bucket),
      path,
    );

    if (!result.optimized || !result.downloadUrl) {
      return;
    }

    await syncUserPhotoUrl(uid, result.downloadUrl);

    logger.info("Optimized profile avatar", {
      uid,
      path,
      beforeBytes: result.beforeBytes,
      afterBytes: result.afterBytes,
    });
  },
);

export const optimizeExistingProfileAvatars = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (request, response) => {
    try {
      const callerUid = await assertAdmin(request.header("authorization"));
      const bucket = getStorage().bucket();
      const [files] = await bucket.getFiles({ prefix: "users/" });
      const avatarFiles = files.filter((file) => getAvatarUidFromPath(file.name));
      const results = [];

      for (const file of avatarFiles) {
        const uid = getAvatarUidFromPath(file.name);

        if (!uid) {
          continue;
        }

        const result = await optimizeAvatarFile(bucket, file.name);

        if (result.optimized && result.downloadUrl) {
          await syncUserPhotoUrl(uid, result.downloadUrl);
        }

        results.push({
          uid,
          path: file.name,
          optimized: result.optimized,
          beforeBytes: result.beforeBytes ?? null,
          afterBytes: result.afterBytes ?? null,
        });
      }

      logger.info("Optimized existing profile avatars", {
        callerUid,
        checked: avatarFiles.length,
        optimized: results.filter((result) => result.optimized).length,
      });

      response.status(200).json({
        checked: avatarFiles.length,
        optimized: results.filter((result) => result.optimized).length,
        results,
      });
    } catch (error) {
      logger.error("Failed to optimize existing profile avatars", error);
      response.status(403).json({ error: "Not authorized" });
    }
  },
);
