#!/bin/bash
curl -X PUT \
     -H "Content-Type: application/json" \
     -H "X-Aggregor-Token: $1" \
     -d "{\"name\": \"$4\"}" \
     localhost:3000/user/$2/feed/$3
