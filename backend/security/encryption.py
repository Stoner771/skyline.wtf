from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import base64
import os
import json

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef").encode()[:32]


def encrypt_response(data: dict) -> str:
    try:
        data_str = json.dumps(data)
        cipher = AES.new(ENCRYPTION_KEY, AES.MODE_CBC)
        iv = cipher.iv
        padded_data = pad(data_str.encode(), AES.block_size)
        encrypted = cipher.encrypt(padded_data)
        return base64.b64encode(iv + encrypted).decode()
    except Exception:
        return json.dumps(data)


def decrypt_request(encrypted_data: str) -> dict:
    try:
        data = base64.b64decode(encrypted_data)
        iv = data[:16]
        encrypted = data[16:]
        cipher = AES.new(ENCRYPTION_KEY, AES.MODE_CBC, iv)
        decrypted = unpad(cipher.decrypt(encrypted), AES.block_size)
        return json.loads(decrypted.decode())
    except Exception:
        return {}

