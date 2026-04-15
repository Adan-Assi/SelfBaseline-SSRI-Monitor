"""
Shared dependencies — initialised once in main.py and imported everywhere.
"""

from supabase import Client

# Populated by main.py at startup
supabase: Client = None  # type: ignore
