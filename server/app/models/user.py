from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class User:
    id: int
    username: str
    email: str
    clerk_id: str
    bio: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def from_db(cls, row):
        if not row:
            return None
            
        # Convert row to dict and set defaults for missing fields
        data = dict(row)
        data.setdefault('bio', None)
        data.setdefault('image_url', None)
        data.setdefault('created_at', None)
        data.setdefault('updated_at', None)
        
        return cls(**data)