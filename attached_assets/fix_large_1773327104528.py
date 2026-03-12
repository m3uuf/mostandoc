#!/usr/bin/env python3
"""Re-fetch large data types with proper pagination"""
import json
import urllib.request
import urllib.parse
import os

API_KEY = "8d8886f835f1bc19dee8468bb529db68"
BASE_URL = "https://app.mostandoc.com/api/1.1/obj"
OUTPUT_DIR = "/Users/m3uuf/Desktop/mostandoc_data"

LARGE_TYPES = ["client", "client_docs", "user", "user_docs", "page"]

def fetch_all(data_type):
    safe_name = data_type.replace("✅", "").replace(" ", "_")
    if not safe_name.replace("_","").isalnum():
        safe_name = "".join(c if c.isalnum() or c == "_" else "_" for c in safe_name)

    all_records = []
    cursor = 0
    limit = 100

    print(f"📥 Fetching: {data_type}")

    while True:
        encoded = urllib.parse.quote(data_type)
        url = f"{BASE_URL}/{encoded}?limit={limit}&cursor={cursor}"

        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {API_KEY}")

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            print(f"   ❌ Error: {e}")
            break

        results = data.get("response", {}).get("results", [])
        remaining = data.get("response", {}).get("remaining", 0)
        count = data.get("response", {}).get("count", 0)

        all_records.extend(results)
        print(f"   ... got {len(results)} records (remaining: {remaining})")

        if remaining == 0 or len(results) == 0:
            break

        cursor += limit

    output_file = os.path.join(OUTPUT_DIR, f"{safe_name}.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)

    print(f"   ✅ {data_type}: {len(all_records)} records saved to {safe_name}.json")
    return len(all_records)

print("🔧 Re-fetching large data types with proper pagination...\n")

total_all = 0
for dt in LARGE_TYPES:
    count = fetch_all(dt)
    total_all += count
    print()

print(f"🎯 Total re-fetched: {total_all} records")
