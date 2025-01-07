from dataclasses import dataclass
from datetime import datetime

@dataclass
class User:
    id: int
    clerk_id: str
    username: str
    email: str

    @classmethod
    def from_db(cls, row):
        return cls(**row) if row else None