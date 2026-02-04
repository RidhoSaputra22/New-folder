from sqlmodel import SQLModel, create_engine, Session
from .settings import settings

# SQLite specific: check_same_thread=False for FastAPI async
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(
    settings.database_url, 
    connect_args=connect_args,
    echo=settings.app_env == "dev"  # Log SQL in dev mode
)

def init_db() -> None:
    """Initialize database tables"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Get database session for dependency injection"""
    with Session(engine) as session:
        yield session
