#!/bin/bash
curl -X DELETE \
     -H "Content-Type: application/json" \
     -H "X-Aggregor-Token: $1" \
     -d "{\"username\": \"$2\", \"password\": \"$3\"}" \
     localhost:3000/user
