import base64
import hashlib
import hmac
import json
import unittest

from agents.runtime.auth import verify_gateway_token


class GatewayAuthTests(unittest.TestCase):
    def test_valid_token_and_tampering(self) -> None:
        token = sign({"sub": "user-1", "org": "org-1", "exp": 200}, "secret")
        identity = verify_gateway_token(token, "secret", now=100)
        self.assertEqual(identity.organization_id, "org-1")
        with self.assertRaisesRegex(ValueError, "signature"):
            verify_gateway_token(token, "wrong", now=100)
        with self.assertRaisesRegex(ValueError, "expired"):
            verify_gateway_token(token, "secret", now=201)


def sign(claims: dict[str, object], secret: str) -> str:
    header = encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = encode(json.dumps(claims).encode())
    unsigned = f"{header}.{payload}"
    signature = encode(
        hmac.new(secret.encode(), unsigned.encode(), hashlib.sha256).digest()
    )
    return f"{unsigned}.{signature}"


def encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


if __name__ == "__main__":
    unittest.main()
