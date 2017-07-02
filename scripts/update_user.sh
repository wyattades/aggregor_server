#!/bin/bash
curl -X PUT \
     -H "X-Aggregor-Token: $1" \
     -H "Content-Type: application/json" \
     -d "{\"username\": \"$3\", \"password\": \"$4\", \"email\": \"$5\"}" \
     localhost:3000/user/$2
