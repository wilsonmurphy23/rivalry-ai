import json
import urllib.request
import ssl

# ==============================================================================
# CONFIGURATION
# Matches the credentials from your players.js file
# ==============================================================================
SUPABASE_URL = "https://qnplrybkdcwngzofufcw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg"


def fetch_all_players():
    """Fetches all players from Supabase."""
    all_players = []
    offset = 0
    BATCH_SIZE = 1000
    more_data = True

    print(f"🔄 Connecting to Supabase...")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    while more_data:
        url = f"{SUPABASE_URL}/rest/v1/players?select=name,position,sport&offset={offset}&limit={BATCH_SIZE}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx) as response:
                if response.getcode() == 200:
                    data = json.loads(response.read().decode())
                    if len(data) > 0:
                        all_players.extend(data)
                        offset += BATCH_SIZE
                        if len(data) < BATCH_SIZE:
                            more_data = False
                    else:
                        more_data = False
                else:
                    print(f"❌ Error: HTTP {response.getcode()}")
                    more_data = False
        except Exception as e:
            print(f"❌ Connection Error: {e}")
            more_data = False

    return all_players


def diagnose_kickers(players):
    print("\n🔎 DIAGNOSING KICKER VARIATIONS...")
    print("--------------------------------------------------")

    # We will group players by the EXACT raw string of their position
    variations = {}

    for p in players:
        raw_pos = p.get("position")

        # Check if it looks like a kicker
        if raw_pos and (
            "KICKER" in raw_pos.upper()
            or "PK" == raw_pos.upper()
            or "K" == raw_pos.upper()
        ):

            # Use repr() to reveal hidden characters like '\n' or ' '
            key = repr(raw_pos)

            if key not in variations:
                variations[key] = {"count": 0, "example_player": p.get("name")}
            variations[key]["count"] += 1

    # Print Report
    if not variations:
        print("No kickers found.")
    else:
        for raw_string, data in variations.items():
            print(f"VARIATION: {raw_string}")
            print(f"   Count: {data['count']}")
            print(f"   Example: {data['example_player']}")
            print("--------------------------------------------------")


if __name__ == "__main__":
    players = fetch_all_players()
    if players:
        diagnose_kickers(players)
