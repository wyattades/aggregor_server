#!/bin/bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-Aggregor-Token: $1" \
     -d '{"type": "raw", "data": {"url": "www.reddit.com/r/Overwatch/"}}' \
     localhost:3000/user/spenserw/feed/news
