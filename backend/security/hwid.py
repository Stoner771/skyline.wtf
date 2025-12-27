import hashlib


def hash_hwid(hwid: str) -> str:
    return hashlib.sha256(hwid.encode()).hexdigest()

