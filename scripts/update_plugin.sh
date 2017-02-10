#!/bin/bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-Aggregor-Token: $1" \
     -d "{\"type\": \"raw\", \"data\": {\"url\": \"$4\"}}" \
     localhost:3000/user/$2/feed/$3/$4
