import secrets
import string


def generate_license_key(length: int = 24) -> str:
    alphabet = string.ascii_uppercase + string.digits
    key = ''.join(secrets.choice(alphabet) for _ in range(length))
    return f"{key[:8]}-{key[8:16]}-{key[16:24]}"

