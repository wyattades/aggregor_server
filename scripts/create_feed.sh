#!/bin/bash
curl -X POST \
     -H 'Content-Type: application/json' \
     -H "X-Aggregor-Token: $1" \
     -d '{"name": "news"}' \
     localhost:3000/user/spenserw/feed
