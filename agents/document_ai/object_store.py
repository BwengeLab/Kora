from __future__ import annotations

import hashlib
import io
from typing import Protocol


class DocumentObjectStore(Protocol):
    def write_verified(
        self, object_key: str, content: bytes, expected_sha256: str, max_bytes: int
    ) -> None: ...

    def read_verified(
        self, object_key: str, expected_sha256: str, max_bytes: int
    ) -> bytes: ...


class MemoryDocumentObjectStore:
    def __init__(self, objects: dict[str, bytes] | None = None) -> None:
        self.objects = dict(objects or {})

    def write_verified(
        self, object_key: str, content: bytes, expected_sha256: str, max_bytes: int
    ) -> None:
        _verify(content, expected_sha256, max_bytes)
        existing = self.objects.get(object_key)
        if existing is not None and existing != content:
            raise ValueError("immutable document object already exists with other content")
        self.objects[object_key] = content

    def read_verified(
        self, object_key: str, expected_sha256: str, max_bytes: int
    ) -> bytes:
        if object_key not in self.objects:
            raise ValueError("document object not found")
        content = self.objects[object_key]
        _verify(content, expected_sha256, max_bytes)
        return content


class MinioDocumentObjectStore:
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool = False,
    ) -> None:
        from minio import Minio  # type: ignore[import-not-found]

        self.client = Minio(
            endpoint, access_key=access_key, secret_key=secret_key, secure=secure
        )
        self.bucket = bucket
        if not self.client.bucket_exists(bucket):
            self.client.make_bucket(bucket)

    def write_verified(
        self, object_key: str, content: bytes, expected_sha256: str, max_bytes: int
    ) -> None:
        from minio.error import S3Error  # type: ignore[import-not-found]

        _verify(content, expected_sha256, max_bytes)
        try:
            self.client.stat_object(self.bucket, object_key)
        except S3Error as exc:
            if exc.code not in {"NoSuchKey", "NoSuchObject", "NoSuchBucket"}:
                raise
        else:
            self.read_verified(object_key, expected_sha256, max_bytes)
            return
        self.client.put_object(
            self.bucket,
            object_key,
            io.BytesIO(content),
            len(content),
            content_type="application/octet-stream",
            metadata={"sha256": expected_sha256},
        )

    def read_verified(
        self, object_key: str, expected_sha256: str, max_bytes: int
    ) -> bytes:
        metadata = self.client.stat_object(self.bucket, object_key)
        if metadata.size is None or metadata.size > max_bytes:
            raise ValueError("stored document exceeds extraction size limit")
        response = self.client.get_object(self.bucket, object_key)
        try:
            chunks: list[bytes] = []
            total = 0
            for chunk in response.stream(64 * 1024):
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError("stored document exceeds extraction size limit")
                chunks.append(chunk)
            content = b"".join(chunks)
        finally:
            response.close()
            response.release_conn()
        _verify(content, expected_sha256, max_bytes)
        return content


def _verify(content: bytes, expected_sha256: str, max_bytes: int) -> None:
    if len(content) > max_bytes:
        raise ValueError("stored document exceeds extraction size limit")
    actual = hashlib.sha256(content).hexdigest()
    if actual != expected_sha256:
        raise ValueError("stored document fingerprint does not match ingestion record")
