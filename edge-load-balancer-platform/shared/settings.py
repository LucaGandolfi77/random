from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_env: str = 'local'
    aws_region: str = 'eu-west-1'
    platform_db_path: str = './runtime/platform.db'
    s3_context_dir: str = './examples/s3-context'
    broker_base_url: str = 'http://127.0.0.1:8000'
    sovereign_base_url: str = 'http://127.0.0.1:8010'
    poll_interval_seconds: int = 2

    def db_path(self) -> Path:
        path = Path(self.platform_db_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def context_dir(self) -> Path:
        path = Path(self.s3_context_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
