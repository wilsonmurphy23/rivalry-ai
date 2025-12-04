import json
import urllib.request
import os
import ssl

# ==============================================================================
# CONFIGURATION
# Matches the credentials from your players.js file
# ==============================================================================
SUPABASE_URL = "https://qnplrybkdcwngzofufcw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYyODQxNywiZXhwIjoyMDgwMjA0NDE3fQ.sp5Xm041KqsC8CoakKVYSpR2kO8rl5EAfpKliKYnswg"


def fetch_all_players():
    """Fetches all players from Supabase using pagination."""
    all_players = []
    offset = 0
    limit = 1000  # Supabase default limit is 1000 rows per request
    more_data = True

    print(f"🔄 Connecting to Supabase at {SUPABASE_URL}...")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    # Create SSL context to avoid certificate errors on some local machines
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    while more_data:
        # Supabase REST API URL pattern
        url = f"{SUPABASE_URL}/rest/v1/players?select=position,stats,sport&offset={offset}&limit={limit}"

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx) as response:
                if response.getcode() == 200:
                    data = json.loads(response.read().decode())
                    if len(data) > 0:
                        all_players.extend(data)
                        print(f"   ...fetched rows {offset} to {offset + len(data)}")
                        offset += limit

                        # Stop if we fetched fewer rows than the limit (end of data)
                        if len(data) < limit:
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


def analyze_positions(players):
    """Aggregates stats keys by position."""
    analysis = {}

    print(f"\n📊 Analyzing {len(players)} player records...")

    for p in players:
        # Get Position (Normalize to Uppercase)
        raw_pos = p.get("position")
        if not raw_pos:
            raw_pos = "UNKNOWN"
        pos = raw_pos.upper().strip()

        # Get Stats Keys
        stats = p.get("stats") or {}
        # Filter out stats that are 0 or '0' or empty to see only RELEVANT stats
        active_stat_keys = [
            k for k, v in stats.items() if v and str(v) != "0" and str(v) != "0.0"
        ]

        if pos not in analysis:
            analysis[pos] = {"count": 0, "sports": set(), "stat_keys": set()}

        analysis[pos]["count"] += 1
        analysis[pos]["sports"].add(p.get("sport", "Unknown"))
        analysis[pos]["stat_keys"].update(active_stat_keys)

    return analysis


def print_report(analysis):
    print("\n" + "=" * 60)
    print(" 🏈🏀 RIVALRY AI - DATABASE POSITION REPORT")
    print("=" * 60)

    # Sort by number of players in that position
    sorted_positions = sorted(
        analysis.items(), key=lambda x: x[1]["count"], reverse=True
    )

    for pos, data in sorted_positions:
        print(f"\n🔹 POSITION: {pos} ({data['count']} players)")
        print(f"   Sports: {', '.join(data['sports'])}")

        # Sort stats alphabetically
        sorted_stats = sorted(list(data["stat_keys"]))

        # Group stats for readability
        print("   Key Stats Found:")
        if not sorted_stats:
            print("      (No active stats found)")
        else:
            # Print in chunks of 4 for readability
            for i in range(0, len(sorted_stats), 4):
                chunk = sorted_stats[i : i + 4]
                print("      " + ", ".join(chunk))


if __name__ == "__main__":
    players = fetch_all_players()
    if players:
        data = analyze_positions(players)
        print_report(data)
    else:
        print("No players found. Check your database connection.")
