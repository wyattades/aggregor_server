#!/bin/bash
curl -X PUT \
     -H "Content-Type: application/json" \
     -H "X-Aggregor-Token: $1" \
     -d "{\"type\": \"$5\", \"priority\": $6, \"data\": {\"subreddit\": \"$7\"}}" \
     localhost:3000/user/$2/feed/$3/plugin/$4
