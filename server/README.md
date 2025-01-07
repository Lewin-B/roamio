# Roamio Backend Server

This is the backend server for Roamio, built with Quart (async Flask) and PostgreSQL.

## Prerequisites

- Python 3.11 or higher
- PostgreSQL database (Neon)
- Git

## Setup

1. Clone the repository:

```bash
git clone [your-repository-url]
cd server
```

1. Create and activate a virtual environment:

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate on macOS/Linux
source venv/bin/activate

# Activate on Windows
venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@db.example.neon.tech/dbname?

# Other env variables...
```
