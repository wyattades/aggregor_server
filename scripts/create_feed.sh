#!/bin/bash
curl -X POST \
     -H 'Content-Type: application/json' \
     -H "X-Aggregor-Token: $1" \
     -d '{"name": "$2"}' \
     localhost:3000/user/$3/feed
