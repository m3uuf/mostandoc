#!/bin/bash
# Bubble.io Data Export Script for app.mostandoc.com
# Exports all data types to JSON files

API_KEY="8d8886f835f1bc19dee8468bb529db68"
BASE_URL="https://app.mostandoc.com/api/1.1/obj"
OUTPUT_DIR="/Users/m3uuf/Desktop/mostandoc_data"

DATA_TYPES=(
    "page"
    "✅block"
    "activityevents"
    "allusersubscription"
    "client"
    "company_profile"
    "custom_docs"
    "doc_analytics"
    "dumy"
    "expense"
    "revenew"
    "feedback"
    "ai_massege"
    "mytable"
    "notification"
    "releas_note"
    "subscription"
    "templates"
    "user_docs"
    "testdoc"
    "tools"
    "client_docs"
    "limitation"
    "user"
)

fetch_all_records() {
    local data_type="$1"
    local safe_name=$(echo "$data_type" | sed 's/[^a-zA-Z0-9_]/_/g')
    local output_file="$OUTPUT_DIR/${safe_name}.json"
    local cursor=0
    local limit=100
    local all_records="[]"
    local total=0

    echo "📥 Fetching: $data_type"

    while true; do
        local encoded_type=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$data_type'))")
        local response=$(curl -s -H "Authorization: Bearer $API_KEY" \
            "$BASE_URL/$encoded_type?limit=$limit&cursor=$cursor")

        local remaining=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response',{}).get('remaining',0))" 2>/dev/null)
        local count=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('response',{}).get('results',[])))" 2>/dev/null)

        if [ -z "$count" ] || [ "$count" = "0" ] && [ "$cursor" = "0" ]; then
            echo "   ⚠️  No data or error for $data_type"
            echo "[]" > "$output_file"
            return
        fi

        # Merge results
        if [ "$cursor" = "0" ]; then
            all_records=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('response',{}).get('results',[])))" 2>/dev/null)
        else
            all_records=$(python3 -c "
import json,sys
existing = json.loads('''$all_records''') if '''$all_records''' != '[]' else []
response = json.loads(sys.stdin.read())
new = response.get('response',{}).get('results',[])
existing.extend(new)
print(json.dumps(existing))
" <<< "$response" 2>/dev/null)
        fi

        total=$((total + count))

        if [ -z "$remaining" ] || [ "$remaining" = "0" ]; then
            break
        fi

        cursor=$((cursor + limit))
    done

    echo "$all_records" | python3 -m json.tool > "$output_file" 2>/dev/null || echo "$all_records" > "$output_file"
    echo "   ✅ $data_type: $total records saved"
}

echo "🚀 Starting Bubble.io data export..."
echo "=================================="

for dt in "${DATA_TYPES[@]}"; do
    fetch_all_records "$dt"
done

echo ""
echo "=================================="
echo "✅ Export complete! Files saved to: $OUTPUT_DIR"
echo ""
echo "📊 Summary:"
for f in "$OUTPUT_DIR"/*.json; do
    if [ -f "$f" ]; then
        count=$(python3 -c "import json; print(len(json.load(open('$f'))))" 2>/dev/null || echo "?")
        echo "   $(basename $f): $count records"
    fi
done
