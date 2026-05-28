"""R2 Storage service with local fallback for Railway deployment."""

import json
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, BinaryIO, Dict, Any
import asyncio

import boto3
from botocore.exceptions import ClientError

from .config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Handles session storage with R2 primary and local fallback."""
    
    def __init__(self):
        self._s3_client = None
        self._local_path = Path(settings.LOCAL_STORAGE_PATH)
        self._init_local_storage()
    
    def _init_local_storage(self) -> None:
        """Ensure local storage directory exists."""
        self._local_path.mkdir(parents=True, exist_ok=True)
    
    @property
    def s3_client(self):
        """Get or create S3 client for R2."""
        if self._s3_client is None and settings.r2_enabled:
            try:
                self._s3_client = boto3.client(
                    "s3",
                    endpoint_url=settings.R2_ENDPOINT_URL,
                    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                )
                logger.info("R2 storage initialized")
            except Exception as e:
                logger.error(f"Failed to initialize R2: {e}")
                self._s3_client = None
        return self._s3_client
    
    # ==================== Session Storage ====================
    
    async def save_session(
        self,
        session_id: str,
        data: Dict[str, Any],
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Save session data to storage."""
        result = {
            "session_id": session_id,
            "stored_in": [],
            "error": None,
        }
        
        # Always save locally as backup
        local_result = await self._save_local(session_id, data, metadata)
        if local_result["success"]:
            result["stored_in"].append("local")
        
        # Save to R2 if configured
        if settings.r2_enabled and self.s3_client:
            r2_result = await self._save_r2(session_id, data, metadata)
            if r2_result["success"]:
                result["stored_in"].append("r2")
            else:
                result["error"] = r2_result.get("error")
        
        return result
    
    async def get_session(
        self,
        session_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Get session data from storage."""
        # Try R2 first if available
        if settings.r2_enabled and self.s3_client:
            try:
                data = await self._get_r2(session_id)
                if data:
                    return data
            except Exception as e:
                logger.warning(f"R2 fetch failed, falling back: {e}")
        
        # Fallback to local
        try:
            return await self._get_local(session_id)
        except Exception as e:
            logger.error(f"Local storage fetch failed: {e}")
            return None
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session from all storage locations."""
        success = True
        
        if settings.r2_enabled and self.s3_client:
            try:
                success = success and await self._delete_r2(session_id)
            except Exception as e:
                logger.error(f"R2 delete failed: {e}")
                success = False
        
        try:
            success = success and await self._delete_local(session_id)
        except Exception as e:
            logger.error(f"Local delete failed: {e}")
            success = False
        
        return success
    
    async def get_session_url(self, session_id: str) -> Optional[str]:
        """Get public URL for session."""
        if settings.R2_PUBLIC_URL_BASE:
            return f"{settings.R2_PUBLIC_URL_BASE}/{session_id}.json"
        return None
    
    # ==================== Local Storage ====================
    
    async def _save_local(
        self,
        session_id: str,
        data: Dict[str, Any],
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Save to local filesystem."""
        try:
            session_dir = self._local_path / session_id[:2]
            session_dir.mkdir(exist_ok=True)
            
            file_path = session_dir / f"{session_id}.json"
            content = {
                "data": data,
                "metadata": metadata or {},
                "saved_at": datetime.utcnow().isoformat(),
            }
            
            with open(file_path, "w") as f:
                json.dump(content, f)
            
            return {"success": True, "path": str(file_path)}
        except Exception as e:
            logger.error(f"Local save failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _get_local(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get from local filesystem."""
        file_path = self._local_path / session_id[:2] / f"{session_id}.json"
        if not file_path.exists():
            return None
        
        with open(file_path, "r") as f:
            content = json.load(f)
        
        return content.get("data")
    
    async def _delete_local(self, session_id: str) -> bool:
        """Delete from local filesystem."""
        file_path = self._local_path / session_id[:2] / f"{session_id}.json"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    # ==================== R2 Storage ====================
    
    async def _save_r2(
        self,
        session_id: str,
        data: Dict[str, Any],
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Save to Cloudflare R2."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._save_r2_sync, session_id, data, metadata
        )
    
    def _save_r2_sync(
        self,
        session_id: str,
        data: Dict[str, Any],
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Synchronous R2 save."""
        try:
            content = {
                "data": data,
                "metadata": metadata or {},
                "saved_at": datetime.utcnow().isoformat(),
            }
            
            self.s3_client.put_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=f"sessions/{session_id}.json",
                Body=json.dumps(content),
                ContentType="application/json",
            )
            
            return {"success": True}
        except ClientError as e:
            logger.error(f"R2 save failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _get_r2(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get from Cloudflare R2."""
        if not self.s3_client:
            return None
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._get_r2_sync, session_id)
    
    def _get_r2_sync(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Synchronous R2 get."""
        try:
            response = self.s3_client.get_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=f"sessions/{session_id}.json"
            )
            content = json.loads(response["Body"].read().decode("utf-8"))
            return content.get("data")
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                return None
            raise
    
    async def _delete_r2(self, session_id: str) -> bool:
        """Delete from Cloudflare R2."""
        if not self.s3_client:
            return True
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._delete_r2_sync, session_id)
    
    def _delete_r2_sync(self, session_id: str) -> bool:
        """Synchronous R2 delete."""
        try:
            self.s3_client.delete_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=f"sessions/{session_id}.json"
            )
            return True
        except ClientError as e:
            logger.error(f"R2 delete failed: {e}")
            return False
    
    # ==================== Health Check ====================
    
    async def health_check(self) -> Dict[str, Any]:
        """Check storage health."""
        status = {
            "r2_configured": settings.r2_enabled,
            "r2_connected": False,
            "local_enabled": settings.USE_LOCAL_STORAGE,
            "local_accessible": False,
        }
        
        if settings.r2_enabled and self.s3_client:
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    self.s3_client.head_bucket,
                    {"Bucket": settings.R2_BUCKET_NAME}
                )
                status["r2_connected"] = True
            except Exception as e:
                logger.warning(f"R2 health check failed: {e}")
        
        try:
            test_file = self._local_path / ".healthcheck"
            test_file.write_text("ok")
            test_file.unlink()
            status["local_accessible"] = True
        except Exception as e:
            logger.error(f"Local storage health check failed: {e}")
        
        status["healthy"] = (
            status["r2_connected"] or status["local_accessible"]
        )
        
        return status


# Global storage instance
storage = StorageService()