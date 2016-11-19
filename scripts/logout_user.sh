#!/bin/bash
curl -X POST \
     -H 'Content-Type: application/json' \
     -H "X-Aggregor-Token: $1" \
     localhost:3000/user/logout
