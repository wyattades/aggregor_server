#!/bin/bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-Aggregor-Token: $1" \
     -d "{\"type\": \"$4\", \"priority\": $5, \"data\": {\"subreddit\": \"$6\"}}" \
     localhost:3000/user/$2/feed/$3 
