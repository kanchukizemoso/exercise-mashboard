import anthropic
import os

api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    print("ERROR: ANTHROPIC_API_KEY is not set.")
    print("Run: export ANTHROPIC_API_KEY='your-key-here'")
    exit(1)

print(f"Testing API key: {api_key[:8]}...{api_key[-4:]}")

try:
    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=64,
        messages=[{"role": "user", "content": "Say 'API key works!' and nothing else."}],
    )
    print("SUCCESS:", response.content[0].text)
    print(f"Tokens used: {response.usage.input_tokens} in / {response.usage.output_tokens} out")
except anthropic.AuthenticationError:
    print("FAILED: Invalid API key.")
except anthropic.PermissionDeniedError:
    print("FAILED: API key lacks permission.")
except Exception as e:
    print(f"FAILED: {e}")
